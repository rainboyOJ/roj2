// 这个文件是项目的数据访问层，负责所有 MongoDB 读写。
import {
  argon2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { ObjectId } from 'mongodb';
import {
  OJSubmissionStatuses,
  SubmissionVerdicts,
  createEmptyJudgeState,
  createEmptyResultState,
  mapJudgeSnapshotToSubmissionState,
  type AppLanguage,
  type CreateSubmissionInput,
  type GradeDocument,
  type ProblemDocument,
  type SessionDocument,
  type SubmissionDocument,
  type UserDocument,
} from '@roj/shared';
import { MongoClient } from 'mongodb';

function debugJudge(message: string, details?: Record<string, unknown>) {
  if (process.env.DEBUG_JUDGE !== '1') {
    return;
  }

  const suffix = details ? ` ${JSON.stringify(details)}` : '';
  console.log(`[DEBUG] [db] ${message}${suffix}`);
}

// 抢占待评测 submission 时使用的原子更新。
export function buildLeaseUpdate(leaseOwner: string, now: Date, leaseMs: number) {
  return {
    $set: {
      status: OJSubmissionStatuses.SENT_TO_JUDGE,
      'judge.leaseOwner': leaseOwner,
      'judge.leaseExpireAt': new Date(now.getTime() + leaseMs),
      updatedAt: now,
    },
  };
}

// MongoDB 连接配置。
export interface DbConfig {
  uri: string;
  dbName: string;
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
  gender: 'male' | 'female' | 'other';
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

  grades() {
    return this.db.collection<GradeDocument>('grades');
  }

  sessions() {
    return this.db.collection<SessionDocument>('sessions');
  }

  submissions() {
    return this.db.collection<SubmissionDocument>('submissions');
  }

  // 初始化项目需要的索引。
  async ensureIndexes() {
    await this.users().createIndex({ username: 1 }, { unique: true });
    await this.grades().createIndex({ name: 1 }, { unique: true });
    await this.sessions().createIndex({ token: 1 }, { unique: true });
    await this.sessions().createIndex({ expiresAt: 1 });
    await this.problems().createIndex({ pid: 1 }, { unique: true });
    await this.submissions().createIndex({ userId: 1, createdAt: -1 });
    await this.submissions().createIndex({ pid: 1, createdAt: -1 });
    await this.submissions().createIndex({ status: 1, 'judge.leaseExpireAt': 1 });
    await this.submissions().createIndex({ 'judge.submissionId': 1 });
  }

  // 初始化演示数据。
  async seedDemoData() {
    const now = new Date();
    const demoUserId = new ObjectId().toHexString();
    const adminUserId = new ObjectId().toHexString();
    const demoProblemId = new ObjectId().toHexString();

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

    await this.users().updateOne(
      { username: 'admin' },
      {
        $set: {
          username: 'admin',
          name: 'Administrator',
          gender: 'other',
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
          gender: 'other',
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

    await this.problems().updateOne(
      { pid: '1000' },
      {
        $set: {
          pid: '1000',
          title: 'A + B Problem',
          statementMarkdown: 'Input two integers and print their sum.',
          allowLanguages: ['cpp', 'python'],
          isVisible: true,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: demoProblemId,
          createdAt: now,
        },
      },
      { upsert: true },
    );
  }

  async listVisibleProblems() {
    return this.problems().find({ isVisible: true }).sort({ pid: 1 }).toArray();
  }

  async getProblemByPid(pid: string) {
    return this.problems().findOne({ pid, isVisible: true });
  }

  async getDemoUser() {
    return this.users().findOne({ username: 'demo' });
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
    if (!problem.allowLanguages.includes(input.language)) {
      throw new Error(`language ${input.language} is not allowed for ${input.pid}`);
    }

    const now = new Date();
    const submission: SubmissionDocument = {
      _id: new ObjectId().toHexString(),
      userId: user._id,
      problemId: problem._id,
      pid: problem.pid,
      username: user.username,
      displayName: user.name,
      language: input.language,
      sourceCode: input.sourceCode,
      status: OJSubmissionStatuses.PENDING_DISPATCH,
      verdict: SubmissionVerdicts.PENDING,
      judge: createEmptyJudgeState(),
      result: createEmptyResultState(),
      createdAt: now,
      updatedAt: now,
    };

    await this.submissions().insertOne(submission);
    debugJudge('submission created', {
      localSubmissionId: submission._id,
      pid: submission.pid,
      userId: submission.userId,
      language: submission.language,
    });
    return submission;
  }

  async getSubmissionById(id: string) {
    return this.submissions().findOne({ _id: id });
  }

  async listSubmissionsByUser(userId: string) {
    return this.submissions().find({ userId }).sort({ createdAt: -1 }).toArray();
  }

  async listAllSubmissions() {
    return this.submissions().find({}).sort({ createdAt: -1 }).toArray();
  }

  // 简化版排行榜，直接基于 submissions 汇总。
  async buildSimpleRanklist() {
    const submissions = await this.submissions().find({}).toArray();
    const rows = new Map<string, {
      username: string;
      acceptedCount: number;
      submissionCount: number;
      wrongAttempts: number;
      lastAcceptedAt: Date | null;
    }>();

    for (const submission of submissions) {
      const key = submission.username;
      const current = rows.get(key) ?? {
        username: submission.username,
        acceptedCount: 0,
        submissionCount: 0,
        wrongAttempts: 0,
        lastAcceptedAt: null,
      };

      current.submissionCount += 1;
      if (submission.verdict === SubmissionVerdicts.AC) {
        current.acceptedCount += 1;
        if (!current.lastAcceptedAt || submission.updatedAt < current.lastAcceptedAt) {
          current.lastAcceptedAt = submission.updatedAt;
        }
      } else if (submission.verdict !== SubmissionVerdicts.PENDING) {
        current.wrongAttempts += 1;
      }

      rows.set(key, current);
    }

    return Array.from(rows.values()).sort((a, b) => {
      if (b.acceptedCount !== a.acceptedCount) {
        return b.acceptedCount - a.acceptedCount;
      }
      if (a.wrongAttempts !== b.wrongAttempts) {
        return a.wrongAttempts - b.wrongAttempts;
      }
      const aTime = a.lastAcceptedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.lastAcceptedAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) {
        return aTime - bTime;
      }
      return a.username.localeCompare(b.username);
    });
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
    debugJudge('save judge snapshot', {
      localSubmissionId,
      judgeSubmissionId: snapshot.submissionId,
      judgeStatus: snapshot.status,
      ojStatus: mapped.status,
      verdict: mapped.verdict,
      cases: snapshot.case_results.length,
    });
    await this.submissions().updateOne(
      { _id: localSubmissionId },
      {
        $set: {
          status: mapped.status,
          verdict: mapped.verdict,
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
          'judge.lastStatus': 'FAILED',
          'judge.lastMessage': message,
          'judge.finishedAt': now,
          'judge.leaseOwner': null,
          'judge.leaseExpireAt': null,
          'result.message': message,
          updatedAt: now,
        },
        $inc: {
          'judge.retryCount': 1,
        },
      },
    );
  }

  // 学生注册后默认进入待审核状态。
  async registerUser(input: RegisterUserInput) {
    const grade = await this.grades().findOne({ name: input.grade, isActive: true });
    if (!grade) {
      throw new Error(`grade ${input.grade} is not available`);
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
    };
  }

  async listUsersForAdmin() {
    return this.users().find({}).sort({ createdAt: -1 }).toArray();
  }

  async listGrades() {
    return this.grades().find({}).sort({ order: 1 }).toArray();
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

  async listAdminProblems() {
    return this.problems().find({}).sort({ pid: 1 }).toArray();
  }

  async getAdminProblemById(id: string) {
    return this.problems().findOne({ _id: id });
  }

  // 创建站内题目元数据，不涉及 judge 机测试数据目录。
  async createProblem(input: {
    pid: string;
    title: string;
    statementMarkdown: string;
    allowLanguages: AppLanguage[];
    isVisible: boolean;
  }) {
    const now = new Date();
    const problem: ProblemDocument = {
      _id: new ObjectId().toHexString(),
      pid: input.pid,
      title: input.title,
      statementMarkdown: input.statementMarkdown,
      allowLanguages: input.allowLanguages,
      isVisible: input.isVisible,
      createdAt: now,
      updatedAt: now,
    };
    await this.problems().insertOne(problem);
    return problem;
  }

  async updateProblem(id: string, input: {
    pid: string;
    title: string;
    statementMarkdown: string;
    allowLanguages: AppLanguage[];
    isVisible: boolean;
  }) {
    await this.problems().updateOne(
      { _id: id },
      {
        $set: {
          pid: input.pid,
          title: input.title,
          statementMarkdown: input.statementMarkdown,
          allowLanguages: input.allowLanguages,
          isVisible: input.isVisible,
          updatedAt: new Date(),
        },
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
}

// HTML 表单里语言先是 string，这里收窄回 AppLanguage。
export function toAppLanguage(value: string): AppLanguage {
  if (value === 'cpp' || value === 'python') {
    return value;
  }
  throw new Error(`unsupported app language: ${value}`);
}
