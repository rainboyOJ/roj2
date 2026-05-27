// 这组测试主要覆盖“最小 JSON API 行为”。
import { describe, expect, it } from 'vitest';

import { buildApp, type SessionUser, type SubmissionViewModel } from '../src/app.ts';
import { buildProductionServices } from '../src/index.ts';

function paginated(submissions: SubmissionViewModel[] = [], total = submissions.length) {
  return {
    submissions,
    pagination: {
      page: 1,
      pageSize: 20,
      total,
      totalPages: Math.max(1, Math.ceil(total / 20)),
      previousPage: null,
      nextPage: total > 20 ? 2 : null,
    },
  };
}

function createServices(overrides: Record<string, unknown> = {}) {
  // 统一构造假的 service，避免测试直接依赖数据库或外部 judge。
  return {
    createSubmission: async () => ({
      id: 'sub-1',
      publicId: '42',
      submissionNo: 42,
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
      score: 0,
    }),
    listProblems: async () => [],
    listProblemProgressByUser: async () => new Map<string, 'accepted' | 'attempted'>(),
    getProblemByPid: async () => null,
    getSubmissionById: async () => null,
    listSubmissions: async () => paginated(),
    registerUser: async () => ({
      id: 'user-1',
      username: 'alice',
      approvalStatus: 'pending' as const,
    }),
    loginUser: async () => ({
      token: 'token-1',
      user: {
        id: 'user-1',
        username: 'alice',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      },
    }),
    logoutUser: async () => undefined,
    getCurrentUser: async () => ({
      id: 'user-1',
      username: 'alice',
      role: 'admin' as const,
      approvalStatus: 'approved' as const,
    }),
    listAdminUsers: async () => [],
    approveUser: async () => undefined,
    rejectUser: async () => undefined,
    listAdminSubmissions: async () => paginated(),
    listRanklist: async () => [],
    listContests: async () => [],
    getContestById: async () => null,
    listGrades: async () => [],
    createGrade: async () => ({
      id: 'grade-1',
      name: '2027',
      isActive: true,
      order: 4,
    }),
    updateGrade: async () => undefined,
    listAdminProblems: async () => [],
    getAdminProblemById: async () => null,
    createProblem: async () => ({
      id: 'problem-1',
      pid: '1001',
    }),
    updateProblem: async () => undefined,
    publishProblem: async () => undefined,
    getEnabledLanguages: async () => ['cpp', 'python'] as const,
    updateEnabledLanguages: async () => undefined,
    updateProfileClassName: async () => undefined,
    resetUserPassword: async () => undefined,
    deleteUser: async () => undefined,
    updateMyPassword: async () => undefined,
    ...overrides,
  };
}

describe('POST /api/submissions', () => {
  it('creates a pending submission', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'POST',
      url: '/api/submissions',
      payload: {
        pid: '1000',
        language: 'python',
        sourceCode: 'print(1)',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      submissionId: '42',
      submissionNo: 42,
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
    });
  });

  it('rejects an unsupported language', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'POST',
      url: '/api/submissions',
      payload: {
        pid: '1000',
        language: 'java',
        sourceCode: 'class Main {}',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('rejects a language disabled by admin settings', async () => {
    const app = buildApp(createServices({
      getEnabledLanguages: async () => ['python'] as const,
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/submissions',
      payload: {
        pid: '1000',
        language: 'cpp',
        sourceCode: 'int main() { return 0; }',
      },
    });

    expect(response.statusCode).toBe(400);
  });
});

describe('GET /api/problems', () => {
  it('filters problem languages by admin enabled settings', async () => {
    const app = buildApp(createServices({
      listProblems: async () => [
        {
          pid: '1000',
          title: 'A + B Problem',
          statementMarkdown: 'Input two integers and print their sum.',
          statementHtml: '<p>Input two integers and print their sum.</p>',
          allowLanguages: ['cpp', 'python'],
        },
      ],
      getEnabledLanguages: async () => ['python'] as const,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/problems',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      expect.objectContaining({
        pid: '1000',
        allowLanguages: ['python'],
      }),
    ]);
  });
});

