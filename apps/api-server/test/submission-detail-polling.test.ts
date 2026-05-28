import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { createTestServices, sessionCookie, studentUser } from './helpers.ts';

function createServices() {
  return createTestServices({
    getCurrentUser: async () => studentUser({ username: 'demo' }),
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
      canViewSourceCode: true,
      status: 'JUDGING',
      verdict: 'PENDING',
      score: 0,
      judgeStatus: 'RUNNING',
      message: '',
      caseResults: [],
    }),
  });
}

describe('submission detail polling', () => {
  it('renders stable DOM hooks and local polling script without full-page reload', async () => {
    const app = buildApp(createServices());

    const response = await app.inject({
      method: 'GET',
      url: '/submissions/42',
      headers: {
        cookie: sessionCookie(),
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
