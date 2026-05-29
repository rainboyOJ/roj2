// 这个文件是项目的数据访问层，负责所有 MongoDB 读写。
import {
  argon2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { ObjectId, type Filter } from 'mongodb';
import {
  OJSubmissionStatuses,
  SubmissionVerdicts,
  createEmptyJudgeState,
  createEmptyResultState,
  mapJudgeSnapshotToSubmissionState,
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
import { renderMarkdown } from '@roj/markdown-renderer';
import { MongoClient } from 'mongodb';

export {
  isDefaultProblemDirectoryName,
  readDefaultProblemSeeds,
  type DefaultProblemSeed,
} from './default-problems.ts';
import { readDefaultProblemSeeds } from './default-problems.ts';
export {
  ALLOWED_LIST_PAGE_SIZES,
  DEFAULT_LIST_PAGE_SIZE,
  normalizeListPageSize,
  parseEnabledLanguagesEnv,
  type ListPageSize,
} from './settings.ts';
import {
  DEFAULT_LIST_PAGE_SIZE,
  normalizeListPageSize,
  parseEnabledLanguagesEnv,
  type ListPageSize,
} from './settings.ts';
export { buildLeaseUpdate } from './submission-lease.ts';
import { buildLeaseUpdate } from './submission-lease.ts';
export { calculateSubmissionScore } from './submission-scoring.ts';
import { calculateSubmissionScore } from './submission-scoring.ts';
export {
  buildAcceptedProblemProgressUpdate,
  buildAttemptedProblemProgressUpdate,
  buildUserProblemProgressRows,
} from './problem-progress.ts';
import {
  buildAcceptedProblemProgressUpdate,
  buildAttemptedProblemProgressUpdate,
  buildUserProblemProgressRows,
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
  buildProblemUpdateFields,
  type ProblemInput,
} from './problem-documents.ts';
import {
  buildProblemDocument,
  buildProblemUpdateFields,
  type ProblemInput,
} from './problem-documents.ts';
export {
  buildProblemSetDocument,
  buildProblemSetUpdateFields,
  type ProblemSetInput,
} from './problem-set-documents.ts';
import {
  buildProblemSetDocument,
  buildProblemSetUpdateFields,
  type ProblemSetInput,
} from './problem-set-documents.ts';

function debugJudge(message: string, details?: Record<string, unknown>) {
  if (process.env.DEBUG_JUDGE !== '1') {
    return;
  }

  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[DEBUG] [db] ${message}${suffix}`);
}

function escapeRegexText(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSubmissionListFilter(filters: SubmissionListFilters = {}): Filter<SubmissionDocument> {
  const query: Filter<SubmissionDocument> = {};
  const pid = filters.pid?.trim();
  const user = filters.user?.trim();

  if (pid) {
    query.pid = pid;
  }

  if (user) {
    const userPattern = new RegExp(escapeRegexText(user), 'i');
    query.$or = [
      { username: userPattern },
      { displayName: userPattern },
    ];
  }

  return query;
}

// MongoDB 连接配置。
export interface DbConfig {
  uri: string;
  dbName: string;
}

export interface SubmissionListFilters {
  pid?: string;
  user?: string;
}

// 持久化 judge 返回快照时使用的输入结构。
export interface JudgeSnapshotPersistInput {
  submissionId: number;
  status: string;
  verdict: string;
  message: string;
  case_results: Array<{
    seq_id: number;
    verdict: string;
    cpu_time_ms: number;
    real_time_ms: number;
    memory_kb: number;
    signal: number;
    exit_code: number;
    error_code: number;
  }>;
}

// 注册用户时的输入结构。
export interface RegisterUserInput {
  username: string;
  name: string;
  gender: 'male' | 'female';
  className: string;
  grade: string;
  password: string;
}

// 登录态里暴露给上层的最小用户信息。
export interface SessionUserRecord {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  name: string;
  grade: string;
  className: string;
}

// 密码以 argon2id 形式存储。
function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const digest = argon2Sync('argon2id', {
    message: password,
    nonce: salt,
    parallelism: 1,
    memory: 64 * 1024,
    passes: 3,
    tagLength: 32,
  });
  return `argon2id:${salt.toString('hex')}:${digest.toString('hex')}`;
}

// 登录时重新计算摘要并做 timing-safe 比较。
function verifyPassword(password: string, passwordHash: string): boolean {
  const [algorithm, saltHex, digestHex] = passwordHash.split(':');
  if (algorithm !== 'argon2id' || !saltHex || !digestHex) {
    return false;
  }
  const expected = Buffer.from(digestHex, 'hex');
  const actual = argon2Sync('argon2id', {
    message: password,
    nonce: Buffer.from(saltHex, 'hex'),
    parallelism: 1,
    memory: 64 * 1024,
    passes: 3,
    tagLength: expected.length,
  });
  return timingSafeEqual(actual, expected);
}

interface ProblemProgressSourceSubmission {
  userId: string;
  pid: string;
  verdict: string;
  updatedAt: Date;
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

  // 初始化项目需要的索引。
  async ensureIndexes() {
    await this.users().createIndex({ username: 1 }, { unique: true });
    await this.grades().createIndex({ name: 1 }, { unique: true });
    await this.classes().createIndex({ name: 1 }, { unique: true });
    await this.sessions().createIndex({ token: 1 }, { unique: true });
    await this.sessions().createIndex({ expiresAt: 1 });
    await this.problems().createIndex({ pid: 1 }, { unique: true });
    await this.problemSets().createIndex({ isPublished: 1, publishedAt: -1 });
    await this.problemSets().createIndex({ createdAt: -1 });
    await this.submissions().createIndex({ userId: 1, createdAt: -1 });
    await this.submissions().createIndex({ pid: 1, createdAt: -1 });
    await this.submissions().createIndex({ username: 1, verdict: 1, updatedAt: 1 });
    await this.submissions().createIndex({ submissionNo: 1 }, { unique: true, sparse: true });
    await this.submissions().createIndex({ status: 1, 'judge.leaseExpireAt': 1 });
    await this.submissions().createIndex({ 'judge.submissionId': 1 });
    await this.userProblemProgress().createIndex({ userId: 1, pid: 1 }, { unique: true });
    await this.userProblemProgress().createIndex({ userId: 1, status: 1 });
  }

  // 初始化演示数据。
  async seedDemoData() {
    const now = new Date();
    const demoUserId = new ObjectId().toHexString();
    const adminUserId = new ObjectId().toHexString();
    const defaultProblems = await readDefaultProblemSeeds();

    await this.grades().updateOne(
      { name: '2024' },
      {
        $set: {
          name: '2024',
          isActive: true,
          order: 1,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId().toHexString(),
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await this.grades().updateOne(
      { name: '2025' },
      {
        $set: {
          name: '2025',
          isActive: true,
          order: 2,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId().toHexString(),
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await this.grades().updateOne(
      { name: '2026' },
      {
        $set: {
          name: '2026',
          isActive: true,
          order: 3,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: new ObjectId().toHexString(),
          createdAt: now,
        },
      },
      { upsert: true },
    );

    await Promise.all(Array.from({ length: 40 }, (_, index) => {
      const order = index + 1;
      const name = `${order} 班`;
      return this.classes().updateOne(
        { name },
        {
          $setOnInsert: {
            _id: new ObjectId().toHexString(),
            name,
            isActive: true,
            order,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
    }));

    await this.users().updateOne(
      { username: 'admin' },
      {
        $set: {
          username: 'admin',
          name: 'Administrator',
          gender: 'male',
          className: 'System',
          grade: '2025',
          passwordHash: hashPassword('admin123456'),
          role: 'admin',
          approvalStatus: 'approved',
          approvedBy: null,
          approvedAt: now,
          rejectedReason: null,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: adminUserId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    const adminUser = await this.users().findOne({ username: 'admin' });
    if (!adminUser) {
      throw new Error('failed to seed admin user');
    }

    await this.users().updateOne(
      { username: 'demo' },
      {
        $set: {
          username: 'demo',
          name: 'Demo User',
          gender: 'female',
          className: 'Class Demo',
          grade: '2025',
          passwordHash: hashPassword('demo123456'),
          role: 'student',
          approvalStatus: 'approved',
          approvedBy: adminUser._id,
          approvedAt: now,
          rejectedReason: null,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: demoUserId,
          createdAt: now,
        },
      },
      { upsert: true },
    );

    for (const problem of defaultProblems) {
      await this.problems().updateOne(
        { pid: problem.pid },
        {
          $set: {
            pid: problem.pid,
            title: problem.title,
            statementMarkdown: problem.statementMarkdown,
            statementHtml: renderMarkdown(problem.statementMarkdown),
            allowLanguages: problem.allowLanguages,
            isVisible: true,
            updatedAt: now,
          },
          $setOnInsert: {
            _id: new ObjectId().toHexString(),
            createdAt: now,
          },
        },
        { upsert: true },
      );
    }

    await this.settings().updateOne(
      { _id: 'site_settings' },
      {
        $setOnInsert: {
          enabledLanguages: parseEnabledLanguagesEnv(process.env.ROJ_ENABLED_LANGUAGES),
          listPageSize: DEFAULT_LIST_PAGE_SIZE,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  async listVisibleProblems() {
    return this.problems().find({ isVisible: true }).sort({ pid: 1 }).toArray();
  }

  async listVisibleProblemsPaginated(input: {
    page: number;
    pageSize: number;
  }) {
    const skip = (input.page - 1) * input.pageSize;
    const query = { isVisible: true };
    const [items, total] = await Promise.all([
      this.problems()
        .find(query)
        .sort({ pid: 1 })
        .skip(skip)
        .limit(input.pageSize)
        .toArray(),
      this.problems().countDocuments(query),
    ]);

    return { items, total };
  }

  async getProblemByPid(pid: string) {
    return this.problems().findOne({ pid, isVisible: true });
  }

  async listVisibleProblemsByPids(pids: string[]) {
    if (pids.length === 0) {
      return [];
    }
    return this.problems()
      .find({ pid: { $in: pids }, isVisible: true })
      .toArray();
  }

  async getDemoUser() {
    return this.users().findOne({ username: 'demo' });
  }

  async nextCounterValue(counterId: string) {
    const now = new Date();
    const result = await this.counters().findOneAndUpdate(
      { _id: counterId },
      {
        $inc: { value: 1 },
        $set: { updatedAt: now },
      },
      {
        upsert: true,
        returnDocument: 'after',
      },
    );

    if (!result) {
      throw new Error(`failed to allocate counter ${counterId}`);
    }
    return result.value;
  }

  // 创建一条等待 dispatcher 派发的 submission。
  async createSubmission(input: CreateSubmissionInput) {
    const user = await this.users().findOne({ _id: input.userId });
    if (!user) {
      throw new Error('user not found');
    }

    const problem = await this.getProblemByPid(input.pid);
    if (!problem) {
      throw new Error(`problem ${input.pid} not found`);
    }
    const enabledLanguages = await this.getEnabledLanguages();
    if (!enabledLanguages.includes(input.language)) {
      throw new Error(`language ${input.language} is disabled`);
    }
    if (!problem.allowLanguages.includes(input.language)) {
      throw new Error(`language ${input.language} is not allowed for ${input.pid}`);
    }

    const now = new Date();
    const submissionNo = await this.nextCounterValue('submissionNo');
    const submission: SubmissionDocument = {
      _id: new ObjectId().toHexString(),
      submissionNo,
      userId: user._id,
      problemId: problem._id,
      pid: problem.pid,
      username: user.username,
      displayName: user.name,
      language: input.language,
      sourceCode: input.sourceCode,
      status: OJSubmissionStatuses.PENDING_DISPATCH,
      verdict: SubmissionVerdicts.PENDING,
      score: 0,
      judge: createEmptyJudgeState(),
      result: createEmptyResultState(),
      createdAt: now,
      updatedAt: now,
    };

    await this.submissions().insertOne(submission);
    await this.markProblemAttempted(submission.userId, submission.pid, now);
    debugJudge('submission created', {
      localSubmissionId: submission._id,
      submissionNo: submission.submissionNo,
      pid: submission.pid,
      userId: submission.userId,
      language: submission.language,
    });
    return submission;
  }

  async getSubmissionById(id: string) {
    return this.submissions().findOne({ _id: id });
  }

  async getSubmissionByNo(submissionNo: number) {
    return this.submissions().findOne({ submissionNo });
  }

  async getSubmissionByPublicId(publicId: string) {
    if (/^\d+$/.test(publicId)) {
      const byNo = await this.getSubmissionByNo(Number(publicId));
      if (byNo) {
        return byNo;
      }
    }
    return this.getSubmissionById(publicId);
  }

  async getSubmissionWithProblemByPublicId(publicId: string) {
    const submission = await this.getSubmissionByPublicId(publicId);
    if (!submission) {
      return null;
    }

    const problem = await this.problems().findOne({ _id: submission.problemId });
    return {
      ...submission,
      problem,
    };
  }

  async attachProblemsToSubmissions(submissions: SubmissionDocument[]) {
    const problemIds = [...new Set(submissions.map((submission) => submission.problemId))];
    const problems = await this.problems().find({ _id: { $in: problemIds } }).toArray();
    const problemById = new Map(problems.map((problem) => [problem._id, problem]));

    return submissions.map((submission) => ({
      ...submission,
      problem: problemById.get(submission.problemId) ?? null,
    }));
  }

  async listSubmissionsByUser(userId: string) {
    return this.submissions().find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  async listSubmissionsWithProblemsByUser(userId: string) {
    return this.attachProblemsToSubmissions(await this.listSubmissionsByUser(userId));
  }

  async listSubmissionsByUserPaginated(userId: string, input: {
    page: number;
    pageSize: number;
  }) {
    const skip = (input.page - 1) * input.pageSize;
    const [items, total] = await Promise.all([
      this.submissions()
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(input.pageSize)
        .toArray(),
      this.submissions().countDocuments({ userId }),
    ]);

    return {
      items: await this.attachProblemsToSubmissions(items),
      total,
    };
  }

  async listSubmissionsWithProblemsPaginated(input: {
    page: number;
    pageSize: number;
    filters?: SubmissionListFilters;
  }) {
    const skip = (input.page - 1) * input.pageSize;
    const query = buildSubmissionListFilter(input.filters);
    const [items, total] = await Promise.all([
      this.submissions()
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(input.pageSize)
        .toArray(),
      this.submissions().countDocuments(query),
    ]);

    return {
      items: await this.attachProblemsToSubmissions(items),
      total,
    };
  }

  async listProblemProgressByUser(userId: string) {
    const progressRows = await this.userProblemProgress()
      .find({ userId }, { projection: { pid: 1, status: 1 } })
      .toArray();
    const progressByPid = new Map<string, 'accepted' | 'attempted'>();

    for (const progress of progressRows) {
      progressByPid.set(progress.pid, progress.status);
    }

    return progressByPid;
  }

  async markProblemAttempted(userId: string, pid: string, now = new Date()) {
    await this.userProblemProgress().updateOne(
      { userId, pid },
      buildAttemptedProblemProgressUpdate(userId, pid, now),
      { upsert: true },
    );
  }

  async markProblemAccepted(userId: string, pid: string, now = new Date()) {
    await this.userProblemProgress().updateOne(
      { userId, pid },
      buildAcceptedProblemProgressUpdate(userId, pid, now),
      { upsert: true },
    );
  }

  async listAllSubmissions() {
    return this.submissions().find({}).sort({ createdAt: -1 }).toArray();
  }

  async listAllSubmissionsWithProblems() {
    return this.attachProblemsToSubmissions(await this.listAllSubmissions());
  }

  async listAllSubmissionsWithProblemsPaginated(input: {
    page: number;
    pageSize: number;
  }) {
    return this.listSubmissionsWithProblemsPaginated(input);
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
    const now = new Date();
    const result = await this.submissions().findOneAndUpdate(
      {
        status: OJSubmissionStatuses.PENDING_DISPATCH,
        $or: [
          { 'judge.leaseExpireAt': null },
          { 'judge.leaseExpireAt': { $lt: now } },
        ],
      },
      buildLeaseUpdate(leaseOwner, now, leaseMs),
      {
        sort: { createdAt: 1 },
        returnDocument: 'after',
      },
    );

    if (result) {
      debugJudge('submission claimed', {
        localSubmissionId: result._id,
        pid: result.pid,
        leaseOwner,
      });
    }

    return result;
  }

  // 保存 judge 受理任务后的 ack。
  async saveJudgeAck(localSubmissionId: string, ack: JudgeSnapshotPersistInput) {
    const now = new Date();
    debugJudge('save judge ack', {
      localSubmissionId,
      judgeSubmissionId: ack.submissionId,
      status: ack.status,
      verdict: ack.verdict,
      cases: ack.case_results.length,
    });
    await this.submissions().updateOne(
      { _id: localSubmissionId },
      {
        $set: {
          status: OJSubmissionStatuses.JUDGING,
          verdict: ack.verdict,
          score: 0,
          'judge.submissionId': ack.submissionId,
          'judge.lastStatus': ack.status,
          'judge.lastMessage': ack.message,
          'judge.ackAt': now,
          updatedAt: now,
        },
      },
    );
  }

  // 保存轮询得到的 judge 快照，并同步更新 OJ 内部状态。
  async saveJudgeSnapshot(localSubmissionId: string, snapshot: JudgeSnapshotPersistInput) {
    const now = new Date();
    const mapped = mapJudgeSnapshotToSubmissionState(snapshot);
    const score = calculateSubmissionScore(snapshot.case_results);
    const submission = await this.submissions().findOne(
      { _id: localSubmissionId },
      { projection: { userId: 1, pid: 1 } },
    );
    debugJudge('save judge snapshot', {
      localSubmissionId,
      judgeSubmissionId: snapshot.submissionId,
      judgeStatus: snapshot.status,
      ojStatus: mapped.status,
      verdict: mapped.verdict,
      score,
      cases: snapshot.case_results.length,
    });
    await this.submissions().updateOne(
      { _id: localSubmissionId },
      {
        $set: {
          status: mapped.status,
          verdict: mapped.verdict,
          score,
          'judge.lastStatus': snapshot.status,
          'judge.lastMessage': snapshot.message,
          'judge.lastPolledAt': now,
          'judge.finishedAt':
            mapped.status === OJSubmissionStatuses.FINISHED ||
            mapped.status === OJSubmissionStatuses.FAILED
              ? now
              : null,
          'result.caseResults': snapshot.case_results,
          'result.message': snapshot.message,
          'result.score': score,
          updatedAt: now,
        },
      },
    );

    if (
      mapped.status === OJSubmissionStatuses.FINISHED ||
      mapped.status === OJSubmissionStatuses.FAILED
    ) {
      await this.submissions().updateOne(
        { _id: localSubmissionId },
        {
          $set: {
            'judge.leaseOwner': null,
            'judge.leaseExpireAt': null,
          },
        },
      );
    }

    if (mapped.verdict === SubmissionVerdicts.AC && submission) {
      await this.markProblemAccepted(submission.userId, submission.pid, now);
    }
  }

  // 记录系统级失败，例如 judge 通信或 dispatcher 自身异常。
  async markSubmissionFailed(localSubmissionId: string, message: string) {
    const now = new Date();
    debugJudge('mark submission failed', {
      localSubmissionId,
      message,
    });
    await this.submissions().updateOne(
      { _id: localSubmissionId },
      {
        $set: {
          status: OJSubmissionStatuses.FAILED,
          verdict: SubmissionVerdicts.SYSTEM_ERROR,
          score: 0,
          'judge.lastStatus': 'FAILED',
          'judge.lastMessage': message,
          'judge.finishedAt': now,
          'judge.leaseOwner': null,
          'judge.leaseExpireAt': null,
          'result.message': message,
          'result.score': 0,
          updatedAt: now,
        },
        $inc: {
          'judge.retryCount': 1,
        },
      },
    );
  }

  async rebuildUserProblemProgress() {
    const submissions: ProblemProgressSourceSubmission[] = [];

    const cursor = this.submissions()
      .find({}, { projection: { userId: 1, pid: 1, verdict: 1, updatedAt: 1 } })
      .sort({ createdAt: 1 });

    for await (const submission of cursor) {
      submissions.push(submission);
    }

    const progressRows = buildUserProblemProgressRows(submissions);
    await this.userProblemProgress().deleteMany({});
    if (progressRows.length === 0) {
      return { rebuilt: 0 };
    }

    await this.userProblemProgress().bulkWrite(
      progressRows.map((progress) => ({
        insertOne: {
          document: {
            _id: new ObjectId().toHexString(),
            ...progress,
          },
        },
      })),
    );

    return { rebuilt: progressRows.length };
  }

  // 学生注册后默认进入待审核状态。
  async registerUser(input: RegisterUserInput) {
    const grade = await this.grades().findOne({ name: input.grade, isActive: true });
    if (!grade) {
      throw new Error(`grade ${input.grade} is not available`);
    }
    const classRecord = await this.classes().findOne({ name: input.className, isActive: true });
    if (!classRecord) {
      throw new Error(`class ${input.className} is not available`);
    }

    const now = new Date();
    const user: UserDocument = {
      _id: new ObjectId().toHexString(),
      username: input.username,
      name: input.name,
      gender: input.gender,
      className: input.className,
      grade: input.grade,
      passwordHash: hashPassword(input.password),
      role: 'student',
      approvalStatus: 'pending',
      approvedBy: null,
      approvedAt: null,
      rejectedReason: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.users().insertOne(user);
    return user;
  }

  async loginUser(username: string, password: string): Promise<SessionUserRecord | null> {
    const user = await this.users().findOne({ username });
    if (!user) {
      return null;
    }
    if (!verifyPassword(password, user.passwordHash)) {
      return null;
    }

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

  // 创建服务端 session。
  async createSession(userId: string, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    const now = new Date();
    const session: SessionDocument = {
      _id: new ObjectId().toHexString(),
      token: randomBytes(24).toString('hex'),
      userId,
      expiresAt: new Date(now.getTime() + ttlMs),
      createdAt: now,
      updatedAt: now,
    };

    await this.sessions().insertOne(session);
    return session;
  }

  async destroySession(token: string | null) {
    if (!token) {
      return;
    }
    await this.sessions().deleteOne({ token });
  }

  // 用 session token 反查当前登录用户，并顺便过滤过期 session。
  async getUserBySessionToken(token: string | null): Promise<SessionUserRecord | null> {
    if (!token) {
      return null;
    }

    const now = new Date();
    const session = await this.sessions().findOne({
      token,
      expiresAt: { $gt: now },
    });
    if (!session) {
      return null;
    }

    const user = await this.users().findOne({ _id: session.userId });
    if (!user) {
      return null;
    }

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

  async listUsersForAdmin() {
    return this.users().find({}).sort({ createdAt: -1 }).toArray();
  }

  async listUsersForAdminPaginated(input: {
    page: number;
    pageSize: number;
  }) {
    const skip = (input.page - 1) * input.pageSize;
    const [items, total] = await Promise.all([
      this.users()
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(input.pageSize)
        .toArray(),
      this.users().countDocuments({}),
    ]);

    return { items, total };
  }

  async listGrades() {
    return this.grades().find({}).sort({ order: 1 }).toArray();
  }

  async listClasses() {
    return this.classes().find({}).sort({ order: 1 }).toArray();
  }

  async listActiveClasses() {
    return this.classes().find({ isActive: true }).sort({ order: 1 }).toArray();
  }

  // 年级是注册流程依赖的字典表。
  async createGrade(input: {
    name: string;
    isActive: boolean;
    order: number;
  }) {
    const now = new Date();
    const grade: GradeDocument = {
      _id: new ObjectId().toHexString(),
      name: input.name,
      isActive: input.isActive,
      order: input.order,
      createdAt: now,
      updatedAt: now,
    };
    await this.grades().insertOne(grade);
    return grade;
  }

  async updateGrade(id: string, input: {
    name: string;
    isActive: boolean;
    order: number;
  }) {
    await this.grades().updateOne(
      { _id: id },
      {
        $set: {
          name: input.name,
          isActive: input.isActive,
          order: input.order,
          updatedAt: new Date(),
        },
      },
    );
  }

  // 班级是注册流程依赖的字典表。
  async createClass(input: {
    name: string;
    isActive: boolean;
    order: number;
  }) {
    const now = new Date();
    const classRecord: ClassDocument = {
      _id: new ObjectId().toHexString(),
      name: input.name,
      isActive: input.isActive,
      order: input.order,
      createdAt: now,
      updatedAt: now,
    };
    await this.classes().insertOne(classRecord);
    return classRecord;
  }

  async updateClass(id: string, input: {
    name: string;
    isActive: boolean;
    order: number;
  }) {
    await this.classes().updateOne(
      { _id: id },
      {
        $set: {
          name: input.name,
          isActive: input.isActive,
          order: input.order,
          updatedAt: new Date(),
        },
      },
    );
  }

  async listAdminProblems() {
    return this.problems().find({}).sort({ pid: 1 }).toArray();
  }

  async getEnabledLanguages(): Promise<readonly AppLanguage[]> {
    const settings = await this.settings().findOne({ _id: 'site_settings' });
    if (!settings || settings.enabledLanguages.length === 0) {
      return ['cpp', 'python'];
    }
    return settings.enabledLanguages;
  }

  async getListPageSize(): Promise<ListPageSize> {
    const settings = await this.settings().findOne({ _id: 'site_settings' });
    return normalizeListPageSize(settings?.listPageSize);
  }

  async updateEnabledLanguages(enabledLanguages: AppLanguage[]) {
    await this.settings().updateOne(
      { _id: 'site_settings' },
      {
        $set: {
          enabledLanguages,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  async updateListPageSize(listPageSize: number) {
    await this.settings().updateOne(
      { _id: 'site_settings' },
      {
        $set: {
          listPageSize: normalizeListPageSize(listPageSize),
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  async getAdminProblemById(id: string) {
    return this.problems().findOne({ _id: id });
  }

  // 创建站内题目元数据，不涉及 judge 机测试数据目录。
  async createProblem(input: ProblemInput) {
    const now = new Date();
    const problem = buildProblemDocument(input, now);
    await this.problems().insertOne(problem);
    return problem;
  }

  async updateProblem(id: string, input: ProblemInput) {
    await this.problems().updateOne(
      { _id: id },
      {
        $set: buildProblemUpdateFields(input, new Date()),
      },
    );
  }

  // 当前最小实现里，发布题目就是把 isVisible 设为 true。
  async publishProblem(id: string) {
    await this.problems().updateOne(
      { _id: id },
      {
        $set: {
          isVisible: true,
          updatedAt: new Date(),
        },
      },
    );
  }

  async listPublishedProblemSets() {
    return this.problemSets()
      .find({ isPublished: true })
      .sort({ publishedAt: -1, createdAt: -1 })
      .toArray();
  }

  async getPublishedProblemSetById(id: string) {
    return this.problemSets().findOne({ _id: id, isPublished: true });
  }

  async listAdminProblemSets() {
    return this.problemSets().find({}).sort({ createdAt: -1 }).toArray();
  }

  async getAdminProblemSetById(id: string) {
    return this.problemSets().findOne({ _id: id });
  }

  async createProblemSet(input: ProblemSetInput) {
    const now = new Date();
    const problemSet = buildProblemSetDocument(input, now);
    await this.problemSets().insertOne(problemSet);
    return problemSet;
  }

  async updateProblemSet(id: string, input: ProblemSetInput) {
    await this.problemSets().updateOne(
      { _id: id },
      {
        $set: buildProblemSetUpdateFields(input, new Date()),
      },
    );
  }

  async publishProblemSet(id: string) {
    const now = new Date();
    await this.problemSets().updateOne(
      { _id: id },
      {
        $set: {
          isPublished: true,
          publishedAt: now,
          updatedAt: now,
        },
      },
    );
  }

  // 审核通过时记录审核人和审核时间。
  async approveUser(userId: string, adminUserId: string) {
    const now = new Date();
    await this.users().updateOne(
      { _id: userId },
      {
        $set: {
          approvalStatus: 'approved',
          approvedBy: adminUserId,
          approvedAt: now,
          rejectedReason: null,
          updatedAt: now,
        },
      },
    );
  }

  async rejectUser(userId: string, adminUserId: string, reason = 'Rejected by admin') {
    const now = new Date();
    await this.users().updateOne(
      { _id: userId },
      {
        $set: {
          approvalStatus: 'rejected',
          approvedBy: adminUserId,
          approvedAt: now,
          rejectedReason: reason,
          updatedAt: now,
        },
      },
    );
  }

  // 用户修改班级后重新回到待审核状态。
  async updateUserClassName(userId: string, className: string) {
    const classRecord = await this.classes().findOne({ name: className, isActive: true });
    if (!classRecord) {
      throw new Error(`class ${className} is not available`);
    }

    const now = new Date();
    await this.users().updateOne(
      { _id: userId },
      {
        $set: {
          className,
          approvalStatus: 'pending',
          approvedBy: null,
          approvedAt: null,
          rejectedReason: null,
          updatedAt: now,
        },
      },
    );
  }

  async resetUserPassword(userId: string, password: string) {
    await this.users().updateOne(
      { _id: userId },
      {
        $set: {
          passwordHash: hashPassword(password),
          updatedAt: new Date(),
        },
      },
    );
  }

  async updateMyPassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.users().findOne({ _id: userId });
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      throw new Error('invalid current password');
    }

    await this.resetUserPassword(userId, newPassword);
  }

  async deleteUser(userId: string) {
    const user = await this.users().findOne({ _id: userId });
    if (user?.role === 'admin') {
      throw new Error('cannot delete admin user');
    }

    await this.users().deleteOne({ _id: userId });
    await this.sessions().deleteMany({ userId });
  }
}

// HTML 表单里语言先是 string，这里收窄回 AppLanguage。
export function toAppLanguage(value: string): AppLanguage {
  if (value === 'cpp' || value === 'python') {
    return value;
  }
  throw new Error(`unsupported app language: ${value}`);
}
