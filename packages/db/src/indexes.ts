import type { Collection } from 'mongodb';
import type {
  ClassDocument,
  GradeDocument,
  ProblemDocument,
  ProblemSetDocument,
  SessionDocument,
  SubmissionDocument,
  UserDocument,
  UserProblemProgressDocument,
} from '@roj/shared';

export interface IndexCollections {
  users: Collection<UserDocument>;
  grades: Collection<GradeDocument>;
  classes: Collection<ClassDocument>;
  sessions: Collection<SessionDocument>;
  problems: Collection<ProblemDocument>;
  problemSets: Collection<ProblemSetDocument>;
  submissions: Collection<SubmissionDocument>;
  userProblemProgress: Collection<UserProblemProgressDocument>;
}

export async function ensureRojIndexes(collections: IndexCollections) {
  await collections.users.createIndex({ username: 1 }, { unique: true });
  await collections.grades.createIndex({ name: 1 }, { unique: true });
  await collections.classes.createIndex({ name: 1 }, { unique: true });
  await collections.sessions.createIndex({ token: 1 }, { unique: true });
  await collections.sessions.createIndex({ expiresAt: 1 });
  await collections.problems.createIndex({ pid: 1 }, { unique: true });
  await collections.problemSets.createIndex({ isPublished: 1, publishedAt: -1 });
  await collections.problemSets.createIndex({ createdAt: -1 });
  await collections.submissions.createIndex({ userId: 1, createdAt: -1 });
  await collections.submissions.createIndex({ pid: 1, createdAt: -1 });
  await collections.submissions.createIndex({ username: 1, verdict: 1, updatedAt: 1 });
  await collections.submissions.createIndex({ submissionNo: 1 }, { unique: true, sparse: true });
  await collections.submissions.createIndex({ status: 1, 'judge.leaseExpireAt': 1 });
  await collections.submissions.createIndex({ 'judge.submissionId': 1 });
  await collections.userProblemProgress.createIndex({ userId: 1, pid: 1 }, { unique: true });
  await collections.userProblemProgress.createIndex({ userId: 1, status: 1 });
}
