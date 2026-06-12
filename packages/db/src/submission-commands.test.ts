import { describe, expect, it } from 'vitest';
import type {
  CounterDocument,
  ProblemDocument,
  SiteSettingsDocument,
  SubmissionDocument,
  UserDocument,
  UserProblemProgressDocument,
} from '@roj/shared';

import {
  SUBMISSION_RATE_LIMIT_MESSAGE,
  createSubmission,
  isSubmissionRateLimitError,
  type SubmissionCommandCollections,
} from './submission-commands.ts';

type MemoryCollection<T extends { _id: string }> = {
  docs: T[];
  findOne: (filter: Record<string, unknown>, options?: {
    projection?: Record<string, number>;
    sort?: Record<string, 1 | -1>;
  }) => Promise<T | null>;
  insertOne: (document: T) => Promise<{ insertedId: string }>;
  updateOne: (filter: Record<string, unknown>, update: {
    $set?: Partial<T>;
    $setOnInsert?: Partial<T>;
    $inc?: Partial<Record<keyof T, number>>;
  }, options?: { upsert?: boolean }) => Promise<void>;
};

function matches<T extends { _id: string }>(document: T, filter: Record<string, unknown>) {
  return Object.entries(filter).every(([key, value]) => document[key as keyof T] === value);
}

function memoryCollection<T extends { _id: string }>(docs: T[] = []): MemoryCollection<T> {
  return {
    docs,
    async findOne(filter, options) {
      const matched = this.docs.filter((document) => matches(document, filter));
      if (options?.sort) {
        const [key, direction] = Object.entries(options.sort)[0] || [];
        matched.sort((a, b) => {
          const left = a[key as keyof T];
          const right = b[key as keyof T];
          if (left instanceof Date && right instanceof Date) {
            return direction === -1
              ? right.getTime() - left.getTime()
              : left.getTime() - right.getTime();
          }
          return 0;
        });
      }
      return matched[0] || null;
    },
    async insertOne(document) {
      this.docs.push(document);
      return { insertedId: document._id };
    },
    async updateOne(filter, update, options) {
      let document = this.docs.find((item) => matches(item, filter));
      if (!document && options?.upsert) {
        document = {
          _id: String(filter._id),
          ...update.$setOnInsert,
        } as T;
        this.docs.push(document);
      }
      if (!document) {
        return;
      }
      Object.assign(document, update.$set);
      if (update.$inc) {
        for (const [key, value] of Object.entries(update.$inc)) {
          const field = key as keyof T;
          document[field] = (Number(document[field]) + Number(value)) as T[keyof T];
        }
      }
    },
  };
}

function userDocument(overrides: Partial<UserDocument> = {}): UserDocument {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    _id: 'user-1',
    username: 'alice',
    name: 'Alice',
    gender: 'female',
    className: '1 班',
    grade: '2025',
    passwordHash: 'hash',
    role: 'student',
    approvalStatus: 'approved',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function problemDocument(): ProblemDocument {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    _id: 'problem-1',
    pid: '1000',
    title: 'A + B Problem',
    statementMarkdown: 'content',
    statementHtml: '<p>content</p>',
    allowLanguages: ['cpp', 'python'],
    isVisible: true,
    createdAt: now,
    updatedAt: now,
  };
}

function submissionDocument(overrides: Partial<SubmissionDocument> = {}): SubmissionDocument {
  const now = new Date();
  return {
    _id: 'submission-old',
    submissionNo: 1,
    userId: 'user-1',
    problemId: 'problem-1',
    pid: '1000',
    username: 'alice',
    displayName: 'Alice',
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
    ...overrides,
  };
}

function collections(input: {
  user?: UserDocument;
  submissionIntervalSeconds?: number;
  submissions?: SubmissionDocument[];
} = {}): SubmissionCommandCollections {
  return {
    users: memoryCollection<UserDocument>([input.user || userDocument()]),
    problems: memoryCollection<ProblemDocument>([problemDocument()]),
    counters: memoryCollection<CounterDocument>([
      { _id: 'submissionNo', value: 1, updatedAt: new Date() },
    ]),
    settings: memoryCollection<SiteSettingsDocument>([
      {
        _id: 'site_settings',
        enabledLanguages: ['cpp', 'python'],
        listPageSize: 20,
        submissionIntervalSeconds: input.submissionIntervalSeconds ?? 30,
        updatedAt: new Date(),
      },
    ]),
    submissions: memoryCollection<SubmissionDocument>(input.submissions || []),
    userProblemProgress: memoryCollection<UserProblemProgressDocument>([]),
  } as unknown as SubmissionCommandCollections;
}

describe('createSubmission rate limit', () => {
  it('rejects frequent submissions from a normal user', async () => {
    const store = collections({
      submissions: [
        submissionDocument({ createdAt: new Date(Date.now() - 1000) }),
      ],
    });

    await expect(createSubmission(
      store,
      {
        userId: 'user-1',
        pid: '1000',
        language: 'cpp',
        sourceCode: 'int main(){}',
      },
      () => undefined,
    )).rejects.toMatchObject({
      message: SUBMISSION_RATE_LIMIT_MESSAGE,
    });

    try {
      await createSubmission(
        store,
        {
          userId: 'user-1',
          pid: '1000',
          language: 'cpp',
          sourceCode: 'int main(){}',
        },
        () => undefined,
      );
    } catch (error) {
      expect(isSubmissionRateLimitError(error)).toBe(true);
    }
  });

  it('allows admin submissions during the interval', async () => {
    const store = collections({
      user: userDocument({ role: 'admin' }),
      submissions: [
        submissionDocument({ createdAt: new Date(Date.now() - 1000) }),
      ],
    });

    const submission = await createSubmission(
      store,
      {
        userId: 'user-1',
        pid: '1000',
        language: 'cpp',
        sourceCode: 'int main(){}',
      },
      () => undefined,
    );

    expect(submission.pid).toBe('1000');
  });

  it('allows normal users when the interval is disabled', async () => {
    const store = collections({
      submissionIntervalSeconds: 0,
      submissions: [
        submissionDocument({ createdAt: new Date(Date.now() - 1000) }),
      ],
    });

    const submission = await createSubmission(
      store,
      {
        userId: 'user-1',
        pid: '1000',
        language: 'cpp',
        sourceCode: 'int main(){}',
      },
      () => undefined,
    );

    expect(submission.pid).toBe('1000');
  });
});
