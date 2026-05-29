import { ObjectId } from 'mongodb';
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
