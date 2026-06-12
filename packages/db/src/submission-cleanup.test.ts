import { describe, expect, it } from 'vitest';
import type {
  SubmissionDocument,
  UserDocument,
  UserProblemProgressDocument,
} from '@roj/shared';

import {
  cleanupDeletedUserSubmissions,
  cleanupSubmissionsByUser,
  countDeletedUserSubmissionCleanup,
  type DeletedUserSubmissionCleanupCollections,
} from './submission-cleanup.ts';

type MemoryCollection<T extends { _id: string; userId?: string }> = {
  docs: T[];
  distinct: (field: keyof T) => Promise<unknown[]>;
  find: () => { toArray: () => Promise<T[]> };
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
  deleteMany: (filter: Record<string, unknown>) => Promise<{ deletedCount: number }>;
};

function matchesUserFilter<T extends { userId?: string }>(
  document: T,
  filter: Record<string, unknown>,
) {
  const userIdFilter = filter.userId;
  if (
    typeof userIdFilter === 'object'
    && userIdFilter !== null
    && '$in' in userIdFilter
    && Array.isArray(userIdFilter.$in)
  ) {
    return userIdFilter.$in.includes(document.userId);
  }
  return document.userId === userIdFilter;
}

function memoryCollection<T extends { _id: string; userId?: string }>(docs: T[]): MemoryCollection<T> {
  return {
    docs,
    async distinct(field) {
      return [...new Set(this.docs.map((document) => document[field]))];
    },
    find() {
      return {
        toArray: async () => this.docs,
      };
    },
    async countDocuments(filter) {
      return this.docs.filter((document) => matchesUserFilter(document, filter)).length;
    },
    async deleteMany(filter) {
      const before = this.docs.length;
      this.docs = this.docs.filter((document) => !matchesUserFilter(document, filter));
      return { deletedCount: before - this.docs.length };
    },
  };
}

function user(id: string): UserDocument {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    _id: id,
    username: id,
    name: id,
    gender: 'female',
    className: '1 班',
    grade: '2025',
    passwordHash: 'hash',
    role: 'student',
    approvalStatus: 'approved',
    createdAt: now,
    updatedAt: now,
  };
}

function submission(id: string, userId: string): SubmissionDocument {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const document: SubmissionDocument = {
    _id: id,
    userId,
    problemId: 'problem-1',
    pid: '1000',
    username: userId,
    displayName: userId,
    language: 'cpp',
    sourceCode: 'int main(){}',
    status: 'FINISHED',
    verdict: 'AC',
    score: 100,
    judge: {
      submissionId: null,
      lastStatus: null,
      lastMessage: null,
      retryCount: 0,
      leaseOwner: null,
      leaseExpireAt: null,
      lastPolledAt: null,
      ackAt: null,
      finishedAt: null,
    },
    result: {
      caseResults: [],
      message: '',
      score: 100,
    },
    createdAt: now,
    updatedAt: now,
  };
  const submissionNo = Number(id.replace(/\D/g, ''));
  if (submissionNo) {
    document.submissionNo = submissionNo;
  }
  return document;
}

function progress(id: string, userId: string): UserProblemProgressDocument {
  return {
    _id: id,
    userId,
    pid: '1000',
    status: 'accepted',
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function collections(): DeletedUserSubmissionCleanupCollections {
  return {
    users: memoryCollection<UserDocument>([user('user-live')]),
    submissions: memoryCollection<SubmissionDocument>([
      submission('sub-live', 'user-live'),
      submission('sub-deleted-1', 'user-deleted'),
      submission('sub-deleted-2', 'user-deleted'),
    ]),
    userProblemProgress: memoryCollection<UserProblemProgressDocument>([
      progress('progress-live', 'user-live'),
      progress('progress-deleted', 'user-deleted'),
      progress('progress-only', 'user-progress-only'),
    ]),
  } as unknown as DeletedUserSubmissionCleanupCollections;
}

describe('deleted user submission cleanup', () => {
  it('counts submissions and progress rows whose users no longer exist', async () => {
    await expect(countDeletedUserSubmissionCleanup(collections())).resolves.toEqual({
      submissionCount: 2,
      progressCount: 2,
    });
  });

  it('deletes only orphan submissions and progress rows', async () => {
    const store = collections();

    await expect(cleanupDeletedUserSubmissions(store)).resolves.toEqual({
      submissionCount: 2,
      progressCount: 2,
    });

    expect(await countDeletedUserSubmissionCleanup(store)).toEqual({
      submissionCount: 0,
      progressCount: 0,
    });
  });

  it('deletes submissions and progress rows for one user', async () => {
    const store = collections();

    await expect(cleanupSubmissionsByUser(store, 'user-deleted')).resolves.toEqual({
      submissionCount: 2,
      progressCount: 1,
    });

    await expect(countDeletedUserSubmissionCleanup(store)).resolves.toEqual({
      submissionCount: 0,
      progressCount: 1,
    });
  });
});
