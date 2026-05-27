// 这组测试专门看“渲染出来的 HTML 长什么样”。
import { describe, expect, it } from 'vitest';

import { buildApp, type SessionUser, type SubmissionViewModel } from '../src/app.ts';

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
  // 用固定的假数据把页面渲染稳定下来，方便直接断言 HTML 内容。
  return {
    createSubmission: async () => ({
      id: 'sub-1',
      publicId: '42',
      submissionNo: 42,
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
      score: 0,
    }),
    listProblems: async () => [
      {
        pid: '1000',
        title: 'A + B Problem',
        statementMarkdown: 'Input two integers and print their sum.',
        statementHtml: '<p>Input two integers and print their sum.</p>',
        allowLanguages: ['cpp', 'python'],
      },
    ],
    listProblemProgressByUser: async () => new Map<string, 'accepted' | 'attempted'>(),
    getProblemByPid: async () => ({
      pid: '1000',
      title: 'A + B Problem',
      statementMarkdown: 'Input two integers and print their sum.',
      statementHtml: '<h2>Statement</h2><p>Input two integers and print their sum.</p>',
      allowLanguages: ['cpp', 'python'],
    }),
    getSubmissionById: async () => ({
      id: 'sub-1',
      publicId: '42',
      submissionNo: 42,
      userId: 'user-1',
      pid: '1000',
      problemTitle: 'A + B Problem',
      problemLabel: '1000 A + B Problem',
      username: 'demo',
      displayName: 'Demo User',
      language: 'python',
      sourceCode: 'print(1)',
      status: 'FINISHED',
      verdict: 'AC',
      score: 100,
      judgeStatus: 'FINISHED',
      message: 'ok',
      caseResults: [
        {
          seq_id: 1,
          verdict: 'AC',
          cpu_time_ms: 3,
          real_time_ms: 5,
          memory_kb: 1024,
          signal: 0,
          exit_code: 0,
          error_code: 0,
        },
      ],
    }),
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
        approvalStatus: 'approved' as const,
      },
    }),
    logoutUser: async () => undefined,
    getCurrentUser: async () => ({
      id: 'user-1',
      username: 'demo',
      role: 'student' as const,
      approvalStatus: 'approved' as const,
    }),
    listAdminUsers: async () => [],
    approveUser: async () => undefined,
    rejectUser: async () => undefined,
    listAdminSubmissions: async () => paginated(),
    listRanklist: async () => [
      {
        rank: 1,
        username: 'demo',
        acceptedCount: 3,
        submissionCount: 5,
        lastAcceptedAt: '2026-05-18 11:00',
      },
    ],
    listContests: async () => [
      {
        id: 'practice-may',
        title: 'May Practice Contest',
        status: 'Upcoming',
        startAtText: '2026-05-20 19:00',
        endAtText: '2026-05-20 21:00',
        description: 'A simple training contest for class practice.',
      },
      {
        id: 'weekly-ladder',
        title: 'Weekly Ladder',
        status: 'Open Practice',
        startAtText: 'Every Monday 18:00',
        endAtText: 'Every Sunday 22:00',
        description: 'A rolling ladder page used as a placeholder for future contest support.',
      },
    ],
    getContestById: async () => ({
      id: 'practice-may',
      title: 'May Practice Contest',
      status: 'Upcoming',
      startAtText: '2026-05-20 19:00',
      endAtText: '2026-05-20 21:00',
      description: 'A simple training contest for class practice.',
    }),
    listGrades: async () => [],
    createGrade: async () => ({
      id: 'grade-1',
      name: '2027',
      isActive: true,
      order: 4,
    }),
    updateGrade: async () => undefined,
    listAdminProblems: async () => [],
    getAdminProblemById: async () => ({
      id: 'problem-1',
      pid: '1000',
      title: 'A + B Problem',
      statementMarkdown: 'Input two integers and print their sum.',
      statementHtml: '<p>Input two integers and print their sum.</p>',
      allowLanguages: ['cpp', 'python'],
      isVisible: true,
    }),
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

