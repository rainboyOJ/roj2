import { describe, expect, it } from 'vitest';

import { buildApp, type ApiServerServices, type SessionUser } from '../src/app.ts';

const currentUser: SessionUser = {
  id: 'user-1',
  username: 'demo',
  role: 'student',
  approvalStatus: 'approved',
};

function createServices(): ApiServerServices {
  return {
    getCurrentUser: async () => currentUser,
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
      status: 'JUDGING',
      verdict: 'PENDING',
      score: 0,
      judgeStatus: 'RUNNING',
      message: '',
      caseResults: [],
    }),
  } as unknown as ApiServerServices;
}

describe('submission detail polling', () => {
  it('renders stable DOM hooks and local polling script without full-page reload', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/submissions/42',
      headers: {
        cookie: 'roj_session=token-1',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('id="submissionDetail"');
    expect(response.body).toContain('data-submission-id="42"');
    expect(response.body).toContain('data-terminal="false"');
    expect(response.body).toContain('id="submissionStatus"');
    expect(response.body).toContain('id="submissionVerdict"');
    expect(response.body).toContain('id="submissionScore"');
    expect(response.body).toContain('id="submissionJudgeStatus"');
    expect(response.body).toContain('id="submissionMessagePanel"');
    expect(response.body).toContain('id="submissionCaseResults"');
    expect(response.body).toContain('src="/assets/submission-detail.js"');
    expect(response.body).not.toContain('setTimeout');
    expect(response.body).not.toContain('window.location.href');
  });

  it('serves the local submission detail polling asset', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/assets/submission-detail.js',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/javascript');
    expect(response.body).toContain('/api/submissions/');
    expect(response.body).toContain('window.setInterval');
    expect(response.body).toContain('terminalStatuses');
  });
});
