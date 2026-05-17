import { setTimeout as delay } from 'node:timers/promises';

import { RojDb } from '@roj/db';
import {
  JudgeStatuses,
  isTerminalJudgeStatus,
  type AppLanguage,
} from '@roj/shared';

export interface SubmissionForDispatch {
  id: string;
  pid: string;
  language: AppLanguage;
  sourceCode: string;
}

export interface JudgeClientLike {
  submit(submission: SubmissionForDispatch): Promise<unknown>;
  queryResult(submissionId: number): Promise<unknown>;
}

export interface DispatcherStoreLike {
  saveAck(ack: unknown): Promise<void>;
  saveSnapshot(snapshot: { status: string; verdict: string }): Promise<void>;
}

function isTerminalSnapshot(snapshot: { status: string }) {
  return snapshot.status === 'FINISHED' || snapshot.status === 'FAILED';
}

export async function processSubmissionWithClient(
  submission: SubmissionForDispatch,
  client: {
    submit(submission: SubmissionForDispatch): Promise<{
      submission_id: number;
    }>;
    queryResult(submissionId: number): Promise<{
      status: string;
      verdict: string;
    }>;
  },
  store: DispatcherStoreLike,
) {
  const ack = await client.submit(submission);
  await store.saveAck(ack);
  let final = await client.queryResult(ack.submission_id);
  await store.saveSnapshot(final);

  while (!isTerminalSnapshot(final)) {
    final = await client.queryResult(ack.submission_id);
    await store.saveSnapshot(final);
  }

  return { ack, final };
}

export interface DispatcherRuntimeOptions {
  db: RojDb;
  client: {
    submit(input: {
      uuid: number;
      pid: string;
      lang: number;
      code: string;
    }): Promise<{
      submission_id: number;
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
    }>;
    queryResult(submissionId: number): Promise<{
      submission_id: number;
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
    }>;
  };
  leaseOwner: string;
  leaseMs: number;
  idleDelayMs: number;
  pollDelayMs: number;
}

export function appLanguageToJudgeLanguage(language: AppLanguage): number {
  if (language === 'cpp') {
    return 0;
  }
  return 2;
}

export async function processClaimedSubmission(
  options: DispatcherRuntimeOptions,
  submission: SubmissionForDispatch,
) {
  const ack = await options.client.submit({
    uuid: Date.now(),
    pid: submission.pid,
    lang: appLanguageToJudgeLanguage(submission.language),
    code: submission.sourceCode,
  });

  await options.db.saveJudgeAck(submission.id, {
    submissionId: ack.submission_id,
    status: ack.status,
    verdict: ack.verdict,
    message: ack.message,
    case_results: ack.case_results,
  });

  while (true) {
    await delay(options.pollDelayMs);
    const snapshot = await options.client.queryResult(ack.submission_id);

    await options.db.saveJudgeSnapshot(submission.id, {
      submissionId: snapshot.submission_id,
      status: snapshot.status,
      verdict: snapshot.verdict,
      message: snapshot.message,
      case_results: snapshot.case_results,
    });

    if (isTerminalJudgeStatus(snapshot.status)) {
      return snapshot;
    }
  }
}

export async function runDispatcherLoop(options: DispatcherRuntimeOptions) {
  while (true) {
    const claimed = await options.db.claimPendingSubmission(
      options.leaseOwner,
      options.leaseMs,
    );

    if (!claimed) {
      await delay(options.idleDelayMs);
      continue;
    }

    try {
      await processClaimedSubmission(options, {
        id: claimed._id,
        pid: claimed.pid,
        language: claimed.language,
        sourceCode: claimed.sourceCode,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await options.db.markSubmissionFailed(claimed._id, message);
    }
  }
}
