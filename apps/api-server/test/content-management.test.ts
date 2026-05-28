// 这组测试偏后台管理和内容维护流程。
import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { adminSessionCookie, adminUser, createTestServices, paginated, sessionCookie } from './helpers.ts';

describe('content management routes', () => {
  it('approves selected users from the admin HTML page flow', async () => {
    const approved: Array<{ userId: string; adminUserId: string }> = [];
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      approveUser: async (userId: string, adminUserId: string) => {
        approved.push({ userId, adminUserId });
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/users/bulk-approve',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        userIds: ['user-2', 'user-3'],
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/users');
    expect(approved).toEqual([
      { userId: 'user-2', adminUserId: 'admin-1' },
      { userId: 'user-3', adminUserId: 'admin-1' },
    ]);
  });

  it('rejects selected users from the admin HTML page flow', async () => {
    const rejected: Array<{ userId: string; adminUserId: string }> = [];
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      rejectUser: async (userId: string, adminUserId: string) => {
        rejected.push({ userId, adminUserId });
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/users/bulk-reject',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        userIds: ['user-2', 'user-3'],
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/users');
    expect(rejected).toEqual([
      { userId: 'user-2', adminUserId: 'admin-1' },
      { userId: 'user-3', adminUserId: 'admin-1' },
    ]);
  });

  it('approves selected users through the admin API flow', async () => {
    const approved: Array<{ userId: string; adminUserId: string }> = [];
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      approveUser: async (userId: string, adminUserId: string) => {
        approved.push({ userId, adminUserId });
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/bulk-approve',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        userIds: ['user-2', 'user-3'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(approved).toEqual([
      { userId: 'user-2', adminUserId: 'admin-1' },
      { userId: 'user-3', adminUserId: 'admin-1' },
    ]);
  });

  it('rejects selected users through the admin API flow', async () => {
    const rejected: Array<{ userId: string; adminUserId: string }> = [];
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      rejectUser: async (userId: string, adminUserId: string) => {
        rejected.push({ userId, adminUserId });
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/bulk-reject',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        userIds: ['user-2', 'user-3'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(rejected).toEqual([
      { userId: 'user-2', adminUserId: 'admin-1' },
      { userId: 'user-3', adminUserId: 'admin-1' },
    ]);
  });

  it('rejects bulk user API actions without selected users', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/users/bulk-approve',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        userIds: [],
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'No users selected' });
  });

  it('returns a logged-in user submission list', async () => {
    const app = buildApp(createTestServices({
      listSubmissions: async () => paginated([
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
      ]),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/submissions',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      submissions: [
        {
          id: 'sub-1',
          publicId: '42',
          verdict: 'AC',
          pid: '1000',
          username: 'alice',
        },
      ],
    });
  });

  it('rejects admin submissions for non-admin users', async () => {
    const app = buildApp(createTestServices());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/submissions',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('creates a grade for admin users', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/grades',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        name: '2027',
        isActive: true,
        order: 4,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      gradeId: 'grade-1',
      name: '2027',
    });
  });

  it('creates a problem for admin users', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/problems',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        pid: '1001',
        title: 'New Problem',
        statementMarkdown: 'desc',
        allowLanguages: ['cpp', 'python'],
        isVisible: false,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      problemId: 'problem-1',
      pid: '1001',
    });
  });

  it('creates a problem set draft for admin users', async () => {
    let receivedPayload: { title: string; contentMarkdown: string } | null = null;
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      createProblemSet: async (input) => {
        receivedPayload = input;
        return { id: 'set-1' };
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/problem-sets',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        title: '第一周训练',
        contentMarkdown: '- [[pid:1000]]',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ problemSetId: 'set-1' });
    expect(receivedPayload).toEqual({
      title: '第一周训练',
      contentMarkdown: '- [[pid:1000]]',
    });
  });

  it('updates a class name for the current student', async () => {
    const app = buildApp(createTestServices());
    const response = await app.inject({
      method: 'POST',
      url: '/api/me/class-name',
      headers: {
        cookie: sessionCookie(),
      },
      payload: {
        className: 'Class 2',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('updates a grade for admin users', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/admin/grades/grade-1',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        name: '2027',
        isActive: false,
        order: 4,
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('publishes a problem for admin users', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/problems/problem-1/publish',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('publishes a problem set from the admin HTML page flow', async () => {
    let publishedId = '';
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      publishProblemSet: async (id: string) => {
        publishedId = id;
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/problem-sets/set-1/publish',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/problem-sets');
    expect(publishedId).toBe('set-1');
  });

  it('updates enabled languages for admin users', async () => {
    let receivedLanguages: string[] = [];
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      updateEnabledLanguages: async (languages: Array<'cpp' | 'python'>) => {
        receivedLanguages = languages;
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/settings/languages',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        enabledLanguages: ['python'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedLanguages).toEqual(['python']);
  });

  it('deletes a user for admin users', async () => {
    let deletedUserId = '';
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      deleteUser: async (userId: string) => {
        deletedUserId = userId;
      },
    }));

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/admin/users/user-2',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(deletedUserId).toBe('user-2');
  });

  it('updates grades from the admin HTML page flow', async () => {
    const updated: Array<{ id: string; name: string; isActive: boolean; order: number }> = [];
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      updateGrade: async (id: string, input: { name: string; isActive: boolean; order: number }) => {
        updated.push({ id, ...input });
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/grades/grade-1',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        name: '2025',
        isActive: 'true',
        order: '1',
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/grades');
    expect(updated).toEqual([
      {
        id: 'grade-1',
        name: '2025',
        isActive: true,
        order: 1,
      },
    ]);
  });

  it('renders grade form errors on the admin grade page', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      listGrades: async () => [
        { id: 'grade-1', name: '2025', isActive: true, order: 1 },
      ],
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/grades',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        name: '',
        isActive: 'true',
        order: '1',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('年级管理');
    expect(response.body).toContain('年级信息填写不正确。');
    expect(response.body).toContain('2025');
  });

  it('renders problem form errors on the admin problem page', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/problems',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {
        pid: '1001',
        title: 'New Problem',
        statementMarkdown: 'desc',
        isVisible: 'false',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('创建题目');
    expect(response.body).toContain('题目信息填写不正确');
    expect(response.body).toContain('value="1001"');
    expect(response.body).toContain('value="New Problem"');
  });

  it('renders language setting errors on the admin language page', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      getEnabledLanguages: async () => ['python'],
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/settings/languages',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('语言设置');
    expect(response.body).toContain('至少选择一种可用语言。');
  });

  it('renders user management errors when no user is selected for bulk approve', async () => {
    const app = buildApp(createTestServices({
      getCurrentUser: async () => adminUser(),
      listAdminUsers: async () => [
        {
          id: 'user-2',
          username: 'alice',
          role: 'student',
          approvalStatus: 'pending',
          name: 'Alice',
        },
      ],
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/users/bulk-approve',
      headers: {
        cookie: adminSessionCookie(),
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toContain('用户管理');
    expect(response.body).toContain('请先选择需要通过的用户。');
    expect(response.body).toContain('alice');
  });
});
