import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';

describe('POST /api/submissions', () => {
  it('creates a pending submission', async () => {
    const app = buildApp({
      createSubmission: async () => ({
        id: 'sub-1',
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
      listGrades: async () => [],
      createGrade: async () => ({
        id: 'grade-1',
        name: '2027',
        isActive: true,
        order: 4,
      }),
      updateGrade: async () => undefined,
      listAdminProblems: async () => [],
      createProblem: async () => ({
        id: 'problem-1',
        pid: '1001',
      }),
      updateProblem: async () => undefined,
      publishProblem: async () => undefined,
      updateProfileClassName: async () => undefined,
      resetUserPassword: async () => undefined,
    });

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
      submissionId: 'sub-1',
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
    });
  });

  it('rejects an unsupported language', async () => {
    const app = buildApp({
      createSubmission: async () => ({
        id: 'sub-1',
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
      listGrades: async () => [],
      createGrade: async () => ({
        id: 'grade-1',
        name: '2027',
        isActive: true,
        order: 4,
      }),
      updateGrade: async () => undefined,
      listAdminProblems: async () => [],
      createProblem: async () => ({
        id: 'problem-1',
        pid: '1001',
      }),
      updateProblem: async () => undefined,
      publishProblem: async () => undefined,
      updateProfileClassName: async () => undefined,
      resetUserPassword: async () => undefined,
    });

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
});
