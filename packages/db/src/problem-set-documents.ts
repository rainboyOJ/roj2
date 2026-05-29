import { ObjectId } from 'mongodb';
import type { Collection } from 'mongodb';
import type { ProblemSetDocument } from '@roj/shared';
import { extractProblemRefs, renderProblemSetMarkdown } from '@roj/markdown-renderer';

export interface ProblemSetInput {
  title: string;
  contentMarkdown: string;
}

export function buildProblemSetDocument(input: ProblemSetInput, now: Date): ProblemSetDocument {
  return {
    _id: new ObjectId().toHexString(),
    ...buildProblemSetUpdateFields(input, now),
    isPublished: false,
    publishedAt: null,
    createdAt: now,
  };
}

export function buildProblemSetUpdateFields(input: ProblemSetInput, now: Date) {
  return {
    title: input.title,
    contentMarkdown: input.contentMarkdown,
    contentHtml: renderProblemSetMarkdown(input.contentMarkdown),
    problemRefs: extractProblemRefs(input.contentMarkdown),
    updatedAt: now,
  };
}

export function buildPublishProblemSetUpdate(now: Date) {
  return {
    isPublished: true,
    publishedAt: now,
    updatedAt: now,
  };
}

export async function listPublishedProblemSets(problemSets: Collection<ProblemSetDocument>) {
  return problemSets
    .find({ isPublished: true })
    .sort({ publishedAt: -1, createdAt: -1 })
    .toArray();
}

export async function getPublishedProblemSetById(
  problemSets: Collection<ProblemSetDocument>,
  id: string,
) {
  return problemSets.findOne({ _id: id, isPublished: true });
}

export async function listAdminProblemSets(problemSets: Collection<ProblemSetDocument>) {
  return problemSets.find({}).sort({ createdAt: -1 }).toArray();
}

export async function getAdminProblemSetById(
  problemSets: Collection<ProblemSetDocument>,
  id: string,
) {
  return problemSets.findOne({ _id: id });
}

export async function createProblemSet(
  problemSets: Collection<ProblemSetDocument>,
  input: ProblemSetInput,
) {
  const now = new Date();
  const problemSet = buildProblemSetDocument(input, now);
  await problemSets.insertOne(problemSet);
  return problemSet;
}

export async function updateProblemSet(
  problemSets: Collection<ProblemSetDocument>,
  id: string,
  input: ProblemSetInput,
) {
  await problemSets.updateOne(
    { _id: id },
    {
      $set: buildProblemSetUpdateFields(input, new Date()),
    },
  );
}

export async function publishProblemSet(problemSets: Collection<ProblemSetDocument>, id: string) {
  await problemSets.updateOne(
    { _id: id },
    {
      $set: buildPublishProblemSetUpdate(new Date()),
    },
  );
}
