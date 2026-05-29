import type { AppLanguage } from './languages.ts';

export const ProblemProgressStatuses = {
  ATTEMPTED: 'attempted',
  ACCEPTED: 'accepted',
} as const;

export type ProblemProgressStatus =
  (typeof ProblemProgressStatuses)[keyof typeof ProblemProgressStatuses];

// user_problem_progress 集合保存用户在每道题上的当前做题状态。
export interface UserProblemProgressDocument {
  _id: string;
  userId: string;
  pid: string;
  status: ProblemProgressStatus;
  updatedAt: Date;
}

// counters 集合用于生成对外展示的自增编号。
export interface CounterDocument {
  _id: string;
  value: number;
  updatedAt: Date;
}

// problems 集合文档，只存题面与元数据，不存测试数据目录。
export interface ProblemDocument {
  _id: string;
  pid: string;
  title: string;
  statementMarkdown: string;
  statementHtml: string;
  allowLanguages: AppLanguage[];
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// problem_sets 集合保存管理员发布的题目单。
export interface ProblemSetDocument {
  _id: string;
  title: string;
  contentMarkdown: string;
  contentHtml: string;
  problemRefs: string[];
  isPublished: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
