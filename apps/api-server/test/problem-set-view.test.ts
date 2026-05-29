import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';
import { sessionCookie } from './helpers.ts';
import { createViewTestServices as createServices } from './view-test-services.ts';

describe('problem set views', () => {
  it('renders published problem sets in the public list', async () => {
    const app = buildApp(createServices({
      listPublishedProblemSets: async () => [
        {
          id: 'set-1',
          title: '第一周训练',
          problemRefs: ['1000', '1001'],
          isPublished: true,
          publishedAtText: '2026-05-28 08:00',
          updatedAtText: '2026-05-28 08:00',
        },
      ],
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problem-sets',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('题目单');
    expect(response.body).toContain('第一周训练');
    expect(response.body).toContain('href="/problem-sets/set-1"');
    expect(response.body).toContain('2026-05-28 08:00');
  });

  it('renders problem set references with current user progress', async () => {
    const app = buildApp(createServices({
      getPublishedProblemSetById: async () => ({
        id: 'set-1',
        title: '第一周训练',
        contentMarkdown: '- [[pid:1000]]\n- [[pid:1001]]',
        contentHtml: '<ul><li><span class="problem-set-ref" data-pid="1000"></span></li><li><span class="problem-set-ref" data-pid="1001"></span></li></ul>',
        problemRefs: ['1000', '1001'],
        problemRefsView: [],
        isPublished: true,
        publishedAtText: '2026-05-28 08:00',
        updatedAtText: '2026-05-28 08:00',
      }),
      listProblemsByPids: async () => [
        {
          pid: '1000',
          title: 'A + B Problem',
          statementMarkdown: 'desc',
          statementHtml: '<p>desc</p>',
          allowLanguages: ['cpp', 'python'],
        },
        {
          pid: '1001',
          title: 'Second Problem',
          statementMarkdown: 'desc',
          statementHtml: '<p>desc</p>',
          allowLanguages: ['cpp', 'python'],
        },
      ],
      listProblemProgressByUser: async () => new Map([
        ['1000', 'accepted'],
      ]),
    }));

    const response = await app.inject({
      method: 'GET',
      url: '/problem-sets/set-1',
      headers: {
        cookie: sessionCookie(),
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('第一周训练');
    expect(response.body).toContain('problem-set-ref-icon accepted');
    expect(response.body).toContain('problem-set-ref-icon empty');
    expect(response.body).toContain('1000 A + B Problem');
    expect(response.body).toContain('1001 Second Problem');
    expect(response.body).toContain('href="/problem/1000"');
  });
});
