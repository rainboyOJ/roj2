// 这组测试专门看“渲染出来的 HTML 长什么样”。
import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';

function createServices(overrides: Record<string, unknown> = {}) {
  // 用固定的假数据把页面渲染稳定下来，方便直接断言 HTML 内容。
  return {
    createSubmission: async () => ({
      id: 'sub-1',
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
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
    getProblemByPid: async () => ({
      pid: '1000',
      title: 'A + B Problem',
      statementMarkdown: 'Input two integers and print their sum.',
      statementHtml: '<h2>Statement</h2><p>Input two integers and print their sum.</p>',
      allowLanguages: ['cpp', 'python'],
    }),
    getSubmissionById: async () => ({
      id: 'sub-1',
      status: 'FINISHED',
      verdict: 'AC',
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
    listAdminSubmissions: async () => [],
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
    updateProfileClassName: async () => undefined,
    resetUserPassword: async () => undefined,
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
    expect(response.body).toContain('https://cdn.jsdelivr.net/npm/@picocss/pico');
    expect(response.body).toContain('<nav');
    expect(response.body).toContain('<html lang="zh-CN" data-theme="light">');
    expect(response.body).toContain('首页');
    expect(response.body).toContain('学校 OJ 练习平台');
    expect(response.body).toContain('登录');
    expect(response.body).toContain('注册');
    expect(response.body).not.toContain('题目管理');
  });

  it('renders a home page in English when lang=en is provided', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/?lang=en',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Home');
    expect(response.body).toContain('Practice for school OJ');
    expect(response.body).toContain('href="/?lang=zh"');
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
    expect(response.body).toContain('A + B Problem');
    expect(response.body).toContain('提交代码');
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

  it('renders submissions page as a table view for logged-in users', async () => {
    const app = buildApp(createServices({
      listSubmissions: async () => [
        {
          id: 'sub-1',
          status: 'FINISHED',
          verdict: 'AC',
          judgeStatus: 'FINISHED',
          message: 'ok',
          caseResults: [],
        },
      ],
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
    expect(response.body).toContain('sub-1');
    expect(response.body).toContain('已完成');
    expect(response.body).toContain('个人中心');
    expect(response.body).toContain('登出');
    expect(response.body).not.toContain('登录');
    expect(response.body).not.toContain('注册');
  });

  it('renders case results on the submission detail page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/submissions/sub-1',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('测试点结果');
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
    expect(response.body).toContain('登录');
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
  });
});
