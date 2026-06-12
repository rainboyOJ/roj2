import { describe, expect, it } from 'vitest';

import {
  buildApp,
  type SessionUser,
  type SubmissionListFilters,
} from '../src/app.ts';
import { paginated, sessionCookie } from './helpers.ts';
import { createViewTestServices as createServices } from './view-test-services.ts';

describe('submission views', () => {
  it('renders submissions page as a table view for logged-in users', async () => {
    const app = buildApp(createServices({
      listSubmissions: async () => paginated([
        {
          id: 'sub-1',
          publicId: '42',
          submissionNo: 42,
          userId: 'user-1',
          pid: '1000',
          problemTitle: '1000 A + B Problem',
          problemLabel: '1000 A + B Problem',
          username: 'demo',
          displayName: 'Demo User',
          language: 'python',
          sourceCode: 'print(1)',
          status: 'FINISHED',
          verdict: 'AC',
          score: 67,
          judgeStatus: 'FINISHED',
          message: 'ok',
          caseResults: [],
        },
      ]),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/submissions',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('提交列表');
    expect(response.body).toContain('<table');
    expect(response.body).toContain('42');
    expect(response.body).not.toContain('sub-1');
    expect(response.body).toContain('Demo User (demo)');
    expect(response.body).toContain('href="/users/demo" target="_blank" rel="noopener noreferrer"');
    expect(response.body).toContain('1000 A + B Problem');
    expect(response.body).not.toContain('1000 1000 A + B Problem');
    expect(response.body).toContain('python');
    expect(response.body).toContain('67');
    expect(response.body).toContain('已完成');
    expect(response.body).toContain('个人中心');
    expect(response.body).toContain('登出');
    expect(response.body).not.toContain('登录');
    expect(response.body).not.toContain('注册');
  });

  it('renders pagination on the submissions page and requests the selected page', async () => {
    let receivedPagination: { page: number; pageSize: number } | null = null;
    let receivedFilters: unknown = null;
    const app = buildApp(createServices({
      listSubmissions: async (
        _user: SessionUser,
        pagination: { page: number; pageSize: number },
        filters: SubmissionListFilters = {},
      ) => {
        receivedPagination = pagination;
        receivedFilters = filters;
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
          filters,
        };
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/submissions?page=2&pid=1000&user=Demo&language=python',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPagination).toEqual({
      page: 2,
      pageSize: 20,
    });
    expect(receivedFilters).toEqual({
      pid: '1000',
      user: 'Demo',
      language: 'python',
    });
    expect(response.body).toContain('提交列表分页');
    expect(response.body).toContain('href="/users/demo" target="_blank" rel="noopener noreferrer"');
    expect(response.body).toContain('共有 3 页');
    expect(response.body).toContain('aria-current="page">2</span>');
    expect(response.body).toContain(
      '/submissions?page=1&amp;pid=1000&amp;user=Demo&amp;language=python',
    );
    expect(response.body).toContain(
      '/submissions?page=3&amp;pid=1000&amp;user=Demo&amp;language=python',
    );
    expect(response.body).toContain('value="1000"');
    expect(response.body).toContain('value="Demo"');
    expect(response.body).toContain('id="submission-filter-language"');
    expect(response.body).toContain('<option value="python" selected>Python</option>');
  });

  it('renders case results on the submission detail page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/submissions/42',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('测试点结果');
    expect(response.body).toContain('提交代码');
    expect(response.body).toContain('href="/users/demo" target="_blank" rel="noopener noreferrer"');
    expect(response.body).toContain('print(1)');
    expect(response.body).toContain('100');
    expect(response.body).toContain('#1');
    expect(response.body).toContain('3 ms');
    expect(response.body).toContain('1024 KB');
    expect(response.body).toContain('href="/problem/1000" role="button">返回题目</a>');
    expect(response.body).toContain('href="/problem/1000#submit"');
    expect(response.body).toContain('再提交此题');
  });

  it('renders submission detail without source code for other users', async () => {
    const app = buildApp(createServices({
      getSubmissionById: async () => ({
        id: 'sub-1',
        publicId: '42',
        submissionNo: 42,
        userId: 'user-2',
        pid: '1000',
        problemTitle: 'A + B Problem',
        problemLabel: '1000 A + B Problem',
        username: 'other',
        displayName: 'Other User',
        language: 'python',
        sourceCode: 'print("secret")',
        canViewSourceCode: true,
        status: 'FINISHED',
        verdict: 'AC',
        score: 100,
        judgeStatus: 'FINISHED',
        message: 'ok',
        caseResults: [],
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/submissions/42',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('无权限查看该提交源码。');
    expect(response.body).not.toContain('print(&quot;secret&quot;)');
  });
});
