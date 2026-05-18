import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';

function createServices(overrides: Record<string, unknown> = {}) {
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
        allowLanguages: ['cpp', 'python'],
      },
    ],
    getProblemByPid: async () => ({
      pid: '1000',
      title: 'A + B Problem',
      statementMarkdown: 'Input two integers and print their sum.',
      allowLanguages: ['cpp', 'python'],
    }),
    getSubmissionById: async () => ({
      id: 'sub-1',
      status: 'FINISHED',
      verdict: 'AC',
      judgeStatus: 'FINISHED',
      message: 'ok',
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
  it('renders a home page with Pico CSS and shared navigation', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('https://cdn.jsdelivr.net/npm/@picocss/pico');
    expect(response.body).toContain('<nav');
    expect(response.body).toContain('Home');
    expect(response.body).toContain('Practice for school OJ');
  });

  it('renders problems page with shared navigation links', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/problems',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('<nav');
    expect(response.body).toContain('Problem list');
    expect(response.body).toContain('Submit code');
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
    expect(response.body).toContain('Account login');
    expect(response.body).toContain('username');
    expect(response.body).toContain('Sign in');
  });

  it('renders the ranklist page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/ranklist',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Ranklist');
    expect(response.body).toContain('Accepted');
    expect(response.body).toContain('demo');
  });

  it('renders the contests page', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/contests',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Contest list');
    expect(response.body).toContain('May Practice Contest');
    expect(response.body).toContain('Upcoming');
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
    expect(response.body).toContain('Create problem');
    expect(response.body).toContain('Statement');
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
    expect(response.body).toContain('Edit problem');
    expect(response.body).toContain('A + B Problem');
  });
});
