import { describe, expect, it } from 'vitest';

import {
  buildSessionDocument,
  buildStudentUserDocument,
  hashPassword,
  mapUserToSessionRecord,
  verifyPassword,
} from '../src/index.ts';

describe('password helpers', () => {
  it('hashes and verifies argon2id passwords', () => {
    const hash = hashPassword('secret123');

    expect(hash).toMatch(/^argon2id:[0-9a-f]+:[0-9a-f]+$/);
    expect(verifyPassword('secret123', hash)).toBe(true);
    expect(verifyPassword('wrong', hash)).toBe(false);
    expect(verifyPassword('secret123', 'legacy-hash')).toBe(false);
  });
});

describe('user document helpers', () => {
  it('builds a pending student user document', () => {
    const now = new Date('2026-05-29T00:00:00.000Z');
    const user = buildStudentUserDocument({
      username: 'alice',
      name: 'Alice',
      gender: 'female',
      className: '1 班',
      grade: '2025',
      password: 'secret123',
    }, now);

    expect(user).toMatchObject({
      username: 'alice',
      name: 'Alice',
      gender: 'female',
      className: '1 班',
      grade: '2025',
      role: 'student',
      approvalStatus: 'pending',
      approvedBy: null,
      approvedAt: null,
      rejectedReason: null,
      createdAt: now,
      updatedAt: now,
    });
    expect(user._id).toEqual(expect.any(String));
    expect(verifyPassword('secret123', user.passwordHash)).toBe(true);
  });

  it('maps a user document to the session user shape', () => {
    const now = new Date('2026-05-29T00:00:00.000Z');
    const user = buildStudentUserDocument({
      username: 'alice',
      name: 'Alice',
      gender: 'female',
      className: '1 班',
      grade: '2025',
      password: 'secret123',
    }, now);

    expect(mapUserToSessionRecord(user)).toEqual({
      id: user._id,
      username: 'alice',
      role: 'student',
      approvalStatus: 'pending',
      name: 'Alice',
      grade: '2025',
      className: '1 班',
    });
  });

  it('builds an expiring session document', () => {
    const now = new Date('2026-05-29T00:00:00.000Z');
    const session = buildSessionDocument('user-1', now, 60_000);

    expect(session).toMatchObject({
      userId: 'user-1',
      expiresAt: new Date('2026-05-29T00:01:00.000Z'),
      createdAt: now,
      updatedAt: now,
    });
    expect(session._id).toEqual(expect.any(String));
    expect(session.token).toHaveLength(48);
  });
});
