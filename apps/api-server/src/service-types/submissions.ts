import type { SubmissionCaseResult } from '@roj/shared';

import type { PaginationViewModel } from './common.ts';
import type { SessionUser } from './users.ts';

export interface CreateSubmissionResult {
  id: string;
  publicId: string;
  submissionNo: number | null;
  status: string;
  verdict: string;
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

export interface PaginatedSubmissionsViewModel {
  submissions: SubmissionViewModel[];
  pagination: PaginationViewModel;
  filters?: SubmissionListFilters;
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
