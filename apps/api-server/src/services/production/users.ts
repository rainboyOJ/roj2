import type { RojDb } from '@roj/db';

import type {
  ProblemProgress,
  UserProfileProblemViewModel,
  UserServices,
} from '../../service-types.ts';
import {
  mapAdminUser,
  mapSessionUser,
} from '../mappers.ts';
import { buildPaginationViewModel } from '../pagination.ts';

function problemLabel(problem: { pid: string; title: string }) {
  return problem.title.startsWith(problem.pid)
    ? problem.title
    : `${problem.pid} ${problem.title}`;
}

function mapProfileProblem(problem: { pid: string; title: string }): UserProfileProblemViewModel {
  return {
    pid: problem.pid,
    title: problem.title,
    label: problemLabel(problem),
  };
}

function sortProfileProblems(problems: UserProfileProblemViewModel[]) {
  return problems.sort((left, right) =>
    left.pid.localeCompare(right.pid, 'zh-CN', { numeric: true }));
}

function acceptanceRateText(acceptedCount: number, attemptedCount: number) {
  if (attemptedCount === 0) {
    return '0%';
  }
  return `${Math.round((acceptedCount / attemptedCount) * 100)}%`;
}

export function buildUserServices(db: RojDb): UserServices {
  return {
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
    getPublicUserProfile: async (username) => {
      const user = await db.getUserByUsername(username);
      if (!user) {
        return null;
      }

      const progressByPid = await db.listProblemProgressByUser(user._id) as Map<
        string,
        ProblemProgress
      >;
      const visibleProblems = await db.listVisibleProblemsByPids([...progressByPid.keys()]);
      const acceptedProblems: UserProfileProblemViewModel[] = [];
      const attemptedProblems: UserProfileProblemViewModel[] = [];

      for (const problem of visibleProblems) {
        const progress = progressByPid.get(problem.pid);
        if (progress === 'accepted') {
          acceptedProblems.push(mapProfileProblem(problem));
        } else if (progress === 'attempted') {
          attemptedProblems.push(mapProfileProblem(problem));
        }
      }

      const acceptedCount = acceptedProblems.length;
      const attemptedCount = acceptedCount + attemptedProblems.length;
      return {
        user: mapAdminUser(user),
        acceptedProblems: sortProfileProblems(acceptedProblems),
        attemptedProblems: sortProfileProblems(attemptedProblems),
        acceptedCount,
        attemptedCount,
        acceptanceRateText: acceptanceRateText(acceptedCount, attemptedCount),
      };
    },
    listAdminUsers: async () => {
      const users = await db.listUsersForAdmin();
      return users.map(mapAdminUser);
    },
    listAdminUsersPaginated: async (pagination, filters = {}) => {
      const result = await db.listUsersForAdminPaginated({
        ...pagination,
        filters,
      });
      return {
        users: result.items.map(mapAdminUser),
        pagination: buildPaginationViewModel({
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: result.total,
        }),
        filters,
      };
    },
    approveUser: async (userId, adminUserId) => {
      await db.approveUser(userId, adminUserId);
    },
    rejectUser: async (userId, adminUserId, reason) => {
      await db.rejectUser(userId, adminUserId, reason);
    },
    updateProfileClassName: async (userId, className) => {
      await db.updateUserClassName(userId, className);
    },
    resetUserPassword: async (userId, password) => {
      await db.resetUserPassword(userId, password);
    },
    deleteUser: async (userId, options) => db.deleteUser(userId, options),
    updateMyPassword: async (userId, currentPassword, newPassword) => {
      await db.updateMyPassword(userId, currentPassword, newPassword);
    },
  };
}
