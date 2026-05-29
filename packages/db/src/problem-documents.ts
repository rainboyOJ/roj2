import { ObjectId } from 'mongodb';
import type { Collection } from 'mongodb';
import type { AppLanguage, ProblemDocument } from '@roj/shared';
import { renderMarkdown } from '@roj/markdown-renderer';

export interface ProblemInput {
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: AppLanguage[];
  isVisible: boolean;
}

export function buildProblemDocument(input: ProblemInput, now: Date): ProblemDocument {
  return {
    _id: new ObjectId().toHexString(),
    ...buildProblemUpdateFields(input, now),
    createdAt: now,
  };
}

export function buildProblemUpdateFields(input: ProblemInput, now: Date) {
  return {
    pid: input.pid,
    title: input.title,
    statementMarkdown: input.statementMarkdown,
    statementHtml: renderMarkdown(input.statementMarkdown),
    allowLanguages: input.allowLanguages,
    isVisible: input.isVisible,
    updatedAt: now,
  };
}

export function buildPublishProblemUpdate(now: Date) {
  return {
    isVisible: true,
    updatedAt: now,
  };
}

export async function listVisibleProblems(problems: Collection<ProblemDocument>) {
  return problems.find({ isVisible: true }).sort({ pid: 1 }).toArray();
}

export async function listVisibleProblemsPaginated(
  problems: Collection<ProblemDocument>,
  input: {
    page: number;
    pageSize: number;
  },
) {
  const skip = (input.page - 1) * input.pageSize;
  const query = { isVisible: true };
  const [items, total] = await Promise.all([
    problems
      .find(query)
      .sort({ pid: 1 })
      .skip(skip)
      .limit(input.pageSize)
      .toArray(),
    problems.countDocuments(query),
  ]);

  return { items, total };
}

export async function getProblemByPid(problems: Collection<ProblemDocument>, pid: string) {
  return problems.findOne({ pid, isVisible: true });
}

export async function listVisibleProblemsByPids(
  problems: Collection<ProblemDocument>,
  pids: string[],
) {
  if (pids.length === 0) {
    return [];
  }
  return problems
    .find({ pid: { $in: pids }, isVisible: true })
    .toArray();
}

export async function listAdminProblems(problems: Collection<ProblemDocument>) {
  return problems.find({}).sort({ pid: 1 }).toArray();
}

export async function getAdminProblemById(problems: Collection<ProblemDocument>, id: string) {
  return problems.findOne({ _id: id });
}

export async function createProblem(problems: Collection<ProblemDocument>, input: ProblemInput) {
  const now = new Date();
  const problem = buildProblemDocument(input, now);
  await problems.insertOne(problem);
  return problem;
}

export async function updateProblem(
  problems: Collection<ProblemDocument>,
  id: string,
  input: ProblemInput,
) {
  await problems.updateOne(
    { _id: id },
    {
      $set: buildProblemUpdateFields(input, new Date()),
    },
  );
}

export async function publishProblem(problems: Collection<ProblemDocument>, id: string) {
  await problems.updateOne(
    { _id: id },
    {
      $set: buildPublishProblemUpdate(new Date()),
    },
  );
}
