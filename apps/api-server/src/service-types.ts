import type { AppLanguage, SubmissionCaseResult } from '@roj/shared';

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

export interface PaginatedProblemsViewModel {
  problems: ProblemListViewModel[];
  pagination: PaginationViewModel;
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

export interface PaginationSettingsViewModel {
  listPageSize: number;
  allowedPageSizes: number[];
}

export interface SessionUser {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  name?: string | undefined;
  grade?: string | undefined;
  className?: string | undefined;
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
  canViewSourceCode: boolean;
}

export interface SubmissionListFilters {
  pid?: string;
  user?: string;
  language?: string;
}

export interface AdminUserListFilters {
  q?: string;
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
  filters?: SubmissionListFilters;
}

export interface PaginatedAdminUsersViewModel {
  users: SessionUser[];
  pagination: PaginationViewModel;
  filters?: AdminUserListFilters;
}

export interface GradeViewModel {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface ClassViewModel {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface RanklistEntryViewModel {
  rank: number;
  username: string;
  displayName: string;
  className?: string | undefined;
  acceptedCount: number;
  submissionCount: number;
  lastAcceptedAt: string | null;
}

export interface RanklistFilters {
  className?: string;
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

export interface AdminProblemListFilters {
  q?: string;
  visibility?: 'visible' | 'hidden';
}

export interface ProblemServices {
  listProblems(): Promise<ProblemViewModel[]>;
  listProblemsPaginated(pagination: {
    page: number;
    pageSize: number;
  }): Promise<{
    problems: ProblemViewModel[];
    pagination: PaginationViewModel;
  }>;
  listProblemsByPids(pids: string[]): Promise<ProblemViewModel[]>;
  listProblemProgressByUser(userId: string): Promise<Map<string, ProblemProgress>>;
  getProblemByPid(pid: string): Promise<ProblemViewModel | null>;
  listAdminProblems(filters?: AdminProblemListFilters): Promise<AdminProblemViewModel[]>;
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
}

export interface ProblemSetServices {
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
  hideProblemSet(id: string): Promise<void>;
  deleteProblemSet(id: string): Promise<void>;
}

export interface SubmissionServices {
  createSubmission(input: {
    userId: string;
    pid: string;
    language: 'cpp' | 'python';
    sourceCode: string;
  }): Promise<CreateSubmissionResult>;
  getSubmissionById(id: string): Promise<SubmissionViewModel | null>;
  listSubmissions(user: SessionUser, pagination: {
    page: number;
    pageSize: number;
  }, filters?: SubmissionListFilters): Promise<PaginatedSubmissionsViewModel>;
  listAdminSubmissions(pagination: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedSubmissionsViewModel>;
}

export interface UserServices {
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
  listAdminUsers(): Promise<SessionUser[]>;
  listAdminUsersPaginated(pagination: {
    page: number;
    pageSize: number;
  }, filters?: AdminUserListFilters): Promise<PaginatedAdminUsersViewModel>;
  approveUser(userId: string, adminUserId: string): Promise<void>;
  rejectUser(userId: string, adminUserId: string, reason?: string): Promise<void>;
  updateProfileClassName(userId: string, className: string): Promise<void>;
  resetUserPassword(userId: string, password: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  updateMyPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}

export interface DictionaryServices {
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
  listClasses(): Promise<ClassViewModel[]>;
  listActiveClasses(): Promise<ClassViewModel[]>;
  createClass(input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<ClassViewModel>;
  updateClass(id: string, input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<void>;
}

export interface SettingsServices {
  getEnabledLanguages(): Promise<readonly AppLanguage[]>;
  updateEnabledLanguages(enabledLanguages: AppLanguage[]): Promise<void>;
  getPaginationSettings(): Promise<PaginationSettingsViewModel>;
  updateListPageSize(listPageSize: number): Promise<void>;
}

export interface RanklistServices {
  listRanklist(filters?: RanklistFilters): Promise<RanklistEntryViewModel[]>;
}

export interface ContestServices {
  listContests(): Promise<ContestViewModel[]>;
  getContestById(id: string): Promise<ContestViewModel | null>;
}

export interface ApiServerServices
  extends ProblemServices,
    ProblemSetServices,
    SubmissionServices,
    UserServices,
    DictionaryServices,
    SettingsServices,
    RanklistServices,
    ContestServices {}
