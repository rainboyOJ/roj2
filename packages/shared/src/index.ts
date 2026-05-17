export const OJSubmissionStatuses = {
  PENDING_DISPATCH: 'PENDING_DISPATCH',
  SENT_TO_JUDGE: 'SENT_TO_JUDGE',
  JUDGING: 'JUDGING',
  FINISHED: 'FINISHED',
  FAILED: 'FAILED',
} as const;

export type OJSubmissionStatus =
  (typeof OJSubmissionStatuses)[keyof typeof OJSubmissionStatuses];

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

export type SubmissionVerdict =
  (typeof SubmissionVerdicts)[keyof typeof SubmissionVerdicts];

export interface JudgeSnapshotLike {
  status: string;
  verdict: string;
}

export const JudgeStatuses = {
  QUEUED: 'QUEUED',
  PREPARING: 'PREPARING',
  COMPILING: 'COMPILING',
  RUNNING: 'RUNNING',
  FINISHED: 'FINISHED',
  FAILED: 'FAILED',
} as const;

export type JudgeStatus = (typeof JudgeStatuses)[keyof typeof JudgeStatuses];

export const LanguageLabels = {
  cpp: 'cpp',
  python: 'python',
} as const;

export type AppLanguage = keyof typeof LanguageLabels;

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

export interface UserDocument {
  _id: string;
  username: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  className: string;
  grade: string;
  passwordHash: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GradeDocument {
  _id: string;
  name: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionDocument {
  _id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProblemDocument {
  _id: string;
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: AppLanguage[];
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface SubmissionResultState {
  caseResults: SubmissionCaseResult[];
  message: string;
}

export interface SubmissionDocument {
  _id: string;
  userId: string;
  problemId: string;
  pid: string;
  username: string;
  displayName: string;
  language: AppLanguage;
  sourceCode: string;
  status: OJSubmissionStatus;
  verdict: string;
  judge: SubmissionJudgeState;
  result: SubmissionResultState;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubmissionInput {
  userId: string;
  pid: string;
  language: AppLanguage;
  sourceCode: string;
}

export function isTerminalJudgeStatus(status: string): boolean {
  return status === JudgeStatuses.FINISHED || status === JudgeStatuses.FAILED;
}

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

export function createEmptyResultState(): SubmissionResultState {
  return {
    caseResults: [],
    message: '',
  };
}
