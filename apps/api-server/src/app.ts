// 这个文件是 HTTP / HTML 层的装配入口。
// 具体页面和 JSON API 路由按领域拆在 routes/ 目录中。
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import formbody from '@fastify/formbody';
import view from '@fastify/view';
import Fastify from 'fastify';
import pug from 'pug';
import { OJSubmissionStatuses, type SubmissionCaseResult } from '@roj/shared';
import type { AppLanguage } from '@roj/shared';

import { createRouteContext } from './http/context.ts';
import { registerAdminRoutes } from './routes/admin.ts';
import { registerAuthRoutes } from './routes/auth.ts';
import { registerMiscRoutes } from './routes/misc.ts';
import { registerProblemRoutes } from './routes/problems.ts';
import { registerProblemSetRoutes } from './routes/problem-sets.ts';
import { registerProfileRoutes } from './routes/profile.ts';
import { registerStaticRoutes } from './routes/static.ts';
import { registerSubmissionRoutes } from './routes/submissions.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface CreateSubmissionResult {
  id: string;
  publicId: string;
  submissionNo: number | null;
  status: string;
  verdict: string;
}

export interface ProblemViewModel {
  pid: string;
  title: string;
  statementMarkdown: string;
  statementHtml: string;
  allowLanguages: string[];
}

export type ProblemProgress = 'accepted' | 'attempted';

export interface ProblemListViewModel extends ProblemViewModel {
  progress: ProblemProgress | null;
}

export interface ProblemSetListViewModel {
  id: string;
  title: string;
  problemRefs: string[];
  isPublished: boolean;
  publishedAtText: string | null;
  updatedAtText: string;
}

export interface ProblemSetProblemRefViewModel {
  pid: string;
  title: string;
  href: string | null;
  status: 'accepted' | 'empty';
  missing: boolean;
}

export interface ProblemSetDetailViewModel extends ProblemSetListViewModel {
  contentMarkdown: string;
  contentHtml: string;
  problemRefsView: ProblemSetProblemRefViewModel[];
}

export interface AdminProblemSetViewModel extends ProblemSetListViewModel {
  contentMarkdown: string;
}

export interface LanguageSettingsViewModel {
  enabledLanguages: AppLanguage[];
}

