// api-server 的入口文件。
// 这里做两件事：
// 1. 把数据库层封装成“页面/接口需要的 services”
// 2. 调 buildApp() 组装出真正的 Fastify 应用
import { RojDb } from '@roj/db';

import {
  buildApp,
  type AdminProblemViewModel,
  type ApiServerServices,
  type ContestViewModel,
  type ProblemViewModel,
  type RanklistEntryViewModel,
  type SessionUser,
  type SubmissionViewModel,
} from './app.ts';
import type { CreateSubmissionInput, SubmissionCaseResult } from '@roj/shared';

// 这一组 map* 函数的作用，是把 DB 文档转换成前端视图模型。
// 这样 app.ts 不需要直接依赖 MongoDB 文档的完整结构。
function mapProblem(problem: {
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

function mapAdminProblem(problem: {
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

function mapSubmission(submission: {
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
  judge: {
    lastStatus: string | null;
  };
  result: {
    message: string;
    caseResults: SubmissionCaseResult[];
  };
}): SubmissionViewModel {
  const problemTitle = submission.problem?.title ?? submission.pid;
  const problemLabel = problemTitle.startsWith(submission.pid)
    ? problemTitle
    : `${submission.pid} ${problemTitle}`;
  const submissionNo = submission.submissionNo ?? null;
  const publicId = submissionNo === null ? submission._id : String(submissionNo);

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
    sourceCode: submission.sourceCode,
    status: submission.status,
    verdict: submission.verdict,
    judgeStatus: submission.judge.lastStatus,
    message: submission.result.message,
    caseResults: submission.result.caseResults,
  };
}

function mapSessionUser(user: {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    approvalStatus: user.approvalStatus,
  };
}

function formatDateTime(value: Date | null): string | null {
  if (!value) {
    return null;
  }

  return value.toISOString().slice(0, 16).replace('T', ' ');
}

function buildPlaceholderContests(): ContestViewModel[] {
  // 比赛页目前还是占位实现，所以这里先直接返回内存中的假数据。
  return [
    {
      id: 'practice-may',
      title: 'May Practice Contest',
      status: 'Upcoming',
      startAtText: '2026-05-20 19:00',
      endAtText: '2026-05-20 21:00',
      description: 'A simple training contest for class practice.',
    },
    {
      id: 'weekly-ladder',
      title: 'Weekly Ladder',
      status: 'Open Practice',
      startAtText: 'Every Monday 18:00',
      endAtText: 'Every Sunday 22:00',
      description: 'A rolling ladder page used as a placeholder for future contest support.',
    },
  ];
}

export async function buildProductionServices(db: RojDb): Promise<ApiServerServices> {
  return {
    createSubmission: async (input: CreateSubmissionInput) => {
      // 注意：这里只写数据库，不直接等待评测结果。
      const created = await db.createSubmission(input);
      return {
        id: created._id,
        publicId: created.submissionNo === undefined ? created._id : String(created.submissionNo),
        submissionNo: created.submissionNo ?? null,
        status: created.status,
        verdict: created.verdict,
      };
    },
    listProblems: async () => {
      const problems = await db.listVisibleProblems();
      return problems.map(mapProblem);
    },
    getProblemByPid: async (pid: string) => {
      const problem = await db.getProblemByPid(pid);
      return problem ? mapProblem(problem) : null;
    },
    getSubmissionById: async (id: string) => {
      const submission = await db.getSubmissionWithProblemByPublicId(id);
      return submission ? mapSubmission(submission) : null;
    },
    listSubmissions: async (user) => {
      // 管理员看全站提交，学生只看自己的提交。
      const submissions =
        user.role === 'admin'
          ? await db.listAllSubmissionsWithProblems()
          : await db.listSubmissionsWithProblemsByUser(user.id);
      return submissions.map(mapSubmission);
    },
    registerUser: async (input) => {
      const user = await db.registerUser(input);
      return {
        id: user._id,
        username: user.username,
        approvalStatus: user.approvalStatus,
      };
    },
    loginUser: async (input) => {
      const user = await db.loginUser(input.username, input.password);
      if (!user) {
        throw new Error('invalid username or password');
      }

      const session = await db.createSession(user.id);
      return {
        token: session.token,
        user: mapSessionUser(user),
      };
    },
    logoutUser: async (token) => {
      await db.destroySession(token);
    },
    getCurrentUser: async (token) => {
      const user = await db.getUserBySessionToken(token);
      return user ? mapSessionUser(user) : null;
    },
    listAdminUsers: async () => {
      const users = await db.listUsersForAdmin();
      return users.map((user) => ({
        id: user._id,
        username: user.username,
        role: user.role,
        approvalStatus: user.approvalStatus,
        name: user.name,
      }));
    },
    approveUser: async (userId, adminUserId) => {
      await db.approveUser(userId, adminUserId);
    },
    rejectUser: async (userId, adminUserId, reason) => {
      await db.rejectUser(userId, adminUserId, reason);
    },
    listAdminSubmissions: async () => {
      const submissions = await db.listAllSubmissionsWithProblems();
      return submissions.map(mapSubmission);
    },
    listRanklist: async () => {
      const rows = await db.buildSimpleRanklist();
      return rows.map((row, index): RanklistEntryViewModel => ({
        rank: index + 1,
        username: row.username,
        acceptedCount: row.acceptedCount,
        submissionCount: row.submissionCount,
        lastAcceptedAt: formatDateTime(row.lastAcceptedAt),
      }));
    },
    listContests: async () => buildPlaceholderContests(),
    getContestById: async (id) => {
      const contests = buildPlaceholderContests();
      return contests.find((contest) => contest.id === id) ?? null;
    },
    listGrades: async () => {
      const grades = await db.listGrades();
      return grades.map((grade) => ({
        id: grade._id,
        name: grade.name,
        isActive: grade.isActive,
        order: grade.order,
      }));
    },
    createGrade: async (input) => {
      const grade = await db.createGrade(input);
      return {
        id: grade._id,
        name: grade.name,
        isActive: grade.isActive,
        order: grade.order,
      };
    },
    updateGrade: async (id, input) => {
      await db.updateGrade(id, input);
    },
    listAdminProblems: async () => {
      const problems = await db.listAdminProblems();
      return problems.map(mapAdminProblem);
    },
    getAdminProblemById: async (id) => {
      const problem = await db.getAdminProblemById(id);
      return problem ? mapAdminProblem(problem) : null;
    },
    createProblem: async (input) => {
      const problem = await db.createProblem(input);
      return {
        id: problem._id,
        pid: problem.pid,
      };
    },
    updateProblem: async (id, input) => {
      await db.updateProblem(id, input);
    },
    publishProblem: async (id) => {
      await db.publishProblem(id);
    },
    updateProfileClassName: async (userId, className) => {
      await db.updateUserClassName(userId, className);
    },
    resetUserPassword: async (userId, password) => {
      await db.resetUserPassword(userId, password);
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // 这里才是真正的生产启动逻辑：
  // 建 DB、建 services、建 Fastify、监听端口。
  const db = new RojDb({
    uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB ?? 'roj_demo',
  });

  await db.connect();
  await db.ensureIndexes();

  const services = await buildProductionServices(db);
  const app = buildApp(services);
  const port = Number(process.env.PORT ?? '3000');
  const host = process.env.HOST ?? '127.0.0.1';

  await app.listen({
    host,
    port,
  });

  console.log(`api-server listening on http://${host}:${port}`);
}

export * from './app.ts';
