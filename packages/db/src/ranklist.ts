import { SubmissionVerdicts } from '@roj/shared';

const NO_ACCEPTED_AT = new Date('9999-12-31T23:59:59.999Z');

export interface RanklistFilters {
  className?: string | undefined;
}

export function buildRanklistAggregationPipeline(filters: RanklistFilters = {}) {
  const pipeline: object[] = [
    {
      $group: {
        _id: {
          userId: '$userId',
          pid: '$pid',
        },
        username: { $first: '$username' },
        displayNameSnapshot: { $first: '$displayName' },
        acceptedProblem: {
          $max: {
            $cond: [{ $eq: ['$verdict', SubmissionVerdicts.AC] }, 1, 0],
          },
        },
        submissionCount: { $sum: 1 },
        wrongAttempts: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$verdict', SubmissionVerdicts.PENDING] },
                  { $ne: ['$verdict', SubmissionVerdicts.AC] },
                ],
              },
              1,
              0,
            ],
          },
        },
        lastAcceptedAt: {
          $min: {
            $cond: [
              { $eq: ['$verdict', SubmissionVerdicts.AC] },
              '$updatedAt',
              NO_ACCEPTED_AT,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: '$_id.userId',
        username: { $first: '$username' },
        displayNameSnapshot: { $first: '$displayName' },
        acceptedCount: { $sum: '$acceptedProblem' },
        submissionCount: { $sum: '$submissionCount' },
        wrongAttempts: { $sum: '$wrongAttempts' },
        lastAcceptedAt: { $min: '$lastAcceptedAt' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  if (filters.className) {
    pipeline.push({
      $match: {
        'user.className': filters.className,
      },
    });
  }

  pipeline.push(
    {
      $addFields: {
        lastAcceptedAtSort: '$lastAcceptedAt',
        lastAcceptedAt: {
          $cond: [
            { $eq: ['$lastAcceptedAt', NO_ACCEPTED_AT] },
            null,
            '$lastAcceptedAt',
          ],
        },
      },
    },
    {
      $sort: {
        acceptedCount: -1,
        wrongAttempts: 1,
        lastAcceptedAtSort: 1,
        username: 1,
      },
    },
    {
      $project: {
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
      },
    },
  );

  return pipeline;
}
