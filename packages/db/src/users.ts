import {
  argon2Sync,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { ObjectId } from 'mongodb';
import type { SessionDocument, UserDocument } from '@roj/shared';

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
