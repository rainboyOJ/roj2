import type {
  ApiServerServices,
  PaginatedSubmissionsViewModel,
  SessionUser,
  SubmissionViewModel,
} from '../src/app.ts';

export const USER_SESSION_TOKEN = 'token-1';
export const ADMIN_SESSION_TOKEN = 'admin-token';

export function sessionCookie(token = USER_SESSION_TOKEN) {
  return `roj_session=${token}`;
}

export function adminSessionCookie(token = ADMIN_SESSION_TOKEN) {
  return sessionCookie(token);
}

export function studentUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'user-1',
    username: 'alice',
    role: 'student',
    approvalStatus: 'approved',
    name: 'Alice',
    grade: '2025',
    className: '1 班',
    ...overrides,
  };
}

export function adminUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return {
    id: 'admin-1',
    username: 'admin',
    role: 'admin',
    approvalStatus: 'approved',
    name: 'Admin',
    grade: '2025',
    className: 'System',
    ...overrides,
  };
}

export function paginated(
  submissions: Array<Omit<SubmissionViewModel, 'canViewSourceCode'> & {
    canViewSourceCode?: boolean;
  }> = [],
  total = submissions.length,
): PaginatedSubmissionsViewModel {
  return {
    submissions: submissions.map((submission) => ({
      canViewSourceCode: true,
      ...submission,
    })),
    pagination: {
      page: 1,
      pageSize: 20,
      total,
      totalPages: Math.max(1, Math.ceil(total / 20)),
      previousPage: null,
      nextPage: total > 20 ? 2 : null,
    },
  };
}

export function createTestServices(
  overrides: Partial<ApiServerServices> = {},
): ApiServerServices {
  const services: ApiServerServices = {
    createSubmission: async () => ({
      id: 'sub-1',
      publicId: '42',
      submissionNo: 42,
      status: 'PENDING_DISPATCH',
      verdict: 'PENDING',
      score: 0,
    }),
    listProblems: async () => [],
    listProblemsPaginated: async (pagination) => {
      const problems = await services.listProblems();
      const totalPages = Math.max(1, Math.ceil(problems.length / pagination.pageSize));
      return {
        problems,
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: problems.length,
          totalPages,
          previousPage: pagination.page > 1 ? pagination.page - 1 : null,
          nextPage: pagination.page < totalPages ? pagination.page + 1 : null,
        },
      };
    },
    listProblemsByPids: async () => [],
    listProblemProgressByUser: async () => new Map(),
    getProblemByPid: async () => null,
    listPublishedProblemSets: async () => [],
    getPublishedProblemSetById: async () => null,
    listAdminProblemSets: async () => [],
    getAdminProblemSetById: async () => null,
    createProblemSet: async () => ({ id: 'problem-set-1' }),
    updateProblemSet: async () => undefined,
    publishProblemSet: async () => undefined,
    hideProblemSet: async () => undefined,
    deleteProblemSet: async () => undefined,
    getSubmissionById: async () => null,
    listSubmissions: async () => paginated(),
    registerUser: async () => ({
      id: 'user-1',
      username: 'alice',
      approvalStatus: 'pending',
    }),
    loginUser: async () => ({
      token: USER_SESSION_TOKEN,
      user: studentUser(),
    }),
    logoutUser: async () => undefined,
    getCurrentUser: async () => studentUser(),
    listAdminUsers: async () => [],
    listAdminUsersPaginated: async (pagination) => ({
      users: [],
      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total: 0,
        totalPages: 1,
        previousPage: null,
        nextPage: null,
      },
    }),
    approveUser: async () => undefined,
    rejectUser: async () => undefined,
    listAdminSubmissions: async () => paginated(),
    listRanklist: async () => [],
    listContests: async () => [],
    getContestById: async () => null,
    listGrades: async () => [],
    createGrade: async () => ({
      id: 'grade-1',
      name: '2027',
      isActive: true,
      order: 4,
    }),
    updateGrade: async () => undefined,
    listClasses: async () => [],
    listActiveClasses: async () => [],
    createClass: async () => ({
      id: 'class-1',
      name: '1 班',
      isActive: true,
      order: 1,
    }),
    updateClass: async () => undefined,
    getEnabledLanguages: async () => ['cpp', 'python'],
    updateEnabledLanguages: async () => undefined,
    getPaginationSettings: async () => ({
      listPageSize: 20,
      allowedPageSizes: [20, 50, 100],
    }),
    updateListPageSize: async () => undefined,
    listAdminProblems: async () => [],
    getAdminProblemById: async () => null,
    createProblem: async () => ({
      id: 'problem-1',
      pid: '1001',
    }),
    updateProblem: async () => undefined,
    publishProblem: async () => undefined,
    updateProfileClassName: async () => undefined,
    resetUserPassword: async () => undefined,
    deleteUser: async () => undefined,
    updateMyPassword: async () => undefined,
  };
  return Object.assign(services, overrides);
}
