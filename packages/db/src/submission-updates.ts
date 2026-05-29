import {
  OJSubmissionStatuses,
  SubmissionVerdicts,
  mapJudgeSnapshotToSubmissionState,
} from '@roj/shared';

import { calculateSubmissionScore } from './submission-scoring.ts';

// 持久化 judge 返回快照时使用的输入结构。
export interface JudgeSnapshotPersistInput {
  submissionId: number;
  status: string;
  verdict: string;
  message: string;
  case_results: Array<{
    seq_id: number;
    verdict: string;
    cpu_time_ms: number;
    real_time_ms: number;
    memory_kb: number;
    signal: number;
    exit_code: number;
    error_code: number;
  }>;
}

export function buildJudgeAckUpdate(ack: JudgeSnapshotPersistInput, now: Date) {
  return {
    $set: {
      status: OJSubmissionStatuses.JUDGING,
      verdict: ack.verdict,
      score: 0,
      'judge.submissionId': ack.submissionId,
      'judge.lastStatus': ack.status,
      'judge.lastMessage': ack.message,
      'judge.ackAt': now,
      updatedAt: now,
    },
  };
}

export function buildJudgeSnapshotUpdate(snapshot: JudgeSnapshotPersistInput, now: Date) {
  const mapped = mapJudgeSnapshotToSubmissionState(snapshot);
  const score = calculateSubmissionScore(snapshot.case_results);
  const finished =
    mapped.status === OJSubmissionStatuses.FINISHED ||
    mapped.status === OJSubmissionStatuses.FAILED;

  return {
    mapped,
    score,
    update: {
      $set: {
        status: mapped.status,
        verdict: mapped.verdict,
        score,
        'judge.lastStatus': snapshot.status,
        'judge.lastMessage': snapshot.message,
        'judge.lastPolledAt': now,
        'judge.finishedAt': finished ? now : null,
        'result.caseResults': snapshot.case_results,
        'result.message': snapshot.message,
        'result.score': score,
        updatedAt: now,
      },
    },
  };
}

export function buildClearSubmissionLeaseUpdate() {
  return {
    $set: {
      'judge.leaseOwner': null,
      'judge.leaseExpireAt': null,
    },
  };
}

export function buildSubmissionFailedUpdate(message: string, now: Date) {
  return {
    $set: {
      status: OJSubmissionStatuses.FAILED,
      verdict: SubmissionVerdicts.SYSTEM_ERROR,
      score: 0,
      'judge.lastStatus': 'FAILED',
      'judge.lastMessage': message,
      'judge.finishedAt': now,
      'judge.leaseOwner': null,
      'judge.leaseExpireAt': null,
      'result.message': message,
      'result.score': 0,
      updatedAt: now,
    },
    $inc: {
      'judge.retryCount': 1,
    },
  };
}
