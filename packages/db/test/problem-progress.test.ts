import { describe, expect, it } from 'vitest';

import {
  buildAcceptedProblemProgressUpdate,
  buildAttemptedProblemProgressUpdate,
  buildUserProblemProgressRows,
} from '../src/index.ts';

describe('problem progress updates', () => {
  it('creates an attempted progress row only when one does not exist', () => {
    const now = new Date('2026-05-27T00:00:00.000Z');
    const update = buildAttemptedProblemProgressUpdate('user-1', '1000', now);

    expect(update.$setOnInsert).toMatchObject({
      userId: 'user-1',
      pid: '1000',
      status: 'attempted',
      updatedAt: now,
    });
    expect(update.$setOnInsert._id).toEqual(expect.any(String));
  });

  it('upgrades a progress row to accepted', () => {
    const now = new Date('2026-05-27T00:01:00.000Z');
    const update = buildAcceptedProblemProgressUpdate('user-1', '1000', now);

    expect(update.$set).toEqual({
      status: 'accepted',
      updatedAt: now,
    });
    expect(update.$setOnInsert).toMatchObject({
      userId: 'user-1',
      pid: '1000',
    });
    expect(update.$setOnInsert._id).toEqual(expect.any(String));
  });
});

describe('buildUserProblemProgressRows', () => {
  it('keeps accepted after later wrong submissions', () => {
    const rows = buildUserProblemProgressRows([
      {
        userId: 'user-1',
        pid: '1000',
        verdict: 'WA',
        updatedAt: new Date('2026-05-27T00:00:00.000Z'),
      },
      {
        userId: 'user-1',
        pid: '1000',
        verdict: 'AC',
        updatedAt: new Date('2026-05-27T00:01:00.000Z'),
      },
      {
        userId: 'user-1',
        pid: '1000',
        verdict: 'CE',
        updatedAt: new Date('2026-05-27T00:02:00.000Z'),
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      userId: 'user-1',
      pid: '1000',
      status: 'accepted',
      updatedAt: new Date('2026-05-27T00:02:00.000Z'),
    });
  });

  it('builds independent progress rows for users and problems', () => {
    const rows = buildUserProblemProgressRows([
      {
        userId: 'user-1',
        pid: '1000',
        verdict: 'WA',
        updatedAt: new Date('2026-05-27T00:00:00.000Z'),
      },
      {
        userId: 'user-1',
        pid: '1001',
        verdict: 'AC',
        updatedAt: new Date('2026-05-27T00:01:00.000Z'),
      },
      {
        userId: 'user-2',
        pid: '1000',
        verdict: 'PENDING',
        updatedAt: new Date('2026-05-27T00:02:00.000Z'),
      },
    ]);

    expect(rows).toEqual([
      {
        userId: 'user-1',
        pid: '1000',
        status: 'attempted',
        updatedAt: new Date('2026-05-27T00:00:00.000Z'),
      },
      {
        userId: 'user-1',
        pid: '1001',
        status: 'accepted',
        updatedAt: new Date('2026-05-27T00:01:00.000Z'),
      },
      {
        userId: 'user-2',
        pid: '1000',
        status: 'attempted',
        updatedAt: new Date('2026-05-27T00:02:00.000Z'),
      },
    ]);
  });
});
