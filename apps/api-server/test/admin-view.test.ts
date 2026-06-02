import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { adminSessionCookie, adminUser } from './helpers.ts';
import { createViewTestServices as createServices } from './view-test-services.ts';

describe('admin views', () => {
  it('renders the admin problem creation page for admins', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/problems/new',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('创建题目');
    expect(response.body).toContain('题面');
    expect(response.body).toContain('id="adminProblemAlert"');
    expect(response.body).toContain('id="adminProblemForm"');
    expect(response.body).toContain('name="pid"');
    expect(response.body).toContain('name="statementMarkdown" required');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/notyf.min.js"');
    expect(response.body).toContain('src="/assets/notify.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/admin-problem-form.js"');
    expect(response.body).toContain('题目管理');
    expect(response.body).toContain('提交管理');
    expect(response.body).toContain('用户');
    expect(response.body).not.toContain('登录');
    expect(response.body).not.toContain('注册');
  });

  it('renders the admin dashboard for admins', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('管理后台');
    expect(response.body).toContain('打开题目管理');
    expect(response.body).toContain('打开用户管理');
    expect(response.body).toContain('打开提交管理');
  });

  it('renders the admin problem edit page for admins', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/problems/problem-1/edit',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('编辑题目');
    expect(response.body).toContain('A + B Problem');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/notyf.min.js"');
    expect(response.body).toContain('src="/assets/notify.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/admin-problem-form.js"');
  });

  it('renders approval actions on the admin users page', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
      listAdminUsersPaginated: async (pagination: { page: number; pageSize: number }) => ({
        users: [
          {
            id: 'user-2',
            username: 'alice',
            role: 'student' as const,
            approvalStatus: 'pending' as const,
            name: 'Alice',
          },
        ],
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: 21,
          totalPages: 2,
          previousPage: null,
          nextPage: 2,
        },
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('批量通过');
    expect(response.body).toContain('批量拒绝');
    expect(response.body).toContain('通过');
    expect(response.body).toContain('拒绝');
    expect(response.body).toContain('type="checkbox"');
    expect(response.body).toContain('id="bulk-user-review-form"');
    expect(response.body).toContain('form="bulk-user-review-form"');
    expect(response.body).toContain('data-require-checked="userIds"');
    expect(response.body).toContain('请先选择需要处理的用户');
    expect(response.body).toContain('确定要通过选中的用户吗？');
    expect(response.body).toContain('确定要拒绝选中的用户吗？');
    expect(response.body).toContain('id="approve-user-user-2"');
    expect(response.body).toContain('id="reject-user-user-2"');
    expect(response.body).toContain('id="reset-password-user-user-2"');
    expect(response.body).toContain('id="delete-user-user-2"');
    expect(response.body).toContain('确定要通过用户 alice 吗？');
    expect(response.body).toContain('确定要拒绝用户 alice 吗？');
    expect(response.body).toContain('确定要重置用户 alice 的密码吗？');
    expect(response.body).toContain('确定要删除用户 alice 吗？删除后不可恢复。');
    expect(response.body).toContain('data-require-password="password"');
    expect(response.body).toContain('用户管理分页');
    expect(response.body).toContain('/admin/users?page=2');
    expect(response.body).toContain('刷新');
    expect(response.body).toContain('href="/admin/users"');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/notyf.min.js"');
    expect(response.body).toContain('src="/assets/notify.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/admin-users.js"');
  });

  it('renders hide and delete actions on the admin problem sets page', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
      listAdminProblemSets: async () => [
        {
          id: 'set-1',
          title: '已发布训练',
          problemRefs: ['1000', '1001'],
          isPublished: true,
          publishedAtText: '2026-05-29 10:00',
          updatedAtText: '2026-05-29 11:00',
          contentMarkdown: '- [[pid:1000]]',
        },
        {
          id: 'set-2',
          title: '草稿训练',
          problemRefs: ['1002'],
          isPublished: false,
          publishedAtText: null,
          updatedAtText: '2026-05-29 12:00',
          contentMarkdown: '- [[pid:1002]]',
        },
      ],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/problem-sets',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('已发布训练');
    expect(response.body).toContain('草稿训练');
    expect(response.body).toContain('action="/admin/problem-sets/set-1/hide"');
    expect(response.body).toContain('action="/admin/problem-sets/set-1/delete"');
    expect(response.body).toContain('action="/admin/problem-sets/set-2/publish"');
    expect(response.body).toContain('action="/admin/problem-sets/set-2/delete"');
    expect(response.body).toContain('确定要隐藏题目单 已发布训练 吗？隐藏后学生将无法看到。');
    expect(response.body).toContain('确定要删除题目单 已发布训练 吗？删除后不可恢复。');
    expect(response.body).toContain('确定要删除题目单 草稿训练 吗？删除后不可恢复。');
  });

  it('renders admin grade management page', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
      listGrades: async () => [
        {
          id: 'grade-1',
          name: '2025',
          isActive: true,
          order: 1,
        },
      ],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/grades',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('年级管理');
    expect(response.body).toContain('2025');
    expect(response.body).toContain('id="new-grade-name" type="text" name="name" required');
    expect(response.body).toContain('id="new-grade-order" type="number" name="order" value="0" required min="0" step="1"');
    expect(response.body).toContain('name="isActive"');
    expect(response.body).toContain('id="adminGradesAlert"');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/admin-grades.js"');
  });

  it('renders admin class management page', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
      listClasses: async () => [
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
      url: '/admin/classes',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('班级管理');
    expect(response.body).toContain('1 班');
    expect(response.body).toContain('id="new-class-name" type="text" name="name" required');
    expect(response.body).toContain('id="new-class-order" type="number" name="order" value="0" required min="0" step="1"');
    expect(response.body).toContain('name="isActive"');
    expect(response.body).toContain('id="adminClassesAlert"');
    expect(response.body).toContain('src="/assets/admin-grades.js"');
  });

  it('renders admin language settings validation hooks', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
      getEnabledLanguages: async () => ['python'] as const,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/settings/languages',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('id="adminLanguageAlert"');
    expect(response.body).toContain('id="adminLanguageForm"');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/admin-language-settings.js"');
  });

  it('renders admin pagination settings page', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
      getPaginationSettings: async () => ({
        listPageSize: 50,
        allowedPageSizes: [20, 50, 100],
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/settings/pagination',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('分页设置');
    expect(response.body).toContain('name="listPageSize"');
    expect(response.body).toContain('value="50" checked');
    expect(response.body).toContain('100 条');
  });

  it('renders pagination on the admin submissions page and requests the selected page', async () => {
    let receivedPagination: { page: number; pageSize: number } | null = null;
    const app = buildApp(createServices({
      getCurrentUser: async () => adminUser(),
      getPaginationSettings: async () => ({
        listPageSize: 50,
        allowedPageSizes: [20, 50, 100],
      }),
      listAdminSubmissions: async (pagination: { page: number; pageSize: number }) => {
        receivedPagination = pagination;
        return {
          submissions: [
            {
              id: 'sub-21',
              publicId: '21',
              submissionNo: 21,
              userId: 'user-1',
              pid: '1000',
              problemTitle: 'A + B Problem',
              problemLabel: '1000 A + B Problem',
              username: 'demo',
              displayName: 'Demo User',
              language: 'python',
              sourceCode: 'print(1)',
              canViewSourceCode: true,
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
      url: '/admin/submissions?page=2',
      headers: {
        cookie: adminSessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPagination).toEqual({
      page: 2,
      pageSize: 50,
    });
    expect(response.body).toContain('提交管理分页');
    expect(response.body).toContain('第 2 / 3 页，共 41 条');
    expect(response.body).toContain('/admin/submissions?page=1');
    expect(response.body).toContain('/admin/submissions?page=3');
    expect(response.body).toContain('刷新');
    expect(response.body).toContain('href="/admin/submissions?page=2"');
  });
});
