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

export interface DbConfig {
  uri: string;
  dbName: string;
}

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

export interface RegisterUserInput {
  username: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  className: string;
  grade: string;
  password: string;
}

export interface SessionUserRecord {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  name: string;
}

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

    return result;
  }

  async saveJudgeAck(localSubmissionId: string, ack: JudgeSnapshotPersistInput) {
    const now = new Date();
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

  async saveJudgeSnapshot(localSubmissionId: string, snapshot: JudgeSnapshotPersistInput) {
    const now = new Date();
    const mapped = mapJudgeSnapshotToSubmissionState(snapshot);
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

  async markSubmissionFailed(localSubmissionId: string, message: string) {
    const now = new Date();
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

export function toAppLanguage(value: string): AppLanguage {
  if (value === 'cpp' || value === 'python') {
    return value;
  }
  throw new Error(`unsupported app language: ${value}`);
}
