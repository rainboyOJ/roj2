// api-server 的入口文件。
// 这里做两件事：
// 1. 把数据库层封装成“页面/接口需要的 services”
// 2. 调 buildApp() 组装出真正的 Fastify 应用
import { RojDb } from '@roj/db';
import { ALLOWED_LIST_PAGE_SIZES } from '@roj/db';

import {
  buildApp,
  type ApiServerServices,
  type RanklistEntryViewModel,
} from './app.ts';
import { buildPlaceholderContests } from './services/contests.ts';
import {
  formatDateTime,
  mapAdminProblem,
  mapAdminProblemSet,
  mapAdminUser,
  mapPaginatedSubmissions,
  mapProblem,
  mapProblemSetBase,
  mapProblemSetDetail,
  mapSessionUser,
  mapSubmission,
} from './services/mappers.ts';
import { buildPaginationViewModel } from './services/pagination.ts';
import type { CreateSubmissionInput } from '@roj/shared';
import type { AppLanguage } from '@roj/shared';

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
