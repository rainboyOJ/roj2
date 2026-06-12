import { describe, expect, it } from 'vitest';

import { buildRanklistAggregationPipeline } from '../src/index.ts';

interface RanklistSourceSubmission {
  userId: string;
  pid: string;
  username: string;
  displayName: string;
  verdict: string;
  updatedAt: Date;
}

function summarizeLikeRanklist(submissions: RanklistSourceSubmission[]) {
  const byUserProblem = new Map<string, {
    userId: string;
    username: string;
    displayName: string;
    acceptedProblem: number;
    submissionCount: number;
    wrongAttempts: number;
    lastAcceptedAt: Date;
  }>();
  const noAcceptedAt = new Date('9999-12-31T23:59:59.999Z');

  for (const submission of submissions) {
    const key = `${submission.userId}:${submission.pid}`;
    const existing = byUserProblem.get(key) ?? {
      userId: submission.userId,
      username: submission.username,
      displayName: submission.displayName,
      acceptedProblem: 0,
      submissionCount: 0,
      wrongAttempts: 0,
      lastAcceptedAt: noAcceptedAt,
    };

    existing.submissionCount += 1;
    if (submission.verdict === 'AC') {
      existing.acceptedProblem = 1;
      if (submission.updatedAt < existing.lastAcceptedAt) {
        existing.lastAcceptedAt = submission.updatedAt;
      }
    } else if (submission.verdict !== 'PENDING') {
      existing.wrongAttempts += 1;
    }
    byUserProblem.set(key, existing);
  }

  const byUser = new Map<string, {
    acceptedCount: number;
    submissionCount: number;
    wrongAttempts: number;
  }>();

  for (const row of byUserProblem.values()) {
    const existing = byUser.get(row.userId) ?? {
      acceptedCount: 0,
      submissionCount: 0,
      wrongAttempts: 0,
    };
    existing.acceptedCount += row.acceptedProblem;
    existing.submissionCount += row.submissionCount;
    existing.wrongAttempts += row.wrongAttempts;
    byUser.set(row.userId, existing);
  }

  return byUser;
}

describe('buildRanklistAggregationPipeline', () => {
  it('groups submissions by user and problem before counting ranklist fields', () => {
    const pipeline = buildRanklistAggregationPipeline();
    const groupStage = pipeline[0] as {
      $group: Record<string, unknown>;
    };
    const userGroupStage = pipeline[1] as {
      $group: Record<string, unknown>;
    };

    expect(groupStage.$group._id).toEqual({
      userId: '$userId',
      pid: '$pid',
    });
    expect(groupStage.$group.username).toEqual({ $first: '$username' });
    expect(groupStage.$group.displayNameSnapshot).toEqual({ $first: '$displayName' });
    expect(groupStage.$group.submissionCount).toEqual({ $sum: 1 });
    expect(groupStage.$group.acceptedProblem).toEqual({
      $max: {
        $cond: [{ $eq: ['$verdict', 'AC'] }, 1, 0],
      },
    });
    expect(groupStage.$group.wrongAttempts).toEqual({
      $sum: {
        $cond: [
          {
            $and: [
              { $ne: ['$verdict', 'PENDING'] },
              { $ne: ['$verdict', 'AC'] },
            ],
          },
          1,
          0,
        ],
      },
    });
    expect(userGroupStage.$group._id).toBe('$_id.userId');
    expect(userGroupStage.$group.acceptedCount).toEqual({ $sum: '$acceptedProblem' });
    expect(userGroupStage.$group.submissionCount).toEqual({ $sum: '$submissionCount' });
    expect(userGroupStage.$group.wrongAttempts).toEqual({ $sum: '$wrongAttempts' });
    expect(userGroupStage.$group.lastAcceptedAt).toEqual({ $min: '$lastAcceptedAt' });
  });

  it('sorts by accepted count, wrong attempts, accepted time, then username', () => {
    const pipeline = buildRanklistAggregationPipeline();
    const sortStage = pipeline.find((stage) => '$sort' in stage) as {
      $sort: Record<string, number>;
    };

    expect(sortStage.$sort).toEqual({
      acceptedCount: -1,
      wrongAttempts: 1,
      lastAcceptedAtSort: 1,
      username: 1,
    });
  });

  it('counts repeated AC submissions for one problem as one accepted problem', () => {
    const rows = summarizeLikeRanklist([
      {
        userId: 'user-1',
        pid: '1000',
        username: 'alice',
        displayName: 'Alice',
        verdict: 'AC',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        userId: 'user-1',
        pid: '1000',
        username: 'alice',
        displayName: 'Alice',
        verdict: 'AC',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
      {
        userId: 'user-1',
        pid: '1001',
        username: 'alice',
        displayName: 'Alice',
        verdict: 'WA',
        updatedAt: new Date('2026-01-03T00:00:00.000Z'),
      },
    ]);

    expect(rows.get('user-1')).toEqual({
      acceptedCount: 1,
      submissionCount: 3,
      wrongAttempts: 1,
    });
  });

  it('projects the public ranklist row shape', () => {
    const pipeline = buildRanklistAggregationPipeline();
    const lookupStage = pipeline.find((stage) => '$lookup' in stage) as {
      $lookup: Record<string, unknown>;
    };
    const projectStage = pipeline.find((stage) => '$project' in stage) as {
      $project: Record<string, unknown>;
    };

    expect(lookupStage.$lookup).toEqual({
      from: 'users',
      localField: '_id',
      foreignField: '_id',
      as: 'user',
    });
    expect(projectStage.$project).toEqual({
      _id: 0,
      username: 1,
      displayName: {
        $ifNull: ['$user.name', '$displayNameSnapshot'],
      },
      className: '$user.className',
      acceptedCount: 1,
      submissionCount: 1,
      wrongAttempts: 1,
      lastAcceptedAt: 1,
    });
  });

  it('can filter ranklist rows by current user class name', () => {
    const pipeline = buildRanklistAggregationPipeline({ className: '1 班' });
    const classFilterStage = pipeline.find((stage) =>
      '$match' in stage
        && JSON.stringify(stage).includes('"user.className":"1 班"'),
    );

    expect(classFilterStage).toEqual({
      $match: {
        'user.className': '1 班',
      },
    });
  });
});
