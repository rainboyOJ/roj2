// 这个测试聚焦 lease 更新结构是否正确。
import { describe, expect, it } from 'vitest';

import { buildLeaseUpdate } from '../src/index.ts';

describe('buildLeaseUpdate', () => {
  it('writes owner and expiry for a claimed submission', () => {
    const now = new Date('2026-05-17T00:00:00.000Z');
    const result = buildLeaseUpdate('worker-1', now, 30_000);

    expect(result.$set['judge.leaseOwner']).toBe('worker-1');
    expect(result.$set.status).toBe('SENT_TO_JUDGE');
    expect(result.$set['judge.leaseExpireAt']).toEqual(
      new Date('2026-05-17T00:00:30.000Z'),
    );
  });
});
