import type { AppLanguage } from './languages.ts';

export const OJSubmissionStatuses = {
  PENDING_DISPATCH: 'PENDING_DISPATCH',
  SENT_TO_JUDGE: 'SENT_TO_JUDGE',
  JUDGING: 'JUDGING',
  FINISHED: 'FINISHED',
  FAILED: 'FAILED',
} as const;

// OJ 自己的提交状态。
// 等价 : type OJSubmissionStatus = 'PENDING_DISPATCH' | 'SENT_TO_JUDGE' | 'JUDGING' | 'FINISHED' | 'FAILED';
export type OJSubmissionStatus =
  (typeof OJSubmissionStatuses)[keyof typeof OJSubmissionStatuses];

// 提交最终判定。
export const SubmissionVerdicts = {
  PENDING: 'PENDING',
  AC: 'AC',
  WA: 'WA',
  TLE: 'TLE',
  MLE: 'MLE',
  RE: 'RE',
  OLE: 'OLE',
  PE: 'PE',
  CE: 'CE',
  UNKNOWN: 'UNKNOWN',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
} as const;

// 等价 : type SubmissionVerdict = 'PENDING' | 'AC' | 'WA' | 'TLE' | 'MLE' | 'RE' | 'OLE' | 'PE' | 'CE' | 'UNKNOWN' | 'SYSTEM_ERROR';
export type SubmissionVerdict =
  (typeof SubmissionVerdicts)[keyof typeof SubmissionVerdicts];

// 用于状态映射的最小 judge 快照。
export interface JudgeSnapshotLike {
  status: string;
  verdict: string;
}

// judge_server 原始状态。
export const JudgeStatuses = {
  QUEUED: 'QUEUED',
  PREPARING: 'PREPARING',
  COMPILING: 'COMPILING',
  RUNNING: 'RUNNING',
  FINISHED: 'FINISHED',
  FAILED: 'FAILED',
} as const;

// 等价 : type JudgeStatus = 'QUEUED' | 'PREPARING' | 'COMPILING' | 'RUNNING' | 'FINISHED' | 'FAILED';
export type JudgeStatus = (typeof JudgeStatuses)[keyof typeof JudgeStatuses];

// 单个测试点结果，字段基本对齐 judge_server 的 case_results。
export interface SubmissionCaseResult {
  seq_id: number;
  verdict: string;
  cpu_time_ms: number;
  real_time_ms: number;
  memory_kb: number;
  signal: number;
  exit_code: number;
  error_code: number;
}

// submission 中与 judge 交互相关的状态，主要由 dispatcher 维护。
export interface SubmissionJudgeState {
  submissionId: number | null;
  lastStatus: string | null;
  lastMessage: string | null;
  retryCount: number;
  leaseOwner: string | null;
  leaseExpireAt: Date | null;
  lastPolledAt: Date | null;
  ackAt: Date | null;
  finishedAt: Date | null;
}

// submission 中最终展示给页面的结果字段。
export interface SubmissionResultState {
  caseResults: SubmissionCaseResult[];
  message: string;
  score: number;
}

// submissions 集合核心文档。
// `judge` 保存评测过程状态，`result` 保存最终展示结果。
export interface SubmissionDocument {
  _id: string;
  submissionNo?: number;
  userId: string;
  problemId: string;
  pid: string;
  username: string;
  displayName: string;
  language: AppLanguage;
  sourceCode: string;
  status: OJSubmissionStatus;
  verdict: string;
  score: number;
  judge: SubmissionJudgeState;
  result: SubmissionResultState;
  createdAt: Date;
  updatedAt: Date;
}

// 创建 submission 时需要的最小输入，剩余字段会在 DB 层补全。
export interface CreateSubmissionInput {
  userId: string;
  pid: string;
  language: AppLanguage;
  sourceCode: string;
}

// 判断 judge 侧状态是否已经终止。
export function isTerminalJudgeStatus(status: string): boolean {
  return status === JudgeStatuses.FINISHED || status === JudgeStatuses.FAILED;
}

// 把 judge 快照映射成 OJ 内部状态。
export function mapJudgeSnapshotToSubmissionState(snapshot: JudgeSnapshotLike): {
  status: OJSubmissionStatus;
  verdict: string;
} {
  if (snapshot.status === 'FAILED') {
    return {
      status: OJSubmissionStatuses.FAILED,
      verdict: snapshot.verdict,
    };
  }

  if (snapshot.status !== 'FINISHED') {
    return {
      status: OJSubmissionStatuses.JUDGING,
      verdict: snapshot.verdict,
    };
  }

  return {
    status: OJSubmissionStatuses.FINISHED,
    verdict: snapshot.verdict,
  };
}

// 新 submission 的默认 judge 状态。
export function createEmptyJudgeState(): SubmissionJudgeState {
  return {
    submissionId: null,
    lastStatus: null,
    lastMessage: null,
    retryCount: 0,
    leaseOwner: null,
    leaseExpireAt: null,
    lastPolledAt: null,
    ackAt: null,
    finishedAt: null,
  };
}

// 新 submission 的默认结果状态。
export function createEmptyResultState(): SubmissionResultState {
  return {
    caseResults: [],
    message: '',
    score: 0,
  };
}
