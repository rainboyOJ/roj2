// 这个文件是项目的数据访问层，负责所有 MongoDB 读写。
import {
  type AppLanguage,
  type ClassDocument,
  type CounterDocument,
  type CreateSubmissionInput,
  type GradeDocument,
  type ProblemDocument,
  type ProblemSetDocument,
  type SessionDocument,
  type SiteSettingsDocument,
  type SubmissionDocument,
  type UserDocument,
  type UserProblemProgressDocument,
} from '@roj/shared';
import { MongoClient } from 'mongodb';

export {
  isDefaultProblemDirectoryName,
  readDefaultProblemSeeds,
  type DefaultProblemSeed,
} from './default-problems.ts';
export { seedDemoData } from './demo-seed.ts';
import { seedDemoData } from './demo-seed.ts';
export {
  buildClassDocument,
  buildDictionaryUpdateFields,
  buildGradeDocument,
  createClass,
  createGrade,
  listActiveClasses,
  listClasses,
  listGrades,
  updateClass,
  updateGrade,
  type DictionaryInput,
} from './dictionaries.ts';
import {
  createClass,
  createGrade,
  listActiveClasses,
  listClasses,
  listGrades,
  updateClass,
  updateGrade,
  type DictionaryInput,
} from './dictionaries.ts';
export { ensureRojIndexes } from './indexes.ts';
import { ensureRojIndexes } from './indexes.ts';
export { nextCounterValue } from './counters.ts';
import { nextCounterValue } from './counters.ts';
export {
  ALLOWED_LIST_PAGE_SIZES,
  DEFAULT_LIST_PAGE_SIZE,
  buildEnabledLanguagesUpdate,
  buildListPageSizeUpdate,
  getEnabledLanguages,
  getListPageSize,
  normalizeListPageSize,
  parseEnabledLanguagesEnv,
  updateEnabledLanguages,
  updateListPageSize,
  type ListPageSize,
} from './settings.ts';
import {
  getEnabledLanguages,
  getListPageSize,
  updateEnabledLanguages,
  updateListPageSize,
  type ListPageSize,
} from './settings.ts';
export { buildLeaseUpdate } from './submission-lease.ts';
export {
  claimPendingSubmission,
  createSubmission,
  markSubmissionFailed,
  saveJudgeAck,
  saveJudgeSnapshot,
  type DebugJudge,
  type SubmissionCommandCollections,
} from './submission-commands.ts';
import {
  claimPendingSubmission,
  createSubmission,
  markSubmissionFailed,
  saveJudgeAck,
  saveJudgeSnapshot,
  type SubmissionCommandCollections,
} from './submission-commands.ts';
export {
  buildSubmissionListFilter,
  type SubmissionListFilters,
} from './submission-filters.ts';
import type { SubmissionListFilters } from './submission-filters.ts';
export {
  attachProblemsToSubmissions,
  getSubmissionById,
  getSubmissionByNo,
  getSubmissionByPublicId,
  getSubmissionWithProblemByPublicId,
  listAllSubmissions,
  listAllSubmissionsWithProblems,
  listSubmissionsByUser,
  listSubmissionsByUserPaginated,
  listSubmissionsWithProblemsByUser,
  listSubmissionsWithProblemsPaginated,
  type SubmissionQueryCollections,
} from './submission-queries.ts';
import {
  attachProblemsToSubmissions,
  getSubmissionById,
  getSubmissionByNo,
  getSubmissionByPublicId,
  getSubmissionWithProblemByPublicId,
  listAllSubmissions,
  listAllSubmissionsWithProblems,
  listSubmissionsByUser,
  listSubmissionsByUserPaginated,
  listSubmissionsWithProblemsByUser,
  listSubmissionsWithProblemsPaginated,
  type SubmissionQueryCollections,
} from './submission-queries.ts';
export { calculateSubmissionScore } from './submission-scoring.ts';
export {
  buildClearSubmissionLeaseUpdate,
  buildJudgeAckUpdate,
  buildJudgeSnapshotUpdate,
  buildSubmissionFailedUpdate,
  type JudgeSnapshotPersistInput,
} from './submission-updates.ts';
import {
  type JudgeSnapshotPersistInput,
} from './submission-updates.ts';
export {
  buildAcceptedProblemProgressUpdate,
  buildAttemptedProblemProgressUpdate,
  listProblemProgressByUser,
  markProblemAccepted,
  markProblemAttempted,
  rebuildUserProblemProgress,
  buildUserProblemProgressRows,
} from './problem-progress.ts';
import {
  listProblemProgressByUser,
  markProblemAccepted,
  markProblemAttempted,
  rebuildUserProblemProgress,
} from './problem-progress.ts';
export {
  buildRanklistAggregationPipeline,
  type RanklistFilters,
} from './ranklist.ts';
import {
  buildRanklistAggregationPipeline,
  type RanklistFilters,
} from './ranklist.ts';
export {
  buildProblemDocument,
  buildPublishProblemUpdate,
  buildProblemUpdateFields,
  createProblem,
  getAdminProblemById,
  getProblemByPid,
  listAdminProblems,
  listVisibleProblems,
  listVisibleProblemsByPids,
  listVisibleProblemsPaginated,
  publishProblem,
  updateProblem,
  type ProblemInput,
} from './problem-documents.ts';
import {
  createProblem,
  getAdminProblemById,
  getProblemByPid,
  listAdminProblems,
  listVisibleProblems,
  listVisibleProblemsByPids,
  listVisibleProblemsPaginated,
  publishProblem,
  updateProblem,
  type ProblemInput,
} from './problem-documents.ts';
export {
  buildProblemSetDocument,
  buildPublishProblemSetUpdate,
  buildProblemSetUpdateFields,
  createProblemSet,
  getAdminProblemSetById,
  getPublishedProblemSetById,
  listAdminProblemSets,
  listPublishedProblemSets,
  publishProblemSet,
  updateProblemSet,
  type ProblemSetInput,
} from './problem-set-documents.ts';
import {
  createProblemSet,
  getAdminProblemSetById,
  getPublishedProblemSetById,
  listAdminProblemSets,
  listPublishedProblemSets,
  publishProblemSet,
  updateProblemSet,
  type ProblemSetInput,
} from './problem-set-documents.ts';
export {
  buildApproveUserUpdate,
  buildRejectUserUpdate,
  buildResetPasswordUpdate,
  buildSessionDocument,
  buildStudentUserDocument,
  buildUserClassNameUpdate,
  approveUser,
  createSession,
  deleteUser,
  destroySession,
  getDemoUser,
  getUserBySessionToken,
  hashPassword,
  listUsersForAdmin,
  listUsersForAdminPaginated,
  loginUser,
  mapUserToSessionRecord,
  registerUser,
  rejectUser,
  resetUserPassword,
  updateMyPassword,
  updateUserClassName,
  verifyPassword,
  type RegisterUserInput,
  type SessionUserRecord,
  type UserCollections,
} from './users.ts';
import {
  approveUser,
  createSession,
  deleteUser,
  destroySession,
  getDemoUser,
  getUserBySessionToken,
  listUsersForAdmin,
  listUsersForAdminPaginated,
  loginUser,
  registerUser,
  rejectUser,
  resetUserPassword,
  updateMyPassword,
  updateUserClassName,
  type RegisterUserInput,
  type SessionUserRecord,
  type UserCollections,
} from './users.ts';