export interface SessionUser {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export interface SubmissionViewModel {
  id: string;
  publicId: string;
  submissionNo: number | null;
  userId: string;
  pid: string;
  problemTitle: string;
  problemLabel: string;
  username: string;
  displayName: string | undefined;
  language: string;
  sourceCode: string;
  status: string;
  verdict: string;
  score: number;
  judgeStatus?: string | null;
  message?: string;
  caseResults: SubmissionCaseResult[];
}

export interface PaginationViewModel {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  previousPage: number | null;
  nextPage: number | null;
}

export interface PaginatedSubmissionsViewModel {
  submissions: SubmissionViewModel[];
  pagination: PaginationViewModel;
}

export interface GradeViewModel {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface RanklistEntryViewModel {
  rank: number;
  username: string;
  acceptedCount: number;
  submissionCount: number;
  lastAcceptedAt: string | null;
}

export interface ContestViewModel {
  id: string;
  title: string;
  status: string;
  startAtText: string;
  endAtText: string;
  description: string;
}

export interface AdminProblemViewModel extends ProblemViewModel {
  id: string;
  isVisible: boolean;
}

export interface ApiServerServices {
  createSubmission(input: {
    userId: string;
    pid: string;
    language: 'cpp' | 'python';
    sourceCode: string;
  }): Promise<CreateSubmissionResult>;
  listProblems(): Promise<ProblemViewModel[]>;
  listProblemsByPids(pids: string[]): Promise<ProblemViewModel[]>;
  listProblemProgressByUser(userId: string): Promise<Map<string, ProblemProgress>>;
  getProblemByPid(pid: string): Promise<ProblemViewModel | null>;
  listPublishedProblemSets(): Promise<ProblemSetListViewModel[]>;
  getPublishedProblemSetById(id: string): Promise<ProblemSetDetailViewModel | null>;
  listAdminProblemSets(): Promise<AdminProblemSetViewModel[]>;
  getAdminProblemSetById(id: string): Promise<AdminProblemSetViewModel | null>;
  createProblemSet(input: {
    title: string;
    contentMarkdown: string;
  }): Promise<{ id: string }>;
  updateProblemSet(id: string, input: {
    title: string;
    contentMarkdown: string;
  }): Promise<void>;
  publishProblemSet(id: string): Promise<void>;
  getSubmissionById(id: string): Promise<SubmissionViewModel | null>;
  listSubmissions(user: SessionUser, pagination: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedSubmissionsViewModel>;
  registerUser(input: {
    username: string;
    name: string;
    gender: 'male' | 'female';
    className: string;
    grade: string;
    password: string;
  }): Promise<{
    id: string;
    username: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
  }>;
  loginUser(input: {
    username: string;
    password: string;
  }): Promise<{
    token: string;
    user: SessionUser;
  }>;
  logoutUser(token: string | null): Promise<void>;
  getCurrentUser(token: string | null): Promise<SessionUser | null>;
  listAdminUsers(): Promise<Array<SessionUser & { name?: string }>>;
  approveUser(userId: string, adminUserId: string): Promise<void>;
  rejectUser(userId: string, adminUserId: string, reason?: string): Promise<void>;
  listAdminSubmissions(pagination: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedSubmissionsViewModel>;
  listRanklist(): Promise<RanklistEntryViewModel[]>;
  listContests(): Promise<ContestViewModel[]>;
  getContestById(id: string): Promise<ContestViewModel | null>;
  listGrades(): Promise<GradeViewModel[]>;
  createGrade(input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<GradeViewModel>;
  updateGrade(id: string, input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<void>;
  getEnabledLanguages(): Promise<readonly AppLanguage[]>;
  updateEnabledLanguages(enabledLanguages: AppLanguage[]): Promise<void>;
  listAdminProblems(): Promise<AdminProblemViewModel[]>;
  getAdminProblemById(id: string): Promise<AdminProblemViewModel | null>;
  createProblem(input: {
    pid: string;
    title: string;
    statementMarkdown: string;
    allowLanguages: Array<'cpp' | 'python'>;
    isVisible: boolean;
  }): Promise<{ id: string; pid: string }>;
  updateProblem(id: string, input: {
    pid: string;
    title: string;
    statementMarkdown: string;
    allowLanguages: Array<'cpp' | 'python'>;
    isVisible: boolean;
  }): Promise<void>;
  publishProblem(id: string): Promise<void>;
  updateProfileClassName(userId: string, className: string): Promise<void>;
  resetUserPassword(userId: string, password: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  updateMyPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}

export function buildPaginationViewModel(input: {
  page: number;
  pageSize: number;
  total: number;
}): PaginationViewModel {
  const totalPages = Math.max(1, Math.ceil(input.total / input.pageSize));
  const page = Math.min(Math.max(input.page, 1), totalPages);

  return {
    page,
    pageSize: input.pageSize,
    total: input.total,
    totalPages,
    previousPage: page > 1 ? page - 1 : null,
    nextPage: page < totalPages ? page + 1 : null,
  };
}

export function buildApp(services: ApiServerServices) {
  const app = Fastify();

  void app.register(formbody);
  void app.register(view, {
    engine: {
      pug,
    },
    root: path.join(__dirname, 'views'),
  });

  const context = createRouteContext(services);

  registerStaticRoutes(app, context);
  registerMiscRoutes(app, context);
  registerAuthRoutes(app, context);
  registerProfileRoutes(app, context);
  registerAdminRoutes(app, context);
  registerProblemRoutes(app, context);
  registerProblemSetRoutes(app, context);
  registerSubmissionRoutes(app, context);

  return app;
}

// 页面层判断 submission 是否终态时，只关心 OJ 自己的状态。
export function isSubmissionTerminal(status: string) {
  return (
    status === OJSubmissionStatuses.FINISHED ||
    status === OJSubmissionStatuses.FAILED
  );
}
