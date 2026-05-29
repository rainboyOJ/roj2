import type { SubmissionCaseResult } from '@roj/shared';

import type {
  AdminProblemSetViewModel,
  AdminProblemViewModel,
  PaginatedSubmissionsViewModel,
  ProblemSetDetailViewModel,
  ProblemSetListViewModel,
  ProblemViewModel,
  SessionUser,
  SubmissionViewModel,
} from '../service-types.ts';
import { buildPaginationViewModel } from './pagination.ts';

// 这一组 map* 函数的作用，是把 DB 文档转换成前端视图模型。
// 这样 HTTP 层不需要直接依赖 MongoDB 文档的完整结构。
export function mapProblem(problem: {
  pid: string;
  title: string;
  statementMarkdown: string;
  statementHtml?: string;
  allowLanguages: string[];
}): ProblemViewModel {
  return {
    pid: problem.pid,
    title: problem.title,
    statementMarkdown: problem.statementMarkdown,
    statementHtml: problem.statementHtml ?? '',
    allowLanguages: problem.allowLanguages,
  };
}

export function mapAdminProblem(problem: {
  _id: string;
  pid: string;
  title: string;
  statementMarkdown: string;
  statementHtml?: string;
  allowLanguages: string[];
  isVisible: boolean;
}): AdminProblemViewModel {
  return {
    id: problem._id,
    pid: problem.pid,
    title: problem.title,
    statementMarkdown: problem.statementMarkdown,
    statementHtml: problem.statementHtml ?? '',
    allowLanguages: problem.allowLanguages,
    isVisible: problem.isVisible,
  };
}

export function formatDateTime(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 16).replace('T', ' ');
}

export function mapProblemSetBase(problemSet: {
  _id: string;
  title: string;
  problemRefs: string[];
  isPublished: boolean;
  publishedAt: Date | null;
  updatedAt: Date;
}): ProblemSetListViewModel {
  return {
    id: problemSet._id,
    title: problemSet.title,
    problemRefs: problemSet.problemRefs,
    isPublished: problemSet.isPublished,
    publishedAtText: formatDateTime(problemSet.publishedAt),
    updatedAtText: formatDateTime(problemSet.updatedAt) ?? '',
  };
}

export function mapAdminProblemSet(problemSet: Parameters<typeof mapProblemSetBase>[0] & {
  contentMarkdown: string;
}): AdminProblemSetViewModel {
  return {
    ...mapProblemSetBase(problemSet),
    contentMarkdown: problemSet.contentMarkdown,
  };
}

export function mapProblemSetDetail(problemSet: Parameters<typeof mapProblemSetBase>[0] & {
  contentMarkdown: string;
  contentHtml: string;
}): ProblemSetDetailViewModel {
  return {
    ...mapProblemSetBase(problemSet),
    contentMarkdown: problemSet.contentMarkdown,
    contentHtml: problemSet.contentHtml,
    problemRefsView: [],
  };
}

export function mapSubmission(submission: {
  _id: string;
  submissionNo?: number;
  userId: string;
  pid: string;
  problem?: {
    title: string;
  } | null;
  username: string;
  displayName?: string;
  language: string;
  sourceCode: string;
  status: string;
  verdict: string;
  score?: number;
  judge: {
    lastStatus: string | null;
  };
  result: {
    message: string;
    caseResults: SubmissionCaseResult[];
    score?: number;
  };
}, options: {
  canViewSourceCode?: boolean;
} = {}): SubmissionViewModel {
  const problemTitle = submission.problem?.title ?? submission.pid;
  const problemLabel = problemTitle.startsWith(submission.pid)
    ? problemTitle
    : `${submission.pid} ${problemTitle}`;
  const submissionNo = submission.submissionNo ?? null;
  const publicId = submissionNo === null ? submission._id : String(submissionNo);
  const canViewSourceCode = options.canViewSourceCode ?? true;

  return {
    id: submission._id,
    publicId,
    submissionNo,
    userId: submission.userId,
    pid: submission.pid,
    problemTitle,
    problemLabel,
    username: submission.username,
    displayName: submission.displayName,
    language: submission.language,
    sourceCode: canViewSourceCode ? submission.sourceCode : '',
    status: submission.status,
    verdict: submission.verdict,
    score: submission.score ?? submission.result.score ?? 0,
    judgeStatus: submission.judge.lastStatus,
    message: submission.result.message,
    caseResults: submission.result.caseResults,
    canViewSourceCode,
  };
}

export function mapSessionUser(user: {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  name?: string;
  grade?: string;
  className?: string;
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    approvalStatus: user.approvalStatus,
    name: user.name,
    grade: user.grade,
    className: user.className,
  };
}

export function mapAdminUser(user: {
  _id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  name?: string;
  grade?: string;
  className?: string;
}) {
  return {
    id: user._id,
    username: user.username,
    role: user.role,
    approvalStatus: user.approvalStatus,
    name: user.name,
    grade: user.grade,
    className: user.className,
  };
}

export function mapPaginatedSubmissions(input: {
  items: Array<Parameters<typeof mapSubmission>[0]>;
  total: number;
}, page: number, pageSize: number, user?: SessionUser): PaginatedSubmissionsViewModel {
  return {
    submissions: input.items.map((submission) =>
      mapSubmission(submission, {
        canViewSourceCode: user ? user.role === 'admin' || submission.userId === user.id : true,
      }),
    ),
    pagination: buildPaginationViewModel({
      page,
      pageSize,
      total: input.total,
    }),
  };
}
