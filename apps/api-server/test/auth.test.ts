// 这组测试覆盖认证、登录态和学生审核约束。
import { describe, expect, it } from 'vitest';

import { buildApp, type SubmissionViewModel } from '../src/app.ts';

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
  // 每个测试只改自己关心的 service，其余都走默认假实现。
  return {
    createSubmission: async () => ({
      id: 'sub-1',
      publicId: '42',
      submissionNo: 42,
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
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
        role: 'student' as const,
        approvalStatus: 'pending' as const,
      },
    }),
    logoutUser: async () => undefined,
    getCurrentUser: async () => null,
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

describe('auth routes', () => {
  it('logs in from the HTML form flow and redirects to the home page', async () => {
    const app = buildApp(createServices({
      loginUser: async () => ({
        token: 'token-1',
        user: {
          id: 'user-1',
          username: 'alice',
          role: 'student' as const,
          approvalStatus: 'approved' as const,
        },
      }),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/login',
      payload: {
        username: 'alice',
        password: 'secret123',
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(response.headers['set-cookie']).toContain('roj_session=');
  });

  it('registers from the HTML form flow and redirects to the login page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'alice',
        name: 'Alice',
        gender: 'female',
        className: 'Class 1',
        grade: '2025',
        password: 'secret123',
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

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

  it('returns a Chinese-friendly JSON error source when registration fails', async () => {
    const app = buildApp(createServices({
      registerUser: async () => {
        throw new Error('username already exists');
      },
    }));

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

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: 'username already exists',
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

  it('logs out from the HTML flow, clears the session cookie, and redirects home', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'POST',
      url: '/logout',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(response.headers['set-cookie']).toContain('roj_session=;');
    expect(response.headers['set-cookie']).toContain('Max-Age=0');
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
        judgeStatus: 'FINISHED',
        message: 'ok',
        caseResults: [],
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

  it('allows a logged-in user to update their own password', async () => {
    let receivedInput: { userId: string; currentPassword: string; newPassword: string } | null = null;
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'user-1',
        username: 'alice',
        role: 'student' as const,
        approvalStatus: 'approved' as const,
      }),
      updateMyPassword: async (userId: string, currentPassword: string, newPassword: string) => {
        receivedInput = { userId, currentPassword, newPassword };
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/me/password',
      headers: {
        cookie: 'roj_session=token-1',
      },
      payload: {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedInput).toEqual({
      userId: 'user-1',
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
    });
  });
});
