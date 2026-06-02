import {
  argon2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { ObjectId } from 'mongodb';
import type { Collection, Filter } from 'mongodb';
import type {
  ClassDocument,
  GradeDocument,
  SessionDocument,
  UserDocument,
} from '@roj/shared';

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

export interface AdminUserListFilters {
  q?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  className?: string;
}

function escapeRegexText(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildAdminUserListFilter(
  filters: AdminUserListFilters = {},
): Filter<UserDocument> {
  const query: Filter<UserDocument> = {};
  const text = filters.q?.trim();
  const className = filters.className?.trim();

  if (text) {
    const searchPattern = new RegExp(escapeRegexText(text), 'i');
    query.$or = [
      { username: searchPattern },
      { name: searchPattern },
    ];
  }

  if (filters.approvalStatus) {
    query.approvalStatus = filters.approvalStatus;
  }

  if (className) {
    query.className = className;
  }

  return query;
}

// 密码以 argon2id 形式存储。
export function hashPassword(password: string): string {
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
export function verifyPassword(password: string, passwordHash: string): boolean {
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

export function buildStudentUserDocument(input: RegisterUserInput, now: Date): UserDocument {
  return {
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
}

export function mapUserToSessionRecord(user: UserDocument): SessionUserRecord {
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

export function buildSessionDocument(userId: string, now: Date, ttlMs: number): SessionDocument {
  return {
    _id: new ObjectId().toHexString(),
    token: randomBytes(24).toString('hex'),
    userId,
    expiresAt: new Date(now.getTime() + ttlMs),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildApproveUserUpdate(adminUserId: string, now: Date) {
  return {
    approvalStatus: 'approved' as const,
    approvedBy: adminUserId,
    approvedAt: now,
    rejectedReason: null,
    updatedAt: now,
  };
}

export function buildRejectUserUpdate(adminUserId: string, reason: string, now: Date) {
  return {
    approvalStatus: 'rejected' as const,
    approvedBy: adminUserId,
    approvedAt: now,
    rejectedReason: reason,
    updatedAt: now,
  };
}

export function buildUserClassNameUpdate(className: string, now: Date) {
  return {
    className,
    approvalStatus: 'pending' as const,
    approvedBy: null,
    approvedAt: null,
    rejectedReason: null,
    updatedAt: now,
  };
}

export function buildResetPasswordUpdate(password: string, now: Date) {
  return {
    passwordHash: hashPassword(password),
    updatedAt: now,
  };
}

export interface UserCollections {
  users: Collection<UserDocument>;
  sessions: Collection<SessionDocument>;
  grades: Collection<GradeDocument>;
  classes: Collection<ClassDocument>;
}

export async function getDemoUser(collections: Pick<UserCollections, 'users'>) {
  return collections.users.findOne({ username: 'demo' });
}

export async function registerUser(collections: UserCollections, input: RegisterUserInput) {
  const grade = await collections.grades.findOne({ name: input.grade, isActive: true });
  if (!grade) {
    throw new Error(`grade ${input.grade} is not available`);
  }
  const classRecord = await collections.classes.findOne({
    name: input.className,
    isActive: true,
  });
  if (!classRecord) {
    throw new Error(`class ${input.className} is not available`);
  }

  const now = new Date();
  const user = buildStudentUserDocument(input, now);

  await collections.users.insertOne(user);
  return user;
}

export async function loginUser(
  collections: Pick<UserCollections, 'users'>,
  username: string,
  password: string,
): Promise<SessionUserRecord | null> {
  const user = await collections.users.findOne({ username });
  if (!user) {
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return mapUserToSessionRecord(user);
}

export async function createSession(
  collections: Pick<UserCollections, 'sessions'>,
  userId: string,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
) {
  const now = new Date();
  const session = buildSessionDocument(userId, now, ttlMs);

  await collections.sessions.insertOne(session);
  return session;
}

export async function destroySession(
  collections: Pick<UserCollections, 'sessions'>,
  token: string | null,
) {
  if (!token) {
    return;
  }
  await collections.sessions.deleteOne({ token });
}

export async function getUserBySessionToken(
  collections: Pick<UserCollections, 'sessions' | 'users'>,
  token: string | null,
): Promise<SessionUserRecord | null> {
  if (!token) {
    return null;
  }

  const now = new Date();
  const session = await collections.sessions.findOne({
    token,
    expiresAt: { $gt: now },
  });
  if (!session) {
    return null;
  }

  const user = await collections.users.findOne({ _id: session.userId });
  if (!user) {
    return null;
  }

  return mapUserToSessionRecord(user);
}

export async function listUsersForAdmin(collections: Pick<UserCollections, 'users'>) {
  return collections.users.find({}).sort({ createdAt: -1 }).toArray();
}

export async function listUsersForAdminPaginated(
  collections: Pick<UserCollections, 'users'>,
  input: {
    page: number;
    pageSize: number;
    filters?: AdminUserListFilters;
  },
) {
  const skip = (input.page - 1) * input.pageSize;
  const query = buildAdminUserListFilter(input.filters);
  const [items, total] = await Promise.all([
    collections.users
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(input.pageSize)
      .toArray(),
    collections.users.countDocuments(query),
  ]);

  return { items, total };
}

export async function approveUser(
  collections: Pick<UserCollections, 'users'>,
  userId: string,
  adminUserId: string,
) {
  const now = new Date();
  await collections.users.updateOne(
    { _id: userId },
    {
      $set: buildApproveUserUpdate(adminUserId, now),
    },
  );
}

export async function rejectUser(
  collections: Pick<UserCollections, 'users'>,
  userId: string,
  adminUserId: string,
  reason = 'Rejected by admin',
) {
  const now = new Date();
  await collections.users.updateOne(
    { _id: userId },
    {
      $set: buildRejectUserUpdate(adminUserId, reason, now),
    },
  );
}

export async function updateUserClassName(
  collections: Pick<UserCollections, 'users' | 'classes'>,
  userId: string,
  className: string,
) {
  const classRecord = await collections.classes.findOne({ name: className, isActive: true });
  if (!classRecord) {
    throw new Error(`class ${className} is not available`);
  }

  const now = new Date();
  await collections.users.updateOne(
    { _id: userId },
    {
      $set: buildUserClassNameUpdate(className, now),
    },
  );
}

export async function resetUserPassword(
  collections: Pick<UserCollections, 'users'>,
  userId: string,
  password: string,
) {
  await collections.users.updateOne(
    { _id: userId },
    {
      $set: buildResetPasswordUpdate(password, new Date()),
    },
  );
}

export async function updateMyPassword(
  collections: Pick<UserCollections, 'users'>,
  userId: string,
  currentPassword: string,
  newPassword: string,
) {
  const user = await collections.users.findOne({ _id: userId });
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
    throw new Error('invalid current password');
  }

  await resetUserPassword(collections, userId, newPassword);
}

export async function deleteUser(
  collections: Pick<UserCollections, 'users' | 'sessions'>,
  userId: string,
) {
  const user = await collections.users.findOne({ _id: userId });
  if (user?.role === 'admin') {
    throw new Error('cannot delete admin user');
  }

  await collections.users.deleteOne({ _id: userId });
  await collections.sessions.deleteMany({ userId });
}