describe('rendered views', () => {
  it('renders a home page with Pico CSS and shared navigation in Chinese by default', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('href="/assets/pico.classless.min.css"');
    expect(response.body).toContain('href="/assets/katex.min.css"');
    expect(response.body).not.toContain('https://cdn.jsdelivr.net');
    expect(response.body).toContain('href="/favicon.svg"');
    expect(response.body).toContain('<nav');
    expect(response.body).toContain('<html lang="zh-CN" data-theme="light">');
    expect(response.body).toContain('首页');
    expect(response.body).toContain('学校 OJ 练习平台');
    expect(response.body).toContain('登录');
    expect(response.body).toContain('注册');
    expect(response.body).not.toContain('题目管理');
  });

  it('shows one admin entry in the public navigation for admin users', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('href="/admin"');
    expect(response.body).toContain('role="button"');
    expect(response.body).toContain('>管理</a>');
    expect(response.body).not.toContain('href="/admin/problems"');
    expect(response.body).not.toContain('href="/admin/users"');
  });

  it('serves the site favicon', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/favicon.svg',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
    expect(response.body).toContain('<svg');
    expect(response.body).toContain('ROJ');
  });

  it('serves local stylesheet assets', async () => {
    const app = buildApp(createServices());

    const pico = await app.inject({
      method: 'GET',
      url: '/assets/pico.classless.min.css',
    });
    const katex = await app.inject({
      method: 'GET',
      url: '/assets/katex.min.css',
    });

    expect(pico.statusCode).toBe(200);
    expect(pico.headers['content-type']).toContain('text/css');
    expect(pico.body).toContain('--pico');
    expect(katex.statusCode).toBe(200);
    expect(katex.headers['content-type']).toContain('text/css');
    expect(katex.body).toContain('katex');
  });

  it('serves local registration javascript assets', async () => {
    const app = buildApp(createServices());

    const axios = await app.inject({
      method: 'GET',
      url: '/assets/axios.min.js',
    });
    const register = await app.inject({
      method: 'GET',
      url: '/assets/register.js',
    });
    const login = await app.inject({
      method: 'GET',
      url: '/assets/login.js',
    });

    expect(axios.statusCode).toBe(200);
    expect(axios.headers['content-type']).toContain('application/javascript');
    expect(axios.body).toContain('axios');
    expect(register.statusCode).toBe(200);
    expect(register.headers['content-type']).toContain('application/javascript');
    expect(register.body).toContain('/api/register');
    expect(register.body).toContain('用户名已存在');
    expect(register.body).toContain('checkValidity');
    expect(login.statusCode).toBe(200);
    expect(login.headers['content-type']).toContain('application/javascript');
    expect(login.body).toContain('/api/login');
    expect(login.body).toContain('用户名或密码错误');
    expect(login.body).toContain('checkValidity');
  });

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
    expect(response.body).toContain('src="/assets/register.js"');
    expect(response.body).not.toContain('https://cdn');
  });

  it('renders problems page as a table view', async () => {
    const app = buildApp(createServices());

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
    expect(response.body).not.toContain('已通过');
    expect(response.body).not.toContain('已尝试');
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
        cookie: 'roj_session=token-1',
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
    expect(response.body).not.toContain('<pre class="mono-block">');
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
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('提交列表');
    expect(response.body).toContain('<table');
    expect(response.body).toContain('42');
    expect(response.body).not.toContain('sub-1');
    expect(response.body).toContain('Demo User (demo)');
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
    const app = buildApp(createServices({
      listSubmissions: async (_user: SessionUser, pagination: { page: number; pageSize: number }) => {
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
      url: '/submissions?page=2',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPagination).toEqual({
      page: 2,
      pageSize: 20,
    });
    expect(response.body).toContain('提交列表分页');
    expect(response.body).toContain('第 2 / 3 页，共 41 条');
    expect(response.body).toContain('/submissions?page=1');
    expect(response.body).toContain('/submissions?page=3');
  });

  it('renders case results on the submission detail page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/submissions/42',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('测试点结果');
    expect(response.body).toContain('提交代码');
    expect(response.body).toContain('print(1)');
    expect(response.body).toContain('100');
    expect(response.body).toContain('#1');
    expect(response.body).toContain('3 ms');
    expect(response.body).toContain('1024 KB');
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
    expect(response.body).toContain('src="/assets/login.js"');
    expect(response.body).toContain('登录');
  });

  it('renders registration form with gender radios, grade select, and text class input', async () => {
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
    expect(response.body).toContain('input id="className" type="text"');
  });

  it('renders profile password change form', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/profile',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('action="/profile/password"');
    expect(response.body).toContain('name="currentPassword"');
    expect(response.body).toContain('name="newPassword"');
  });

  it('renders the ranklist page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/ranklist',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('排行榜');
    expect(response.body).toContain('<table');
    expect(response.body).toContain('通过题数');
    expect(response.body).toContain('demo');
  });

  it('renders the contests page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/contests',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('比赛列表');
    expect(response.body).toContain('<table');
    expect(response.body).toContain('比赛名称');
    expect(response.body).toContain('操作');
    expect(response.body).toContain('May Practice Contest');
    expect(response.body).toContain('即将开始');
    expect(response.body).toContain('开放练习');
  });

  it('renders the admin problem creation page for admins', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/problems/new',
      headers: {
        cookie: 'roj_session=admin-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('创建题目');
    expect(response.body).toContain('题面');
    expect(response.body).toContain('题目管理');
    expect(response.body).toContain('提交管理');
    expect(response.body).toContain('用户');
    expect(response.body).not.toContain('登录');
    expect(response.body).not.toContain('注册');
  });

  it('renders the admin dashboard for admins', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin',
      headers: {
        cookie: 'roj_session=admin-token',
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
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/problems/problem-1/edit',
      headers: {
        cookie: 'roj_session=admin-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('编辑题目');
    expect(response.body).toContain('A + B Problem');
  });

  it('renders approval actions on the admin users page', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
      listAdminUsers: async () => [
        {
          id: 'user-2',
          username: 'alice',
          role: 'student' as const,
          approvalStatus: 'pending' as const,
          name: 'Alice',
        },
      ],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: {
        cookie: 'roj_session=admin-token',
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
    expect(response.body).toContain('id="approve-user-user-2"');
    expect(response.body).toContain('id="reject-user-user-2"');
    expect(response.body).toContain('id="reset-password-user-user-2"');
    expect(response.body).toContain('id="delete-user-user-2"');
  });

  it('renders admin grade management page', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
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
        cookie: 'roj_session=admin-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('年级管理');
    expect(response.body).toContain('2025');
    expect(response.body).toContain('name="isActive"');
  });

  it('renders pagination on the admin submissions page and requests the selected page', async () => {
    let receivedPagination: { page: number; pageSize: number } | null = null;
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
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
        cookie: 'roj_session=admin-token',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedPagination).toEqual({
      page: 2,
      pageSize: 20,
    });
    expect(response.body).toContain('提交管理分页');
    expect(response.body).toContain('第 2 / 3 页，共 41 条');
    expect(response.body).toContain('/admin/submissions?page=1');
    expect(response.body).toContain('/admin/submissions?page=3');
  });
});
