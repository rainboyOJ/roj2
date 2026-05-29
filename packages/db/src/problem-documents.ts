import { ObjectId } from 'mongodb';
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
