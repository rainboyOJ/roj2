import { describe, expect, it } from 'vitest';

import { buildRanklistAggregationPipeline } from '../src/index.ts';

describe('buildRanklistAggregationPipeline', () => {
  it('groups submissions by username and counts ranklist fields', () => {
    const pipeline = buildRanklistAggregationPipeline();
    const groupStage = pipeline[0] as {
      $group: Record<string, unknown>;
    };

    expect(groupStage.$group._id).toBe('$username');
    expect(groupStage.$group.username).toEqual({ $first: '$username' });
    expect(groupStage.$group.submissionCount).toEqual({ $sum: 1 });
    expect(groupStage.$group.acceptedCount).toEqual({
      $sum: {
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
  });

  it('sorts by accepted count, wrong attempts, accepted time, then username', () => {
    const pipeline = buildRanklistAggregationPipeline();
    const sortStage = pipeline[2] as {
      $sort: Record<string, number>;
    };

    expect(sortStage.$sort).toEqual({
      acceptedCount: -1,
      wrongAttempts: 1,
      lastAcceptedAtSort: 1,
      username: 1,
    });
  });

  it('projects the public ranklist row shape', () => {
    const pipeline = buildRanklistAggregationPipeline();
    const projectStage = pipeline[3] as {
      $project: Record<string, number>;
    };

    expect(projectStage.$project).toEqual({
      _id: 0,
      username: 1,
      acceptedCount: 1,
      submissionCount: 1,
      wrongAttempts: 1,
      lastAcceptedAt: 1,
    });
  });
});
