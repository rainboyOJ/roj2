import { RojDb } from '@roj/db';

import {
  buildApp,
  type ApiServerServices,
  type ProblemViewModel,
  type SessionUser,
  type SubmissionViewModel,
} from './app.ts';
import type { CreateSubmissionInput } from '@roj/shared';

function mapProblem(problem: {
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: string[];
}): ProblemViewModel {
  return {
    pid: problem.pid,
    title: problem.title,
    statementMarkdown: problem.statementMarkdown,
    allowLanguages: problem.allowLanguages,
  };
}

function mapSubmission(submission: {
  _id: string;
  status: string;
  verdict: string;
  judge: {
    lastStatus: string | null;
  };
  result: {
    message: string;
  };
}): SubmissionViewModel {
  return {
    id: submission._id,
    status: submission.status,
    verdict: submission.verdict,
    judgeStatus: submission.judge.lastStatus,
    message: submission.result.message,
  };
}

function mapSessionUser(user: {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
}): SessionUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    approvalStatus: user.approvalStatus,
  };
}

export async function buildProductionServices(db: RojDb): Promise<ApiServerServices> {
  return {
    createSubmission: async (input: CreateSubmissionInput) => {
      const created = await db.createSubmission(input);
      return {
        id: created._id,
        status: created.status,
        verdict: created.verdict,
      };
    },
    listProblems: async () => {
      const problems = await db.listVisibleProblems();
      return problems.map(mapProblem);
    },
    getProblemByPid: async (pid: string) => {
      const problem = await db.getProblemByPid(pid);
      return problem ? mapProblem(problem) : null;
    },
    getSubmissionById: async (id: string) => {
      const submission = await db.getSubmissionById(id);
      return submission ? mapSubmission(submission) : null;
    },
    listSubmissions: async (user) => {
      const submissions =
        user.role === 'admin'
          ? await db.listAllSubmissions()
          : await db.listSubmissionsByUser(user.id);
      return submissions.map(mapSubmission);
    },
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
      return users.map((user) => ({
        id: user._id,
        username: user.username,
        role: user.role,
        approvalStatus: user.approvalStatus,
        name: user.name,
      }));
    },
    approveUser: async (userId, adminUserId) => {
      await db.approveUser(userId, adminUserId);
    },
    rejectUser: async (userId, adminUserId, reason) => {
      await db.rejectUser(userId, adminUserId, reason);
    },
    listAdminSubmissions: async () => {
      const submissions = await db.listAllSubmissions();
      return submissions.map(mapSubmission);
    },
    listGrades: async () => {
      const grades = await db.listGrades();
      return grades.map((grade) => ({
        id: grade._id,
        name: grade.name,
        isActive: grade.isActive,
        order: grade.order,
      }));
    },
    createGrade: async (input) => {
      const grade = await db.createGrade(input);
      return {
        id: grade._id,
        name: grade.name,
        isActive: grade.isActive,
        order: grade.order,
      };
    },
    updateGrade: async (id, input) => {
      await db.updateGrade(id, input);
    },
    listAdminProblems: async () => {
      const problems = await db.listAdminProblems();
      return problems.map(mapProblem);
    },
    createProblem: async (input) => {
      const problem = await db.createProblem(input);
      return {
        id: problem._id,
        pid: problem.pid,
      };
    },
    updateProblem: async (id, input) => {
      await db.updateProblem(id, input);
    },
    publishProblem: async (id) => {
      await db.publishProblem(id);
    },
    updateProfileClassName: async (userId, className) => {
      await db.updateUserClassName(userId, className);
    },
    resetUserPassword: async (userId, password) => {
      await db.resetUserPassword(userId, password);
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const db = new RojDb({
    uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB ?? 'roj_demo',
  });

  await db.connect();
  await db.ensureIndexes();

  const services = await buildProductionServices(db);
  const app = buildApp(services);
  const port = Number(process.env.PORT ?? '3000');
  const host = process.env.HOST ?? '127.0.0.1';

  await app.listen({
    host,
    port,
  });

  console.log(`api-server listening on http://${host}:${port}`);
}

export * from './app.ts';
