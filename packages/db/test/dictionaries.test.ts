import { describe, expect, it } from 'vitest';

import {
  buildClassDocument,
  buildDictionaryUpdateFields,
  buildGradeDocument,
} from '../src/index.ts';

describe('dictionary document builders', () => {
  it('builds grade and class documents with timestamps', () => {
    const now = new Date('2026-05-29T13:00:00.000Z');
    const input = {
      name: '1 班',
      isActive: true,
      order: 1,
    };

    expect(buildGradeDocument(input, now)).toMatchObject({
      name: '1 班',
      isActive: true,
      order: 1,
      createdAt: now,
      updatedAt: now,
    });
    expect(buildClassDocument(input, now)).toMatchObject({
      name: '1 班',
      isActive: true,
      order: 1,
      createdAt: now,
      updatedAt: now,
    });
  });

  it('builds shared update fields for dictionaries', () => {
    const now = new Date('2026-05-29T13:00:00.000Z');

    expect(buildDictionaryUpdateFields({
      name: '2026',
      isActive: false,
      order: 3,
    }, now)).toEqual({
      name: '2026',
      isActive: false,
      order: 3,
      updatedAt: now,
    });
  });
});
