import { describe, expect, it } from 'vitest';

import {
  buildProblemDocument,
  buildProblemSetDocument,
  buildProblemSetUpdateFields,
  buildProblemUpdateFields,
} from '../src/index.ts';

describe('problem document builders', () => {
  it('builds a problem document with rendered HTML', () => {
    const now = new Date('2026-05-29T00:00:00.000Z');
    const problem = buildProblemDocument({
      pid: '1000',
      title: 'A + B',
      statementMarkdown: '# A + B\n\n- [[pid:1001]]\n',
      allowLanguages: ['cpp', 'python'],
      isVisible: true,
    }, now);

    expect(problem).toMatchObject({
      pid: '1000',
      title: 'A + B',
      statementMarkdown: '# A + B\n\n- [[pid:1001]]\n',
      allowLanguages: ['cpp', 'python'],
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    });
    expect(problem._id).toEqual(expect.any(String));
    expect(problem.statementHtml).toContain('<h1');
    expect(problem.statementHtml).toContain('A + B');
  });

  it('builds update fields without createdAt', () => {
    const now = new Date('2026-05-29T00:00:00.000Z');
    const update = buildProblemUpdateFields({
      pid: '1001',
      title: 'Updated',
      statementMarkdown: '**bold**',
      allowLanguages: ['python'],
      isVisible: false,
    }, now);

    expect(update).toMatchObject({
      pid: '1001',
      title: 'Updated',
      statementMarkdown: '**bold**',
      allowLanguages: ['python'],
      isVisible: false,
      updatedAt: now,
    });
    expect(update).not.toHaveProperty('createdAt');
    expect(update.statementHtml).toContain('<strong>bold</strong>');
  });
});

describe('problem set document builders', () => {
  it('builds a problem set document with rendered refs', () => {
    const now = new Date('2026-05-29T00:00:00.000Z');
    const problemSet = buildProblemSetDocument({
      title: '第一周',
      contentMarkdown: '- [[pid:1000]]\n- [[pid:1001]]\n',
    }, now);

    expect(problemSet).toMatchObject({
      title: '第一周',
      contentMarkdown: '- [[pid:1000]]\n- [[pid:1001]]\n',
      problemRefs: ['1000', '1001'],
      isPublished: false,
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(problemSet._id).toEqual(expect.any(String));
    expect(problemSet.contentHtml).toContain('data-pid="1000"');
  });

  it('builds problem set update fields without publish fields', () => {
    const now = new Date('2026-05-29T00:00:00.000Z');
    const update = buildProblemSetUpdateFields({
      title: '更新题目单',
      contentMarkdown: '- [[pid:1002]]\n',
    }, now);

    expect(update).toMatchObject({
      title: '更新题目单',
      contentMarkdown: '- [[pid:1002]]\n',
      problemRefs: ['1002'],
      updatedAt: now,
    });
    expect(update).not.toHaveProperty('createdAt');
    expect(update).not.toHaveProperty('isPublished');
    expect(update.contentHtml).toContain('data-pid="1002"');
  });
});