describe('GET /api/submissions', () => {
  it('passes the requested page to services and returns pagination metadata', async () => {
    let receivedPagination: { page: number; pageSize: number } | null = null;
    const app = buildApp(createServices({
      listSubmissions: async (_user: SessionUser, pagination: { page: number; pageSize: number }) => {
        receivedPagination = pagination;
        return {
          submissions: [
            {
              id: 'sub-1',
              publicId: '42',
              submissionNo: 42,
              userId: 'user-1',
              pid: '1000',
              problemTitle: 'A + B Problem',
              problemLabel: '1000 A + B Problem',
              username: 'alice',
              displayName: 'Alice',
              language: 'python',
              sourceCode: 'print(1)',
              status: 'FINISHED',
              verdict: 'AC',
              score: 100,
              judgeStatus: 'FINISHED',
              message: 'ok',
              caseResults: [],
            },
          ],
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: 41,
            totalPages: 3,
            previousPage: 1,
            nextPage: 3,
          },
        };
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/submissions?page=2',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPagination).toEqual({
      page: 2,
      pageSize: 20,
    });
    expect(response.json()).toMatchObject({
      submissions: [
        {
          publicId: '42',
          pid: '1000',
          verdict: 'AC',
        },
      ],
      pagination: {
        page: 2,
        pageSize: 20,
        total: 41,
        totalPages: 3,
      },
    });
  });
});

describe('production services', () => {
  it('populates problem titles for submission lists without reading denormalized titles', async () => {
    const services = await buildProductionServices({
      listVisibleProblems: async () => [],
      getProblemByPid: async () => null,
      createSubmission: async () => ({
        _id: 'sub-1',
        submissionNo: 42,
        status: 'PENDING_DISPATCH',
        verdict: 'PENDING',
        score: 0,
      }),
      getSubmissionWithProblemByPublicId: async () => null,
      listAllSubmissionsWithProblemsPaginated: async () => ({
        items: [],
        total: 0,
      }),
      listSubmissionsByUserPaginated: async () => ({
        items: [
          {
            _id: 'sub-1',
            submissionNo: 42,
            userId: 'user-1',
            problemId: 'problem-1',
            pid: '1000',
            problem: {
              title: 'A + B Problem',
            },
            username: 'alice',
            displayName: 'Alice',
            language: 'python',
            sourceCode: 'print(1)',
            status: 'FINISHED',
            verdict: 'AC',
            score: 50,
            judge: {
              lastStatus: 'FINISHED',
            },
            result: {
              message: 'ok',
              caseResults: [],
            },
          },
        ],
        total: 1,
      }),
      registerUser: async () => ({
        _id: 'user-1',
        username: 'alice',
        approvalStatus: 'pending',
      }),
      loginUser: async () => null,
      createSession: async () => ({ token: 'token-1' }),
      destroySession: async () => undefined,
      getUserBySessionToken: async () => null,
      listUsersForAdmin: async () => [],
      approveUser: async () => undefined,
      rejectUser: async () => undefined,
      buildSimpleRanklist: async () => [],
      listGrades: async () => [],
      createGrade: async () => ({ _id: 'grade-1', name: '2027', isActive: true, order: 4 }),
      updateGrade: async () => undefined,
      listAdminProblems: async () => [],
      getAdminProblemById: async () => null,
      createProblem: async () => ({ _id: 'problem-1', pid: '1001' }),
      updateProblem: async () => undefined,
      publishProblem: async () => undefined,
      getEnabledLanguages: async () => ['cpp', 'python'],
      updateEnabledLanguages: async () => undefined,
      updateProfileClassName: async () => undefined,
      resetUserPassword: async () => undefined,
    } as never);

    await expect(services.listSubmissions(
      {
        id: 'user-1',
        username: 'alice',
        role: 'student',
        approvalStatus: 'approved',
      },
      {
        page: 1,
        pageSize: 20,
      },
    )).resolves.toMatchObject({
      submissions: [
        {
          id: 'sub-1',
          publicId: '42',
          submissionNo: 42,
          pid: '1000',
          problemTitle: 'A + B Problem',
          problemLabel: '1000 A + B Problem',
          score: 50,
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
      },
    });
  });
});
