import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import type { ProblemListQueryFilters } from '../src/service-types.ts';
import { sessionCookie } from './helpers.ts';
import { createViewTestServices as createServices } from './view-test-services.ts';

describe('problem views', () => {
  it('renders problems page as a table view', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => null,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problems',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<nav');
    expect(response.body).toContain('题目列表');
    expect(response.body).toContain('<table');
    expect(response.body).toContain('<th class="problem-progress-cell">状态</th>');
    expect(response.body).toContain('A + B Problem');
    expect(response.body).toContain('提交代码');
    expect(response.body).toContain('href="/login"');
    expect(response.body).toContain('题目列表分页');
    expect(response.body).toContain('aria-label="题目筛选"');
    expect(response.body).not.toContain('已通过');
    expect(response.body).not.toContain('已尝试');
  });

  it('uses pagination settings on the problems page', async () => {
    let receivedPagination: {
      page: number;
      pageSize: number;
      filters?: ProblemListQueryFilters;
    } | null = null;
    const app = buildApp(createServices({
      getPaginationSettings: async () => ({
        listPageSize: 50,
        allowedPageSizes: [20, 50, 100],
      }),
      listProblemsPaginated: async (pagination) => {
        receivedPagination = pagination;
        return {
          problems: [
            {
              pid: '1001',
              title: 'Second Problem',
              statementMarkdown: 'Second.',
              statementHtml: '<p>Second.</p>',
              allowLanguages: ['python'],
            },
          ],
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: 51,
            totalPages: 2,
            previousPage: 1,
            nextPage: null,
          },
        };
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problems?page=2',
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPagination).toEqual({
      page: 2,
      pageSize: 50,
      filters: {},
    });
    expect(response.body).toContain('Second Problem');
    expect(response.body).toContain('共有 2 页');
    expect(response.body).toContain('aria-current="page">2</span>');
    expect(response.body).toContain('href="/problems?page=1" aria-label="第一页"');
    expect(response.body).toContain('aria-disabled="true">></span>');
  });

  it('does not show the login button on the problems page for logged-in users', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/problems',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('题目列表');
    expect(response.body).not.toContain('href="/login"');
  });

  it('passes problem search filters and keeps them in pagination links', async () => {
    const receivedPaginations: Array<{
      page: number;
      pageSize: number;
      filters?: ProblemListQueryFilters;
    }> = [];
    const app = buildApp(createServices({
      listProblemsPaginated: async (pagination) => {
        receivedPaginations.push(pagination);
        return {
          problems: [
            {
              pid: '1001',
              title: 'Filtered Problem',
              statementMarkdown: 'Filtered.',
              statementHtml: '<p>Filtered.</p>',
              allowLanguages: ['python'],
            },
          ],
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: 40,
            totalPages: 2,
            previousPage: null,
            nextPage: 2,
          },
        };
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problems?q=Filter&page=1',
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPaginations.at(-1)?.filters).toEqual({ q: 'Filter' });
    expect(response.body).toContain('value="Filter"');
    expect(response.body).toContain('href="/problems?page=2&amp;q=Filter"');
  });

  it('filters problems by current user progress', async () => {
    const receivedPaginations: Array<{
      page: number;
      pageSize: number;
      filters?: ProblemListQueryFilters;
    }> = [];
    const app = buildApp(createServices({
      listProblemProgressByUser: async () => new Map([
        ['1000', 'accepted'],
        ['1001', 'attempted'],
      ]),
      listProblemsPaginated: async (pagination) => {
        receivedPaginations.push(pagination);
        return {
          problems: [],
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: 0,
            totalPages: 1,
            previousPage: null,
            nextPage: null,
          },
        };
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problems?progress=accepted',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPaginations.at(-1)?.filters).toEqual({ pidIn: ['1000'] });
    expect(response.body).toContain('<option value="accepted" selected>已通过</option>');
    expect(response.body).toContain('没有找到符合条件的题目。');
  });

  it('ignores progress filters for anonymous users', async () => {
    const receivedPaginations: Array<{
      page: number;
      pageSize: number;
      filters?: ProblemListQueryFilters;
    }> = [];
    const app = buildApp(createServices({
      getCurrentUser: async () => null,
      listProblemsPaginated: async (pagination) => {
        receivedPaginations.push(pagination);
        return {
          problems: [],
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: 0,
            totalPages: 1,
            previousPage: null,
            nextPage: null,
          },
        };
      },
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problems?progress=accepted&q=1000',
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPaginations.at(-1)?.filters).toEqual({ q: '1000' });
    expect(response.body).not.toContain('<select name="progress">');
  });

  it('renders current user problem progress on the problems page', async () => {
    const app = buildApp(createServices({
      listProblems: async () => [
        {
          pid: '1000',
          title: 'Accepted Problem',
          statementMarkdown: 'Solved.',
          statementHtml: '<p>Solved.</p>',
          allowLanguages: ['cpp', 'python'],
        },
        {
          pid: '1001',
          title: 'Attempted Problem',
          statementMarkdown: 'Tried.',
          statementHtml: '<p>Tried.</p>',
          allowLanguages: ['cpp', 'python'],
        },
        {
          pid: '1002',
          title: 'Fresh Problem',
          statementMarkdown: 'Fresh.',
          statementHtml: '<p>Fresh.</p>',
          allowLanguages: ['cpp', 'python'],
        },
      ],
      listProblemProgressByUser: async () => new Map([
        ['1000', 'accepted'],
        ['1001', 'attempted'],
      ]),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problems',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('class="problem-row-accepted"');
    expect(response.body).toContain('<td class="problem-progress-cell">');
    expect(response.body).toContain('problem-progress-icon accepted');
    expect(response.body).toContain('title="已通过"');
    expect(response.body).toContain('problem-progress-icon attempted');
    expect(response.body).toContain('title="已尝试"');
    expect(response.body).toContain('Fresh Problem');
  });

  it('renders only globally enabled languages on the problems list page', async () => {
    const app = buildApp(createServices({
      getEnabledLanguages: async () => ['python'] as const,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problems',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('python');
    expect(response.body).not.toContain('cpp, python');
    expect(response.body).not.toContain('<td>cpp</td>');
  });

  it('renders a problem statement from pre-rendered html', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/problem/1000',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<h2>Statement</h2>');
    expect(response.body).toContain('class="problem-meta-row"');
    expect(response.body).toContain('支持语言');
    expect(response.body).toContain('href="#submit"');
    expect(response.body).toContain('id="copyStatementButton"');
    expect(response.body).toContain('复制题面');
    expect(response.body).toContain('id="problemStatementMarkdown"');
    expect(response.body).toContain('Input two integers and print their sum.');
    expect(response.body).toContain('id="submissionAlert"');
    expect(response.body).toContain('id="submissionForm"');
    expect(response.body).toContain('id="submit"');
    expect(response.body).toContain('name="sourceCode"');
    expect(response.body).toContain('select name="language" id="language" required');
    expect(response.body).toContain('src="/assets/axios.min.js"');
    expect(response.body).toContain('src="/assets/notyf.min.js"');
    expect(response.body).toContain('src="/assets/notify.js"');
    expect(response.body).toContain('src="/assets/form-utils.js"');
    expect(response.body).toContain('src="/assets/problem-statement.js"');
    expect(response.body).toContain('src="/assets/editor/problem-editor.js"');
    expect(response.body).not.toContain('<pre class="mono-block">');
  });

  it('safely embeds problem markdown for client-side copy', async () => {
    const app = buildApp(createServices({
      getProblemByPid: async () => ({
        pid: '1000',
        title: 'A + B Problem',
        statementMarkdown: 'before </script><script>alert(1)</script> after',
        statementHtml: '<p>safe html</p>',
        allowLanguages: ['cpp', 'python'],
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problem/1000',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('before \\u003C/script\\u003E\\u003Cscript\\u003Ealert(1)\\u003C/script\\u003E after');
    expect(response.body).not.toContain('before </script><script>alert(1)</script> after');
  });

  it('renders only globally enabled languages on the problem page', async () => {
    const app = buildApp(createServices({
      getProblemByPid: async () => ({
        pid: '1000',
        title: 'A + B Problem',
        statementMarkdown: 'Input two integers and print their sum.',
        statementHtml: '<p>Input two integers and print their sum.</p>',
        allowLanguages: ['cpp', 'python'],
      }),
      getEnabledLanguages: async () => ['python'] as const,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problem/1000',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('option value="python"');
    expect(response.body).not.toContain('option value="cpp"');
  });
});
