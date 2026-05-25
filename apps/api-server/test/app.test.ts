// 这组测试主要覆盖“最小 JSON API 行为”。
import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { buildProductionServices } from '../src/index.ts';

function createServices(overrides: Record<string, unknown> = {}) {
  // 统一构造假的 service，避免测试直接依赖数据库或外部 judge。
  return {
    createSubmission: async () => ({
      id: 'sub-1',
      publicId: '42',
      submissionNo: 42,
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
    }),
    listProblems: async () => [],
    getProblemByPid: async () => null,
    getSubmissionById: async () => null,
    listSubmissions: async () => [],
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
    listAdminSubmissions: async () => [],
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
      }),
      getSubmissionWithProblemById: async () => null,
      listAllSubmissionsWithProblems: async () => [],
      listSubmissionsWithProblemsByUser: async () => [
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
          judge: {
            lastStatus: 'FINISHED',
          },
          result: {
            message: 'ok',
            caseResults: [],
          },
        },
      ],
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

    await expect(services.listSubmissions({
      id: 'user-1',
      username: 'alice',
      role: 'student',
      approvalStatus: 'approved',
    })).resolves.toMatchObject([
      {
        id: 'sub-1',
        publicId: '42',
        submissionNo: 42,
        pid: '1000',
        problemTitle: 'A + B Problem',
        problemLabel: '1000 A + B Problem',
      },
    ]);
  });
});
