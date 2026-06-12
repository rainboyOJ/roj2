import type { RojDb } from '@roj/db';

import type { UserServices } from '../../service-types.ts';
import {
  mapAdminUser,
  mapSessionUser,
} from '../mappers.ts';
import { buildPaginationViewModel } from '../pagination.ts';

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
