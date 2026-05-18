import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';

function createServices(overrides: Record<string, unknown> = {}) {
  return {
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
        role: 'student' as const,
        approvalStatus: 'pending' as const,
      },
    }),
    logoutUser: async () => undefined,
    getCurrentUser: async () => null,
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
    updateProfileClassName: async () => undefined,
    resetUserPassword: async () => undefined,
    ...overrides,
  };
}

describe('auth routes', () => {
  it('registers a student account', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: {
        username: 'alice',
        name: 'Alice',
        gender: 'female',
        className: 'Class 1',
        grade: '2025',
        password: 'secret123',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      userId: 'user-1',
      approvalStatus: 'pending',
    });
  });

  it('logs in and sets a session cookie', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: {
        username: 'alice',
        password: 'secret123',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['set-cookie']).toContain('roj_session=');
  });

  it('returns 401 for invalid login credentials', async () => {
    const app = buildApp(createServices({
      loginUser: async () => {
        throw new Error('invalid username or password');
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/login',
      payload: {
        username: 'alice',
        password: 'wrong',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects submission creation for anonymous users', async () => {
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

    expect(response.statusCode).toBe(401);
  });

  it('rejects submission detail for anonymous users', async () => {
    const app = buildApp(createServices({
      getSubmissionById: async () => ({
        id: 'sub-1',
        status: 'FINISHED',
        verdict: 'AC',
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/submissions/sub-1',
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects submission creation for pending students', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'user-1',
        username: 'alice',
        role: 'student' as const,
        approvalStatus: 'pending' as const,
      }),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/submissions',
      payload: {
        pid: '1000',
        language: 'python',
        sourceCode: 'print(1)',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('rejects admin approval for non-admin users', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'user-1',
        username: 'alice',
        role: 'student' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-2/approve',
    });

    expect(response.statusCode).toBe(403);
  });

  it('allows admin users to reset a student password', async () => {
    const app = buildApp(createServices({
      loginUser: async () => ({
        token: 'token-1',
        user: {
          id: 'admin-1',
          username: 'admin',
          role: 'admin' as const,
          approvalStatus: 'approved' as const,
        },
      }),
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-2/reset-password',
      headers: {
        cookie: 'roj_session=admin-token',
      },
      payload: {
        password: 'newpassword123',
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
