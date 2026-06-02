import type { Filter } from 'mongodb';
import type { SubmissionDocument } from '@roj/shared';

export interface SubmissionListFilters {
  pid?: string;
  user?: string;
  language?: string;
}

function escapeRegexText(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSubmissionListFilter(
  filters: SubmissionListFilters = {},
): Filter<SubmissionDocument> {
  const query: Filter<SubmissionDocument> = {};
  const pid = filters.pid?.trim();
  const user = filters.user?.trim();
  const language = filters.language?.trim();

  if (pid) {
    query.pid = pid;
  }

  if (language) {
    query.language = language as SubmissionDocument['language'];
  }

  if (user) {
    const userPattern = new RegExp(escapeRegexText(user), 'i');
    query.$or = [
      { username: userPattern },
      { displayName: userPattern },
    ];
  }

  return query;
}