function debugJudge(message: string, details?: Record<string, unknown>) {
  if (process.env.DEBUG_JUDGE !== '1') {
    return;
  }

  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[DEBUG] [db] ${message}${suffix}`);
}

// MongoDB 连接配置。
export interface DbConfig {
  uri: string;
  dbName: string;
}

export class RojDb {
  readonly client: MongoClient;
  readonly dbName: string;

  constructor(config: DbConfig) {
    this.client = new MongoClient(config.uri);
    this.dbName = config.dbName;
  }

  get db() {
    return this.client.db(this.dbName);
  }

  async connect() {
    await this.client.connect();
  }

  async close() {
    await this.client.close();
  }

  // 各集合访问入口。
  users() {
    return this.db.collection<UserDocument>('users');
  }

  problems() {
    return this.db.collection<ProblemDocument>('problems');
  }

  problemSets() {
    return this.db.collection<ProblemSetDocument>('problem_sets');
  }

  grades() {
    return this.db.collection<GradeDocument>('grades');
  }

  classes() {
    return this.db.collection<ClassDocument>('classes');
  }

  sessions() {
    return this.db.collection<SessionDocument>('sessions');
  }

  counters() {
    return this.db.collection<CounterDocument>('counters');
  }

  settings() {
    return this.db.collection<SiteSettingsDocument>('settings');
  }

  submissions() {
    return this.db.collection<SubmissionDocument>('submissions');
  }

  userProblemProgress() {
    return this.db.collection<UserProblemProgressDocument>('user_problem_progress');
  }

  userCollections(): UserCollections {
    return {
      users: this.users(),
      sessions: this.sessions(),
      grades: this.grades(),
      classes: this.classes(),
    };
  }

  submissionQueryCollections(): SubmissionQueryCollections {
    return {
      submissions: this.submissions(),
      problems: this.problems(),
    };
  }

  submissionCommandCollections(): SubmissionCommandCollections {
    return {
      users: this.users(),
      problems: this.problems(),
      counters: this.counters(),
      settings: this.settings(),
      submissions: this.submissions(),
      userProblemProgress: this.userProblemProgress(),
    };
  }

  // 初始化项目需要的索引。
  async ensureIndexes() {
    await ensureRojIndexes({
      users: this.users(),
      grades: this.grades(),
      classes: this.classes(),
      sessions: this.sessions(),
      problems: this.problems(),
      problemSets: this.problemSets(),
      submissions: this.submissions(),
      userProblemProgress: this.userProblemProgress(),
    });
  }

  // 初始化演示数据。
  async seedDemoData() {
    await seedDemoData({
      grades: this.grades(),
      classes: this.classes(),
      users: this.users(),
      problems: this.problems(),
      settings: this.settings(),
    });
  }

  async listVisibleProblems() {
    return listVisibleProblems(this.problems());
  }

  async listVisibleProblemsPaginated(input: {
    page: number;
    pageSize: number;
  }) {
    return listVisibleProblemsPaginated(this.problems(), input);
  }

  async getProblemByPid(pid: string) {
    return getProblemByPid(this.problems(), pid);
  }

  async listVisibleProblemsByPids(pids: string[]) {
    return listVisibleProblemsByPids(this.problems(), pids);
  }

  async getDemoUser() {
    return getDemoUser(this.userCollections());
  }

  async nextCounterValue(counterId: string) {
    return nextCounterValue(this.counters(), counterId);
  }

  // 创建一条等待 dispatcher 派发的 submission。
  async createSubmission(input: CreateSubmissionInput) {
    return createSubmission(this.submissionCommandCollections(), input, debugJudge);
  }

  async getSubmissionById(id: string) {
    return getSubmissionById(this.submissionQueryCollections(), id);
  }

  async getSubmissionByNo(submissionNo: number) {
    return getSubmissionByNo(this.submissionQueryCollections(), submissionNo);
  }

  async getSubmissionByPublicId(publicId: string) {
    return getSubmissionByPublicId(this.submissionQueryCollections(), publicId);
  }

  async getSubmissionWithProblemByPublicId(publicId: string) {
    return getSubmissionWithProblemByPublicId(this.submissionQueryCollections(), publicId);
  }

  async attachProblemsToSubmissions(submissions: SubmissionDocument[]) {
    return attachProblemsToSubmissions(this.submissionQueryCollections(), submissions);
  }

  async listSubmissionsByUser(userId: string) {
    return listSubmissionsByUser(this.submissionQueryCollections(), userId);
  }

  async listSubmissionsWithProblemsByUser(userId: string) {
    return listSubmissionsWithProblemsByUser(this.submissionQueryCollections(), userId);
  }

  async listSubmissionsByUserPaginated(userId: string, input: {
    page: number;
    pageSize: number;
  }) {
    return listSubmissionsByUserPaginated(this.submissionQueryCollections(), userId, input);
  }

  async listSubmissionsWithProblemsPaginated(input: {
    page: number;
    pageSize: number;
    filters?: SubmissionListFilters;
  }) {
    return listSubmissionsWithProblemsPaginated(this.submissionQueryCollections(), input);
  }

  async listProblemProgressByUser(userId: string) {
    return listProblemProgressByUser(this.userProblemProgress(), userId);
  }

  async markProblemAttempted(userId: string, pid: string, now = new Date()) {
    await markProblemAttempted(this.userProblemProgress(), userId, pid, now);
  }

  async markProblemAccepted(userId: string, pid: string, now = new Date()) {
    await markProblemAccepted(this.userProblemProgress(), userId, pid, now);
  }

  async listAllSubmissions() {
    return listAllSubmissions(this.submissionQueryCollections());
  }

  async listAllSubmissionsWithProblems() {
    return listAllSubmissionsWithProblems(this.submissionQueryCollections());
  }

  async listAllSubmissionsWithProblemsPaginated(input: {
    page: number;
    pageSize: number;
  }) {
    return listSubmissionsWithProblemsPaginated(this.submissionQueryCollections(), input);
  }

  async buildSimpleRanklist(filters: RanklistFilters = {}) {
    return this.submissions().aggregate<{
      username: string;
      displayName?: string;
      className?: string;
      acceptedCount: number;
      submissionCount: number;
      wrongAttempts: number;
      lastAcceptedAt: Date | null;
    }>(buildRanklistAggregationPipeline(filters)).toArray();
  }

  // 原子抢占一条待派发 submission，供 dispatcher 使用。
  async claimPendingSubmission(leaseOwner: string, leaseMs: number) {
    return claimPendingSubmission(
      this.submissionCommandCollections(),
      leaseOwner,
      leaseMs,
      debugJudge,
    );
  }

  // 保存 judge 受理任务后的 ack。
  async saveJudgeAck(localSubmissionId: string, ack: JudgeSnapshotPersistInput) {
    await saveJudgeAck(this.submissionCommandCollections(), localSubmissionId, ack, debugJudge);
  }

  // 保存轮询得到的 judge 快照，并同步更新 OJ 内部状态。
  async saveJudgeSnapshot(localSubmissionId: string, snapshot: JudgeSnapshotPersistInput) {
    await saveJudgeSnapshot(
      this.submissionCommandCollections(),
      localSubmissionId,
      snapshot,
      debugJudge,
    );
  }

  // 记录系统级失败，例如 judge 通信或 dispatcher 自身异常。
  async markSubmissionFailed(localSubmissionId: string, message: string) {
    await markSubmissionFailed(
      this.submissionCommandCollections(),
      localSubmissionId,
      message,
      debugJudge,
    );
  }

  async rebuildUserProblemProgress() {
    return rebuildUserProblemProgress(this.submissions(), this.userProblemProgress());
  }

  // 学生注册后默认进入待审核状态。
  async registerUser(input: RegisterUserInput) {
    return registerUser(this.userCollections(), input);
  }

  async loginUser(username: string, password: string): Promise<SessionUserRecord | null> {
    return loginUser(this.userCollections(), username, password);
  }

  // 创建服务端 session。
  async createSession(userId: string, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    return createSession(this.userCollections(), userId, ttlMs);
  }

  async destroySession(token: string | null) {
    await destroySession(this.userCollections(), token);
  }

  // 用 session token 反查当前登录用户，并顺便过滤过期 session。
  async getUserBySessionToken(token: string | null): Promise<SessionUserRecord | null> {
    return getUserBySessionToken(this.userCollections(), token);
  }

  async listUsersForAdmin() {
    return listUsersForAdmin(this.userCollections());
  }

  async listUsersForAdminPaginated(input: {
    page: number;
    pageSize: number;
  }) {
    return listUsersForAdminPaginated(this.userCollections(), input);
  }

  async listGrades() {
    return listGrades(this.grades());
  }

  async listClasses() {
    return listClasses(this.classes());
  }

  async listActiveClasses() {
    return listActiveClasses(this.classes());
  }

  // 年级是注册流程依赖的字典表。
  async createGrade(input: DictionaryInput) {
    return createGrade(this.grades(), input);
  }

  async updateGrade(id: string, input: DictionaryInput) {
    await updateGrade(this.grades(), id, input);
  }

  // 班级是注册流程依赖的字典表。
  async createClass(input: DictionaryInput) {
    return createClass(this.classes(), input);
  }

  async updateClass(id: string, input: DictionaryInput) {
    await updateClass(this.classes(), id, input);
  }

  async listAdminProblems() {
    return listAdminProblems(this.problems());
  }

  async getEnabledLanguages(): Promise<readonly AppLanguage[]> {
    return getEnabledLanguages(this.settings());
  }

  async getListPageSize(): Promise<ListPageSize> {
    return getListPageSize(this.settings());
  }

  async updateEnabledLanguages(enabledLanguages: AppLanguage[]) {
    await updateEnabledLanguages(this.settings(), enabledLanguages);
  }

  async updateListPageSize(listPageSize: number) {
    await updateListPageSize(this.settings(), listPageSize);
  }

  async getAdminProblemById(id: string) {
    return getAdminProblemById(this.problems(), id);
  }

  // 创建站内题目元数据，不涉及 judge 机测试数据目录。
  async createProblem(input: ProblemInput) {
    return createProblem(this.problems(), input);
  }

  async updateProblem(id: string, input: ProblemInput) {
    await updateProblem(this.problems(), id, input);
  }

  // 当前最小实现里，发布题目就是把 isVisible 设为 true。
  async publishProblem(id: string) {
    await publishProblem(this.problems(), id);
  }

  async listPublishedProblemSets() {
    return listPublishedProblemSets(this.problemSets());
  }

  async getPublishedProblemSetById(id: string) {
    return getPublishedProblemSetById(this.problemSets(), id);
  }

  async listAdminProblemSets() {
    return listAdminProblemSets(this.problemSets());
  }

  async getAdminProblemSetById(id: string) {
    return getAdminProblemSetById(this.problemSets(), id);
  }

  async createProblemSet(input: ProblemSetInput) {
    return createProblemSet(this.problemSets(), input);
  }

  async updateProblemSet(id: string, input: ProblemSetInput) {
    await updateProblemSet(this.problemSets(), id, input);
  }

  async publishProblemSet(id: string) {
    await publishProblemSet(this.problemSets(), id);
  }

  // 审核通过时记录审核人和审核时间。
  async approveUser(userId: string, adminUserId: string) {
    await approveUser(this.userCollections(), userId, adminUserId);
  }

  async rejectUser(userId: string, adminUserId: string, reason = 'Rejected by admin') {
    await rejectUser(this.userCollections(), userId, adminUserId, reason);
  }

  // 用户修改班级后重新回到待审核状态。
  async updateUserClassName(userId: string, className: string) {
    await updateUserClassName(this.userCollections(), userId, className);
  }

  async resetUserPassword(userId: string, password: string) {
    await resetUserPassword(this.userCollections(), userId, password);
  }

  async updateMyPassword(userId: string, currentPassword: string, newPassword: string) {
    await updateMyPassword(this.userCollections(), userId, currentPassword, newPassword);
  }

  async deleteUser(userId: string) {
    await deleteUser(this.userCollections(), userId);
  }
}

// HTML 表单里语言先是 string，这里收窄回 AppLanguage。
export function toAppLanguage(value: string): AppLanguage {
  if (value === 'cpp' || value === 'python') {
    return value;
  }
  throw new Error(`unsupported app language: ${value}`);
}
