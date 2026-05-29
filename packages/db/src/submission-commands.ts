import { ObjectId, type Collection } from 'mongodb';
import {
  OJSubmissionStatuses,
  SubmissionVerdicts,
  createEmptyJudgeState,
  createEmptyResultState,
  type CounterDocument,
  type CreateSubmissionInput,
  type ProblemDocument,
  type SiteSettingsDocument,
  type SubmissionDocument,
  type UserDocument,
  type UserProblemProgressDocument,
} from '@roj/shared';

import { nextCounterValue } from './counters.ts';
import { getEnabledLanguages } from './settings.ts';
import { buildLeaseUpdate } from './submission-lease.ts';
import {
  buildClearSubmissionLeaseUpdate,
  buildJudgeAckUpdate,
  buildJudgeSnapshotUpdate,
  buildSubmissionFailedUpdate,
  type JudgeSnapshotPersistInput,
} from './submission-updates.ts';
import { markProblemAccepted, markProblemAttempted } from './problem-progress.ts';

export interface SubmissionCommandCollections {
  users: Collection<UserDocument>;
  problems: Collection<ProblemDocument>;
  counters: Collection<CounterDocument>;
  settings: Collection<SiteSettingsDocument>;
  submissions: Collection<SubmissionDocument>;
  userProblemProgress: Collection<UserProblemProgressDocument>;
}

export type DebugJudge = (message: string, details?: Record<string, unknown>) => void;

export async function createSubmission(
  collections: SubmissionCommandCollections,
  input: CreateSubmissionInput,
  debugJudge: DebugJudge,
) {
  const user = await collections.users.findOne({ _id: input.userId });
  if (!user) {
    throw new Error('user not found');
  }

  const problem = await collections.problems.findOne({ pid: input.pid, isVisible: true });
  if (!problem) {
    throw new Error(`problem ${input.pid} not found`);
  }
  const enabledLanguages = await getEnabledLanguages(collections.settings);
  if (!enabledLanguages.includes(input.language)) {
    throw new Error(`language ${input.language} is disabled`);
  }
  if (!problem.allowLanguages.includes(input.language)) {
    throw new Error(`language ${input.language} is not allowed for ${input.pid}`);
  }

  const now = new Date();
  const submissionNo = await nextCounterValue(collections.counters, 'submissionNo');
  const submission: SubmissionDocument = {
    _id: new ObjectId().toHexString(),
    submissionNo,
    userId: user._id,
    problemId: problem._id,
    pid: problem.pid,
    username: user.username,
    displayName: user.name,
    language: input.language,
    sourceCode: input.sourceCode,
    status: OJSubmissionStatuses.PENDING_DISPATCH,
    verdict: SubmissionVerdicts.PENDING,
    score: 0,
    judge: createEmptyJudgeState(),
    result: createEmptyResultState(),
    createdAt: now,
    updatedAt: now,
  };

  await collections.submissions.insertOne(submission);
  await markProblemAttempted(collections.userProblemProgress, submission.userId, submission.pid, now);
  debugJudge('submission created', {
    localSubmissionId: submission._id,
    submissionNo: submission.submissionNo,
    pid: submission.pid,
    userId: submission.userId,
    language: submission.language,
  });
  return submission;
}

export async function claimPendingSubmission(
  collections: Pick<SubmissionCommandCollections, 'submissions'>,
  leaseOwner: string,
  leaseMs: number,
  debugJudge: DebugJudge,
) {
  const now = new Date();
  const result = await collections.submissions.findOneAndUpdate(
    {
      status: OJSubmissionStatuses.PENDING_DISPATCH,
      $or: [
        { 'judge.leaseExpireAt': null },
        { 'judge.leaseExpireAt': { $lt: now } },
      ],
    },
    buildLeaseUpdate(leaseOwner, now, leaseMs),
    {
      sort: { createdAt: 1 },
      returnDocument: 'after',
    },
  );

  if (result) {
    debugJudge('submission claimed', {
      localSubmissionId: result._id,
      pid: result.pid,
      leaseOwner,
    });
  }

  return result;
}

export async function saveJudgeAck(
  collections: Pick<SubmissionCommandCollections, 'submissions'>,
  localSubmissionId: string,
  ack: JudgeSnapshotPersistInput,
  debugJudge: DebugJudge,
) {
  const now = new Date();
  debugJudge('save judge ack', {
    localSubmissionId,
    judgeSubmissionId: ack.submissionId,
    status: ack.status,
    verdict: ack.verdict,
    cases: ack.case_results.length,
  });
  await collections.submissions.updateOne(
    { _id: localSubmissionId },
    buildJudgeAckUpdate(ack, now),
  );
}

export async function saveJudgeSnapshot(
  collections: Pick<SubmissionCommandCollections, 'submissions' | 'userProblemProgress'>,
  localSubmissionId: string,
  snapshot: JudgeSnapshotPersistInput,
  debugJudge: DebugJudge,
) {
  const now = new Date();
  const {
    mapped,
    score,
    update,
  } = buildJudgeSnapshotUpdate(snapshot, now);
  const submission = await collections.submissions.findOne(
    { _id: localSubmissionId },
    { projection: { userId: 1, pid: 1 } },
  );
  debugJudge('save judge snapshot', {
    localSubmissionId,
    judgeSubmissionId: snapshot.submissionId,
    judgeStatus: snapshot.status,
    ojStatus: mapped.status,
    verdict: mapped.verdict,
    score,
    cases: snapshot.case_results.length,
  });
  await collections.submissions.updateOne(
    { _id: localSubmissionId },
    update,
  );

  if (
    mapped.status === OJSubmissionStatuses.FINISHED ||
    mapped.status === OJSubmissionStatuses.FAILED
  ) {
    await collections.submissions.updateOne(
      { _id: localSubmissionId },
      buildClearSubmissionLeaseUpdate(),
    );
  }

  if (mapped.verdict === SubmissionVerdicts.AC && submission) {
    await markProblemAccepted(collections.userProblemProgress, submission.userId, submission.pid, now);
  }
}

export async function markSubmissionFailed(
  collections: Pick<SubmissionCommandCollections, 'submissions'>,
  localSubmissionId: string,
  message: string,
  debugJudge: DebugJudge,
) {
  const now = new Date();
  debugJudge('mark submission failed', {
    localSubmissionId,
    message,
  });
  await collections.submissions.updateOne(
    { _id: localSubmissionId },
    buildSubmissionFailedUpdate(message, now),
  );
}
