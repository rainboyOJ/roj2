import { ObjectId, type Collection } from 'mongodb';
import {
  ProblemProgressStatuses,
  SubmissionVerdicts,
  type ProblemProgressStatus,
  type SubmissionDocument,
  type UserProblemProgressDocument,
} from '@roj/shared';

interface ProblemProgressSourceSubmission {
  userId: string;
  pid: string;
  verdict: string;
  updatedAt: Date;
}

export function buildAttemptedProblemProgressUpdate(userId: string, pid: string, now: Date) {
  return {
    $setOnInsert: {
      _id: new ObjectId().toHexString(),
      userId,
      pid,
      status: ProblemProgressStatuses.ATTEMPTED,
      updatedAt: now,
    },
  };
}

export function buildAcceptedProblemProgressUpdate(userId: string, pid: string, now: Date) {
  return {
    $set: {
      status: ProblemProgressStatuses.ACCEPTED,
      updatedAt: now,
    },
    $setOnInsert: {
      _id: new ObjectId().toHexString(),
      userId,
      pid,
    },
  };
}

export function buildUserProblemProgressRows(
  submissions: Iterable<ProblemProgressSourceSubmission>,
) {
  const progressByKey = new Map<string, {
    userId: string;
    pid: string;
    status: ProblemProgressStatus;
    updatedAt: Date;
  }>();

  for (const submission of submissions) {
    const key = `${submission.userId}:${submission.pid}`;
    const existing = progressByKey.get(key);
    const status = submission.verdict === SubmissionVerdicts.AC
      ? ProblemProgressStatuses.ACCEPTED
      : ProblemProgressStatuses.ATTEMPTED;

    if (!existing) {
      progressByKey.set(key, {
        userId: submission.userId,
        pid: submission.pid,
        status,
        updatedAt: submission.updatedAt,
      });
      continue;
    }

    existing.updatedAt = submission.updatedAt;
    if (status === ProblemProgressStatuses.ACCEPTED) {
      existing.status = ProblemProgressStatuses.ACCEPTED;
    }
  }

  return Array.from(progressByKey.values());
}

export async function listProblemProgressByUser(
  userProblemProgress: Collection<UserProblemProgressDocument>,
  userId: string,
) {
  const progressRows = await userProblemProgress
    .find({ userId }, { projection: { pid: 1, status: 1 } })
    .toArray();
  const progressByPid = new Map<string, 'accepted' | 'attempted'>();

  for (const progress of progressRows) {
    progressByPid.set(progress.pid, progress.status);
  }

  return progressByPid;
}

export async function markProblemAttempted(
  userProblemProgress: Collection<UserProblemProgressDocument>,
  userId: string,
  pid: string,
  now = new Date(),
) {
  await userProblemProgress.updateOne(
    { userId, pid },
    buildAttemptedProblemProgressUpdate(userId, pid, now),
    { upsert: true },
  );
}

export async function markProblemAccepted(
  userProblemProgress: Collection<UserProblemProgressDocument>,
  userId: string,
  pid: string,
  now = new Date(),
) {
  await userProblemProgress.updateOne(
    { userId, pid },
    buildAcceptedProblemProgressUpdate(userId, pid, now),
    { upsert: true },
  );
}

export async function rebuildUserProblemProgress(
  submissionsCollection: Collection<SubmissionDocument>,
  userProblemProgress: Collection<UserProblemProgressDocument>,
) {
  const submissions: ProblemProgressSourceSubmission[] = [];

  const cursor = submissionsCollection
    .find({}, { projection: { userId: 1, pid: 1, verdict: 1, updatedAt: 1 } })
    .sort({ createdAt: 1 });

  for await (const submission of cursor) {
    submissions.push(submission);
  }

  const progressRows = buildUserProblemProgressRows(submissions);
  await userProblemProgress.deleteMany({});
  if (progressRows.length === 0) {
    return { rebuilt: 0 };
  }

  await userProblemProgress.bulkWrite(
    progressRows.map((progress) => ({
      insertOne: {
        document: {
          _id: new ObjectId().toHexString(),
          ...progress,
        },
      },
    })),
  );

  return { rebuilt: progressRows.length };
}
