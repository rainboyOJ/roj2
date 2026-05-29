import { ObjectId } from 'mongodb';
import {
  ProblemProgressStatuses,
  SubmissionVerdicts,
  type ProblemProgressStatus,
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
