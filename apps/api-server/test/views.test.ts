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
    listGrades: async () => [],
    createGrade: async () => ({
      id: 'grade-1',
      name: '2027',
      isActive: true,
      order: 4,
    }),
    updateGrade: async () => undefined,
    listAdminProblems: async () => [],
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
  it('renders problems page inside a shared app shell', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/problems',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('class="app-shell"');
    expect(response.body).toContain('class="app-nav"');
    expect(response.body).toContain('class="page-header"');
    expect(response.body).toContain('Browse problems');
  });

  it('renders login form with shared card styling hooks', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => null,
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/login',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('class="form-card"');
    expect(response.body).toContain('class="form-grid"');
    expect(response.body).toContain('Sign in');
  });
});
