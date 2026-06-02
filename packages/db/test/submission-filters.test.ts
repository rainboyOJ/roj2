import { describe, expect, it } from 'vitest';

import { buildSubmissionListFilter } from '../src/index.ts';

describe('buildSubmissionListFilter', () => {
  it('trims pid filters', () => {
    expect(buildSubmissionListFilter({ pid: ' 1000 ' })).toEqual({
      pid: '1000',
    });
  });

  it('filters by submission language', () => {
    expect(buildSubmissionListFilter({ language: ' python ' })).toEqual({
      language: 'python',
    });
  });

  it('matches username or display name with escaped text', () => {
    const filter = buildSubmissionListFilter({ user: ' a+b ' });

    expect(filter.$or).toHaveLength(2);
    expect(filter.$or?.[0]).toEqual({ username: /a\+b/i });
    expect(filter.$or?.[1]).toEqual({ displayName: /a\+b/i });
  });

  it('ignores blank filters', () => {
    expect(buildSubmissionListFilter({ pid: ' ', user: ' ', language: ' ' })).toEqual({});
  });
});
