import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { sessionCookie } from './helpers.ts';
import { createViewTestServices as createServices } from './view-test-services.ts';

describe('auth and profile views', () => {
  it('renders registration page with local axios and inline Chinese validation hints', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => null,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/register',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('id="registerForm"');
    expect(response.body).toContain('id="registerAlert"');
    expect(response.body).toContain('required');
    expect(response.body).toContain('pattern="^[a-z0-9_]{3,24}$"');
    expect(response.body).toContain('minlength="3"');
    expect(response.body).toContain('maxlength="24"');
    expect(response.body).toContain('minlength="8"');
    expect(response.body).toContain('只能使用小写字母、数字、下划线，长度 3-24');
    expect(response.body).toContain('密码至少 8 个字符');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/register.js"');
    expect(response.body).not.toContain('https://cdn');
  });

  it('renders login form with Pico-style page content', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => null,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/login',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('账号登录');
    expect(response.body).toContain('用户名');
    expect(response.body).toContain('id="loginForm"');
    expect(response.body).toContain('id="loginAlert"');
    expect(response.body).toContain('required');
    expect(response.body).toContain('pattern="^[a-z0-9_]{3,24}$"');
    expect(response.body).toContain('autocomplete="current-password"');
    expect(response.body).toContain('只能使用小写字母、数字、下划线，长度 3-24');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/login.js"');
    expect(response.body).toContain('登录');
  });

  it('renders registration form with gender radios, grade select, and class select', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => null,
      listGrades: async () => [
        {
          id: 'grade-1',
          name: '2025',
          isActive: true,
          order: 1,
        },
        {
          id: 'grade-2',
          name: '2024',
          isActive: false,
          order: 2,
        },
      ],
      listActiveClasses: async () => [
        {
          id: 'class-1',
          name: '1 班',
          isActive: true,
          order: 1,
        },
      ],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/register',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('type="radio"');
    expect(response.body).toContain('value="male"');
    expect(response.body).toContain('value="female"');
    expect(response.body).toContain('男');
    expect(response.body).toContain('女');
    expect(response.body).toContain('<select id="grade" name="grade" required>');
    expect(response.body).toContain('value="2025"');
    expect(response.body).not.toContain('value="2024"');
    expect(response.body).toContain('<select id="className" name="className" required>');
    expect(response.body).toContain('value="1 班"');
    expect(response.body).not.toContain('input id="className" type="text"');
  });

  it('renders profile password and class change forms', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('action="/profile/password"');
    expect(response.body).toContain('id="profilePasswordAlert"');
    expect(response.body).toContain('id="profilePasswordForm"');
    expect(response.body).toContain('name="currentPassword"');
    expect(response.body).toContain('name="newPassword"');
    expect(response.body).toContain('required minlength="8"');
    expect(response.body).toContain('姓名');
    expect(response.body).toContain('Alice');
    expect(response.body).toContain('年级');
    expect(response.body).toContain('2025');
    expect(response.body).toContain('修改班级');
    expect(response.body).toContain('id="profileClassForm"');
    expect(response.body).toContain('id="profileClassName" name="className" required');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/profile-password.js"');
    expect(response.body).toContain('src="/assets/profile-class.js"');
  });

  it('renders public user profile for logged-in users', async () => {
    const app = buildApp(createServices({
      getPublicUserProfile: async (username: string) => ({
        user: {
          id: 'user-2',
          username,
          role: 'student',
          approvalStatus: 'approved',
          name: 'Bob',
          grade: '2025',
          className: '2 班',
        },
        acceptedProblems: [
          { pid: '1000', title: 'A + B Problem', label: '1000 A + B Problem' },
        ],
        attemptedProblems: [
          { pid: '1001', title: 'Sort', label: '1001 Sort' },
        ],
        acceptedCount: 1,
        attemptedCount: 2,
        acceptanceRateText: '50%',
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/users/bob',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('@bob 的个人资料与做题进度。');
    expect(response.body).toContain('通过题目');
    expect(response.body).toContain('尝试题目');
    expect(response.body).toContain('50%');
    expect(response.body).toContain('2 班');
    expect(response.body).toContain('href="/problem/1000"');
    expect(response.body).toContain('1000 A + B Problem');
    expect(response.body).toContain('href="/problem/1001"');
    expect(response.body).toContain('1001 Sort');
    expect(response.body).not.toContain('profilePasswordForm');
    expect(response.body).not.toContain('profileClassForm');
  });

  it('requires login before viewing public user profiles', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => null,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/users/bob',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/login');
  });

  it('returns 404 for missing public user profiles', async () => {
    const app = buildApp(createServices({
      getPublicUserProfile: async () => null,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/users/missing',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
