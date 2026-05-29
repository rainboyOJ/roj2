import type { ApiServerServices } from '../src/app.ts';
import {
  createTestServices,
  paginated,
  studentUser,
} from './helpers.ts';

export function createViewTestServices(overrides: Partial<ApiServerServices> = {}) {
  // 用固定的假数据把页面渲染稳定下来，方便直接断言 HTML 内容。
  return createTestServices({
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
    getCurrentUser: async () => studentUser({ username: 'demo' }),
    listAdminSubmissions: async () => paginated(),
    listRanklist: async () => [
      {
        rank: 1,
        username: 'demo',
        displayName: 'Demo User',
        className: '1 班',
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
    listActiveClasses: async () => [
      {
        id: 'class-1',
        name: '1 班',
        isActive: true,
        order: 1,
      },
      {
        id: 'class-2',
        name: '2 班',
        isActive: true,
        order: 2,
      },
    ],
    getAdminProblemById: async () => ({
      id: 'problem-1',
      pid: '1000',
      title: 'A + B Problem',
      statementMarkdown: 'Input two integers and print their sum.',
      statementHtml: '<p>Input two integers and print their sum.</p>',
      allowLanguages: ['cpp', 'python'],
      isVisible: true,
    }),
    ...overrides,
  });
}
