import { OJSubmissionStatuses } from '@roj/shared';

// 抢占待评测 submission 时使用的原子更新。
export function buildLeaseUpdate(leaseOwner: string, now: Date, leaseMs: number) {
  return {
    $set: {
      status: OJSubmissionStatuses.SENT_TO_JUDGE,
      'judge.leaseOwner': leaseOwner,
      'judge.leaseExpireAt': new Date(now.getTime() + leaseMs),
      updatedAt: now,
    },
  };
}
