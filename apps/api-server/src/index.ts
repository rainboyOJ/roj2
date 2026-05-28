// api-server 的入口文件。
// 这里做两件事：
// 1. 把数据库层封装成“页面/接口需要的 services”
// 2. 调 buildApp() 组装出真正的 Fastify 应用
import { RojDb } from '@roj/db';
import { ALLOWED_LIST_PAGE_SIZES } from '@roj/db';

import {
  buildApp,
  type AdminProblemViewModel,
  type ApiServerServices,
  type AdminProblemSetViewModel,
  type ContestViewModel,
  type PaginatedSubmissionsViewModel,
  type ProblemSetDetailViewModel,
  type ProblemSetListViewModel,
  type ProblemViewModel,
  type RanklistEntryViewModel,
  type SessionUser,
  type SubmissionViewModel,
  buildPaginationViewModel,
} from './app.ts';
import type { CreateSubmissionInput, SubmissionCaseResult } from '@roj/shared';
import type { AppLanguage } from '@roj/shared';

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

function mapProblemSetBase(problemSet: {
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

function mapAdminProblemSet(problemSet: Parameters<typeof mapProblemSetBase>[0] & {
  contentMarkdown: string;
}): AdminProblemSetViewModel {
  return {
    ...mapProblemSetBase(problemSet),
    contentMarkdown: problemSet.contentMarkdown,
  };
}

function mapProblemSetDetail(problemSet: Parameters<typeof mapProblemSetBase>[0] & {
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

function mapSessionUser(user: {
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

function mapAdminUser(user: {
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

function mapPaginatedSubmissions(input: {
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
    listProblemsPaginated: async (pagination) => {
      const result = await db.listVisibleProblemsPaginated(pagination);
      return {
        problems: result.items.map(mapProblem),
        pagination: buildPaginationViewModel({
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: result.total,
        }),
      };
    },
    listProblemsByPids: async (pids) => {
      const problems = await db.listVisibleProblemsByPids(pids);
      return problems.map(mapProblem);
    },
    listProblemProgressByUser: async (userId: string) => db.listProblemProgressByUser(userId),
    getProblemByPid: async (pid: string) => {
      const problem = await db.getProblemByPid(pid);
      return problem ? mapProblem(problem) : null;
    },
    listPublishedProblemSets: async () => {
      const problemSets = await db.listPublishedProblemSets();
      return problemSets.map(mapProblemSetBase);
    },
    getPublishedProblemSetById: async (id) => {
      const problemSet = await db.getPublishedProblemSetById(id);
      if (!problemSet) {
        return null;
      }
      return mapProblemSetDetail(problemSet);
    },
    listAdminProblemSets: async () => {
      const problemSets = await db.listAdminProblemSets();
      return problemSets.map(mapAdminProblemSet);
    },
    getAdminProblemSetById: async (id) => {
      const problemSet = await db.getAdminProblemSetById(id);
      return problemSet ? mapAdminProblemSet(problemSet) : null;
    },
    createProblemSet: async (input) => {
      const problemSet = await db.createProblemSet(input);
      return { id: problemSet._id };
    },
    updateProblemSet: async (id, input) => {
      await db.updateProblemSet(id, input);
    },
    publishProblemSet: async (id) => {
      await db.publishProblemSet(id);
    },
    getSubmissionById: async (id: string) => {
      const submission = await db.getSubmissionWithProblemByPublicId(id);
      return submission ? mapSubmission(submission) : null;
    },
    listSubmissions: async (user, pagination, filters = {}) => {
      const result = await db.listSubmissionsWithProblemsPaginated({
        ...pagination,
        filters,
      });
      return {
        ...mapPaginatedSubmissions(result, pagination.page, pagination.pageSize, user),
        filters,
      };
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
      return users.map(mapAdminUser);
    },
    listAdminUsersPaginated: async (pagination) => {
      const result = await db.listUsersForAdminPaginated(pagination);
      return {
        users: result.items.map(mapAdminUser),
        pagination: buildPaginationViewModel({
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: result.total,
        }),
      };
    },
    approveUser: async (userId, adminUserId) => {
      await db.approveUser(userId, adminUserId);
    },
    rejectUser: async (userId, adminUserId, reason) => {
      await db.rejectUser(userId, adminUserId, reason);
    },
    listAdminSubmissions: async (pagination) => {
      const result = await db.listAllSubmissionsWithProblemsPaginated(pagination);
      return mapPaginatedSubmissions(result, pagination.page, pagination.pageSize);
    },
    listRanklist: async (filters) => {
      const rows = await db.buildSimpleRanklist(filters);
      return rows.map((row, index): RanklistEntryViewModel => ({
        rank: index + 1,
        username: row.username,
        displayName: row.displayName || row.username,
        className: row.className,
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
    listClasses: async () => {
      const classes = await db.listClasses();
      return classes.map((classRecord) => ({
        id: classRecord._id,
        name: classRecord.name,
        isActive: classRecord.isActive,
        order: classRecord.order,
      }));
    },
    listActiveClasses: async () => {
      const classes = await db.listActiveClasses();
      return classes.map((classRecord) => ({
        id: classRecord._id,
        name: classRecord.name,
        isActive: classRecord.isActive,
        order: classRecord.order,
      }));
    },
    createClass: async (input) => {
      const classRecord = await db.createClass(input);
      return {
        id: classRecord._id,
        name: classRecord.name,
        isActive: classRecord.isActive,
        order: classRecord.order,
      };
    },
    updateClass: async (id, input) => {
      await db.updateClass(id, input);
    },
    getEnabledLanguages: async (): Promise<readonly AppLanguage[]> => db.getEnabledLanguages(),
    updateEnabledLanguages: async (enabledLanguages) => {
      await db.updateEnabledLanguages(enabledLanguages);
    },
    getPaginationSettings: async () => ({
      listPageSize: await db.getListPageSize(),
      allowedPageSizes: [...ALLOWED_LIST_PAGE_SIZES],
    }),
    updateListPageSize: async (listPageSize) => {
      await db.updateListPageSize(listPageSize);
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
    deleteUser: async (userId) => {
      await db.deleteUser(userId);
    },
    updateMyPassword: async (userId, currentPassword, newPassword) => {
      await db.updateMyPassword(userId, currentPassword, newPassword);
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
