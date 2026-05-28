import { describe, expect, it } from 'vitest';

import { buildRanklistAggregationPipeline } from '../src/index.ts';

describe('buildRanklistAggregationPipeline', () => {
  it('groups submissions by user id and counts ranklist fields', () => {
    const pipeline = buildRanklistAggregationPipeline();
    const groupStage = pipeline[0] as {
      $group: Record<string, unknown>;
    };

    expect(groupStage.$group._id).toBe('$userId');
    expect(groupStage.$group.username).toEqual({ $first: '$username' });
    expect(groupStage.$group.displayNameSnapshot).toEqual({ $first: '$displayName' });
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
