import type { PaginationViewModel } from './common.ts';

export interface SessionUser {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  name?: string | undefined;
  grade?: string | undefined;
  className?: string | undefined;
}

export interface AdminUserListFilters {
  q?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  className?: string;
}

export interface PaginatedAdminUsersViewModel {
  users: SessionUser[];
  pagination: PaginationViewModel;
  filters?: AdminUserListFilters;
}

export interface UserServices {
  registerUser(input: {
    username: string;
    name: string;
    gender: 'male' | 'female';
    className: string;
    grade: string;
    password: string;
  }): Promise<{
    id: string;
    username: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
  }>;
  loginUser(input: {
    username: string;
    password: string;
  }): Promise<{
    token: string;
    user: SessionUser;
  }>;
  logoutUser(token: string | null): Promise<void>;
  getCurrentUser(token: string | null): Promise<SessionUser | null>;
  listAdminUsers(): Promise<SessionUser[]>;
  listAdminUsersPaginated(pagination: {
    page: number;
    pageSize: number;
  }, filters?: AdminUserListFilters): Promise<PaginatedAdminUsersViewModel>;
  approveUser(userId: string, adminUserId: string): Promise<void>;
  rejectUser(userId: string, adminUserId: string, reason?: string): Promise<void>;
  updateProfileClassName(userId: string, className: string): Promise<void>;
  resetUserPassword(userId: string, password: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  updateMyPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}
