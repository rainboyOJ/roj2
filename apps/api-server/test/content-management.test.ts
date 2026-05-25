// 这组测试偏后台管理和内容维护流程。
import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';

function createServices(overrides: Record<string, unknown> = {}) {
  return {
    createSubmission: async () => ({
      id: 'sub-1',
      publicId: '42',
      submissionNo: 42,
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
    }),
    listProblems: async () => [],
    getProblemByPid: async () => null,
    getSubmissionById: async () => null,
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
      username: 'alice',
      role: 'student' as const,
      approvalStatus: 'approved' as const,
    }),
    listAdminUsers: async () => [],
    approveUser: async () => undefined,
    rejectUser: async () => undefined,
    listSubmissions: async () => [],
    listAdminSubmissions: async () => [],
    listRanklist: async () => [],
    listContests: async () => [],
    getContestById: async () => null,
    listGrades: async () => [],
    createGrade: async () => ({
      id: 'grade-1',
      name: '2027',
      isActive: true,
      order: 4,
    }),
    updateGrade: async () => undefined,
    listAdminProblems: async () => [],
    getAdminProblemById: async () => null,
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
    ...overrides,
  };
}

describe('content management routes', () => {
  it('approves selected users from the admin HTML page flow', async () => {
    const approved: Array<{ userId: string; adminUserId: string }> = [];
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
      approveUser: async (userId: string, adminUserId: string) => {
        approved.push({ userId, adminUserId });
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/users/bulk-approve?lang=zh',
      headers: {
        cookie: 'roj_session=admin-token',
      },
      payload: {
        userIds: ['user-2', 'user-3'],
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/users?lang=zh');
    expect(approved).toEqual([
      { userId: 'user-2', adminUserId: 'admin-1' },
      { userId: 'user-3', adminUserId: 'admin-1' },
    ]);
  });

  it('rejects selected users from the admin HTML page flow', async () => {
    const rejected: Array<{ userId: string; adminUserId: string }> = [];
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
      rejectUser: async (userId: string, adminUserId: string) => {
        rejected.push({ userId, adminUserId });
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/admin/users/bulk-reject?lang=zh',
      headers: {
        cookie: 'roj_session=admin-token',
      },
      payload: {
        userIds: ['user-2', 'user-3'],
      },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/admin/users?lang=zh');
    expect(rejected).toEqual([
      { userId: 'user-2', adminUserId: 'admin-1' },
      { userId: 'user-3', adminUserId: 'admin-1' },
    ]);
  });

  it('returns a logged-in user submission list', async () => {
    const app = buildApp(createServices({
      listSubmissions: async () => [
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
          judgeStatus: 'FINISHED',
          message: 'ok',
          caseResults: [],
        },
      ],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/api/submissions',
      headers: {
        cookie: 'roj_session=token-1',
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
    const app = buildApp(createServices());
    const response = await app.inject({
      method: 'GET',
      url: '/api/admin/submissions',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(403);
  });

  it('creates a grade for admin users', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/grades',
      headers: {
        cookie: 'roj_session=admin-token',
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
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/problems',
      headers: {
        cookie: 'roj_session=admin-token',
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

  it('updates a class name for the current student', async () => {
    const app = buildApp(createServices());
    const response = await app.inject({
      method: 'POST',
      url: '/api/me/class-name',
      headers: {
        cookie: 'roj_session=token-1',
      },
      payload: {
        className: 'Class 2',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('updates a grade for admin users', async () => {
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'PUT',
      url: '/api/admin/grades/grade-1',
      headers: {
        cookie: 'roj_session=admin-token',
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
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/problems/problem-1/publish',
      headers: {
        cookie: 'roj_session=admin-token',
      },
    });

    expect(response.statusCode).toBe(200);
  });

  it('updates enabled languages for admin users', async () => {
    let receivedLanguages: string[] = [];
    const app = buildApp(createServices({
      getCurrentUser: async () => ({
        id: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        approvalStatus: 'approved' as const,
      }),
      updateEnabledLanguages: async (languages: Array<'cpp' | 'python'>) => {
        receivedLanguages = languages;
      },
    }));

    const response = await app.inject({
      method: 'POST',
      url: '/api/admin/settings/languages',
      headers: {
        cookie: 'roj_session=admin-token',
      },
      payload: {
        enabledLanguages: ['python'],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(receivedLanguages).toEqual(['python']);
  });
});
