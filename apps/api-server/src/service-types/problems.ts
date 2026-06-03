import type { PaginationViewModel } from './common.ts';

export interface ProblemViewModel {
  pid: string;
  title: string;
  statementMarkdown: string;
  statementHtml: string;
  allowLanguages: string[];
}

export type ProblemProgress = 'accepted' | 'attempted';
export type ProblemListProgressFilter = 'accepted' | 'attempted' | 'empty';

export interface ProblemListFilters {
  q?: string;
  progress?: ProblemListProgressFilter;
}

export interface ProblemListQueryFilters {
  q?: string;
  pidIn?: string[];
  pidNin?: string[];
}

export interface ProblemListViewModel extends ProblemViewModel {
  progress: ProblemProgress | null;
}

export interface PaginatedProblemsViewModel {
  problems: ProblemListViewModel[];
  pagination: PaginationViewModel;
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
    filters?: ProblemListQueryFilters;
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
