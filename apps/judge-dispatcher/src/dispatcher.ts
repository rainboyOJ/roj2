// 这个文件实现“后台评测循环”。
// 提交流程在这里真正闭环：
// MongoDB claim 任务 -> 发给 judge_server -> 轮询结果 -> 写回 MongoDB。
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

// 这是给测试辅助函数用的本地判断，不依赖 shared 包里的完整类型。
function isTerminalSnapshot(snapshot: { status: string }) {
  return snapshot.status === 'FINISHED' || snapshot.status === 'FAILED';
}

// 这个函数主要服务于单元测试：
// 给它一个假的 client 和假的 store，就可以只测“调度编排逻辑”。
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

  // 先查一次结果，再按需继续轮询，便于测试覆盖 ack -> update -> final 这条链路。
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
  // 当前 judge_server 的语言编号来自既有协议：
  // cpp -> 0, python -> 2
  if (language === 'cpp') {
    return 0;
  }
  return 2;
}

// 处理一条已经被当前 worker 抢到的 submission。
// 它会把本地 submission 转成 judge 协议格式，并持续把快照写回数据库。
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
    // 轮询间隔由环境变量控制，避免对 judge_server 打太密。
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

// dispatcher 主循环。
// 没有任务就 sleep；有任务就 claim；claim 成功后串行处理当前 submission。
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
      // 当前最小实现是“一个循环一次只处理一条任务”，逻辑更直白，便于学习。
      await processClaimedSubmission(options, {
        id: claimed._id,
        pid: claimed.pid,
        language: claimed.language,
        sourceCode: claimed.sourceCode,
      });
    } catch (error) {
      // judge 网络错误、协议错误等都会被折叠成 FAILED，保证页面能看到终态。
      const message = error instanceof Error ? error.message : String(error);
      await options.db.markSubmissionFailed(claimed._id, message);
    }
  }
}
