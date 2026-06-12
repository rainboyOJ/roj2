import type { Collection } from 'mongodb';
import type {
  SubmissionDocument,
  UserDocument,
  UserProblemProgressDocument,
} from '@roj/shared';

export interface DeletedUserSubmissionCleanupStats {
  submissionCount: number;
  progressCount: number;
}

export interface DeletedUserSubmissionCleanupCollections {
  users: Collection<UserDocument>;
  submissions: Collection<SubmissionDocument>;
  userProblemProgress: Collection<UserProblemProgressDocument>;
}

async function listDeletedUserIds(collections: DeletedUserSubmissionCleanupCollections) {
  const [submissionUserIds, progressUserIds, users] = await Promise.all([
    collections.submissions.distinct('userId'),
    collections.userProblemProgress.distinct('userId'),
    collections.users.find(
      {},
      {
        projection: { _id: 1 },
      },
    ).toArray(),
  ]);
  const existingUserIds = new Set(users.map((user) => user._id));
  return [...new Set([...submissionUserIds, ...progressUserIds])]
    .filter((userId): userId is string => typeof userId === 'string')
    .filter((userId) => !existingUserIds.has(userId));
}

export async function countDeletedUserSubmissionCleanup(
  collections: DeletedUserSubmissionCleanupCollections,
): Promise<DeletedUserSubmissionCleanupStats> {
  const deletedUserIds = await listDeletedUserIds(collections);
  if (deletedUserIds.length === 0) {
    return {
      submissionCount: 0,
      progressCount: 0,
    };
  }

  const userFilter = { userId: { $in: deletedUserIds } };
  const [submissionCount, progressCount] = await Promise.all([
    collections.submissions.countDocuments(userFilter),
    collections.userProblemProgress.countDocuments(userFilter),
  ]);
  return {
    submissionCount,
    progressCount,
  };
}

export async function cleanupDeletedUserSubmissions(
  collections: DeletedUserSubmissionCleanupCollections,
): Promise<DeletedUserSubmissionCleanupStats> {
  const deletedUserIds = await listDeletedUserIds(collections);
  if (deletedUserIds.length === 0) {
    return {
      submissionCount: 0,
      progressCount: 0,
    };
  }

  const userFilter = { userId: { $in: deletedUserIds } };
  const [submissions, progress] = await Promise.all([
    collections.submissions.deleteMany(userFilter),
    collections.userProblemProgress.deleteMany(userFilter),
  ]);
  return {
    submissionCount: submissions.deletedCount,
    progressCount: progress.deletedCount,
  };
}
