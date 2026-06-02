import { ObjectId } from 'mongodb';
import type { Collection } from 'mongodb';
import type { Filter } from 'mongodb';
import type { AppLanguage, ProblemDocument } from '@roj/shared';
import { renderMarkdown } from '@roj/markdown-renderer';

export interface ProblemInput {
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: AppLanguage[];
  isVisible: boolean;
}

export interface AdminProblemListFilters {
  q?: string;
  visibility?: 'visible' | 'hidden';
}

export interface VisibleProblemListFilters {
  q?: string;
  pidIn?: string[];
  pidNin?: string[];
}

function escapeRegexText(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyProblemSearchFilter(query: Filter<ProblemDocument>, q?: string) {
  const text = q?.trim();

  if (text) {
    const searchPattern = new RegExp(escapeRegexText(text), 'i');
    query.$or = [
      { pid: searchPattern },
      { title: searchPattern },
    ];
  }
}

export function buildAdminProblemListFilter(
  filters: AdminProblemListFilters = {},
): Filter<ProblemDocument> {
  const query: Filter<ProblemDocument> = {};

  applyProblemSearchFilter(query, filters.q);

  if (filters.visibility === 'visible') {
    query.isVisible = true;
  } else if (filters.visibility === 'hidden') {
    query.isVisible = false;
  }

  return query;
}

export function buildVisibleProblemListFilter(
  filters: VisibleProblemListFilters = {},
): Filter<ProblemDocument> {
  const query: Filter<ProblemDocument> = { isVisible: true };
  const pidFilter: { $in?: string[]; $nin?: string[] } = {};

  applyProblemSearchFilter(query, filters.q);

  if (filters.pidIn) {
    pidFilter.$in = filters.pidIn;
  }
  if (filters.pidNin && filters.pidNin.length > 0) {
    pidFilter.$nin = filters.pidNin;
  }
  if (Object.keys(pidFilter).length > 0) {
    query.pid = pidFilter;
  }

  return query;
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
    filters?: VisibleProblemListFilters;
  },
) {
  const skip = (input.page - 1) * input.pageSize;
  const query = buildVisibleProblemListFilter(input.filters);
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

export async function listAdminProblems(
  problems: Collection<ProblemDocument>,
  filters: AdminProblemListFilters = {},
) {
  return problems.find(buildAdminProblemListFilter(filters)).sort({ pid: 1 }).toArray();
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
