import { describe, expect, it } from 'vitest';

import {
  buildClearSubmissionLeaseUpdate,
  buildJudgeAckUpdate,
  buildJudgeSnapshotUpdate,
  buildSubmissionFailedUpdate,
} from '../src/index.ts';

const now = new Date('2026-05-29T12:00:00.000Z');

describe('submission judge update builders', () => {
  it('builds judge ack updates', () => {
    const update = buildJudgeAckUpdate({
      submissionId: 42,
      status: 'QUEUED',
      verdict: 'PENDING',
      message: 'accepted',
      case_results: [],
    }, now);

    expect(update.$set).toMatchObject({
      status: 'JUDGING',
      verdict: 'PENDING',
      score: 0,
      'judge.submissionId': 42,
      'judge.lastStatus': 'QUEUED',
      'judge.lastMessage': 'accepted',
      'judge.ackAt': now,
      updatedAt: now,
    });
  });

  it('builds finished snapshot updates with score and finish time', () => {
    const result = buildJudgeSnapshotUpdate({
      submissionId: 42,
      status: 'FINISHED',
      verdict: 'WA',
      message: 'done',
      case_results: [
        {
          seq_id: 1,
          verdict: 'AC',
          cpu_time_ms: 1,
          real_time_ms: 1,
          memory_kb: 1,
          signal: 0,
          exit_code: 0,
          error_code: 0,
        },
        {
          seq_id: 2,
          verdict: 'WA',
          cpu_time_ms: 1,
          real_time_ms: 1,
          memory_kb: 1,
          signal: 0,
          exit_code: 0,
          error_code: 0,
        },
      ],
    }, now);

    expect(result.mapped).toEqual({ status: 'FINISHED', verdict: 'WA' });
    expect(result.score).toBe(50);
    expect(result.update.$set).toMatchObject({
      status: 'FINISHED',
      verdict: 'WA',
      score: 50,
      'judge.lastStatus': 'FINISHED',
      'judge.lastMessage': 'done',
      'judge.finishedAt': now,
      'result.message': 'done',
      'result.score': 50,
      updatedAt: now,
    });
  });

  it('builds lease cleanup and failed updates', () => {
    expect(buildClearSubmissionLeaseUpdate()).toEqual({
      $set: {
        'judge.leaseOwner': null,
        'judge.leaseExpireAt': null,
      },
    });

    expect(buildSubmissionFailedUpdate('network error', now)).toEqual({
      $set: {
        status: 'FAILED',
        verdict: 'SYSTEM_ERROR',
        score: 0,
        'judge.lastStatus': 'FAILED',
        'judge.lastMessage': 'network error',
        'judge.finishedAt': now,
        'judge.leaseOwner': null,
        'judge.leaseExpireAt': null,
        'result.message': 'network error',
        'result.score': 0,
        updatedAt: now,
      },
      $inc: {
        'judge.retryCount': 1,
      },
    });
  });
});
