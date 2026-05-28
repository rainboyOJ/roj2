// 这组测试覆盖认证、登录态和学生审核约束。
import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { adminSessionCookie, adminUser, createTestServices, sessionCookie, studentUser } from './helpers.ts';

function createAnonymousServices(overrides = {}) {
  return createTestServices({
    getCurrentUser: async () => null,
    ...overrides,
  });
}

describe('auth routes', () => {
  it('logs in from the HTML form flow and redirects to the home page', async () => {
    const app = buildApp(createAnonymousServices({
      loginUser: async () => ({
        token: 'token-1',
        user: studentUser(),
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
    const app = buildApp(createAnonymousServices());

    const response = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        username: 'alice',
        name: 'Alice',
        gender: 'female',
        className: '1 班',
        grade: '2025',
        password: 'secret123',
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  it('registers a student account', async () => {
    const app = buildApp(createAnonymousServices());

    const response = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: {
        username: 'alice',
        name: 'Alice',
        gender: 'female',
        className: '1 班',
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
    const app = buildApp(createAnonymousServices({
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
        className: '1 班',
        grade: '2025',
        password: 'secret123',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: 'username already exists',
    });
  });

  it('returns a JSON error when registration uses an unavailable class', async () => {
    const app = buildApp(createAnonymousServices({
      registerUser: async () => {
        throw new Error('class 99 班 is not available');
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/register',
      payload: {
        username: 'alice',
        name: 'Alice',
        gender: 'female',
        className: '99 班',
        grade: '2025',
        password: 'secret123',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: 'class 99 班 is not available',
    });
  });

  it('logs in and sets a session cookie', async () => {
    const app = buildApp(createAnonymousServices());

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
    const app = buildApp(createAnonymousServices());

    const response = await app.inject({
      method: 'POST',
      url: '/logout',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(response.headers['set-cookie']).toContain('roj_session=;');
    expect(response.headers['set-cookie']).toContain('Max-Age=0');
  });

  it('returns 401 for invalid login credentials', async () => {
    const app = buildApp(createAnonymousServices({
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

  it('renders profile password errors on the profile page for HTML flow', async () => {
    const app = buildApp(createAnonymousServices({
      getCurrentUser: async () => studentUser(),
      updateMyPassword: async () => {
        throw new Error('invalid current password');
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/profile/password',
      headers: {
        cookie: sessionCookie(),
      },
      payload: {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('个人中心');
    expect(response.body).toContain('当前密码错误。');
    expect(response.body).not.toContain('oldpassword123');
    expect(response.body).not.toContain('newpassword123');
  });

  it('rejects submission creation for anonymous users', async () => {
    const app = buildApp(createAnonymousServices());

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
    const app = buildApp(createAnonymousServices({
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
    const app = buildApp(createAnonymousServices({
      getCurrentUser: async () => studentUser({ approvalStatus: 'pending' }),
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
    const app = buildApp(createAnonymousServices({
      getCurrentUser: async () => studentUser(),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-2/approve',
    });

    expect(response.statusCode).toBe(403);
  });

  it('allows admin users to reset a student password', async () => {
    const app = buildApp(createAnonymousServices({
      loginUser: async () => ({
        token: 'token-1',
        user: adminUser(),
      }),
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/user-2/reset-password',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        password: 'newpassword123',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('allows a logged-in user to update their own password', async () => {
    let receivedInput: { userId: string; currentPassword: string; newPassword: string } | null = null;
    const app = buildApp(createAnonymousServices({
      getCurrentUser: async () => studentUser(),
      updateMyPassword: async (userId: string, currentPassword: string, newPassword: string) => {
        receivedInput = { userId, currentPassword, newPassword };
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/me/password',
      headers: {
        cookie: sessionCookie(),
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
