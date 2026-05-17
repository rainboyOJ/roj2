import path from 'node:path';
import { fileURLToPath } from 'node:url';

import formbody from '@fastify/formbody';
import view from '@fastify/view';
import Fastify from 'fastify';
import pug from 'pug';
import { OJSubmissionStatuses } from '@roj/shared';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createSubmissionSchema = z.object({
  pid: z.string().min(1),
  language: z.enum(['cpp', 'python']),
  sourceCode: z.string().min(1),
});

const registerSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]{3,24}$/),
  name: z.string().min(1),
  gender: z.enum(['male', 'female', 'other']),
  className: z.string().min(1),
  grade: z.string().min(1),
  password: z.string().min(8),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const createGradeSchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean(),
  order: z.number().int(),
});

const createProblemSchema = z.object({
  pid: z.string().min(1),
  title: z.string().min(1),
  statementMarkdown: z.string().min(1),
  allowLanguages: z.array(z.enum(['cpp', 'python'])).min(1),
  isVisible: z.boolean(),
});

const updateClassNameSchema = z.object({
  className: z.string().min(1),
});

const resetPasswordSchema = z.object({
  password: z.string().min(8),
});

export interface CreateSubmissionResult {
  id: string;
  status: string;
  verdict: string;
}

export interface ProblemViewModel {
  pid: string;
  title: string;
  statementMarkdown: string;
  allowLanguages: string[];
}

export interface SessionUser {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export interface SubmissionViewModel {
  id: string;
  status: string;
  verdict: string;
  judgeStatus?: string | null;
  message?: string;
}

export interface GradeViewModel {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface ApiServerServices {
  createSubmission(input: {
    userId: string;
    pid: string;
    language: 'cpp' | 'python';
    sourceCode: string;
  }): Promise<CreateSubmissionResult>;
  listProblems(): Promise<ProblemViewModel[]>;
  getProblemByPid(pid: string): Promise<ProblemViewModel | null>;
  getSubmissionById(id: string): Promise<SubmissionViewModel | null>;
  listSubmissions(user: SessionUser): Promise<SubmissionViewModel[]>;
  registerUser(input: {
    username: string;
    name: string;
    gender: 'male' | 'female' | 'other';
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
  listAdminUsers(): Promise<Array<SessionUser & { name?: string }>>;
  approveUser(userId: string, adminUserId: string): Promise<void>;
  rejectUser(userId: string, adminUserId: string, reason?: string): Promise<void>;
  listAdminSubmissions(): Promise<SubmissionViewModel[]>;
  listGrades(): Promise<GradeViewModel[]>;
  createGrade(input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<GradeViewModel>;
  updateGrade(id: string, input: {
    name: string;
    isActive: boolean;
    order: number;
  }): Promise<void>;
  listAdminProblems(): Promise<ProblemViewModel[]>;
  createProblem(input: {
    pid: string;
    title: string;
    statementMarkdown: string;
    allowLanguages: Array<'cpp' | 'python'>;
    isVisible: boolean;
  }): Promise<{ id: string; pid: string }>;
  updateProblem(id: string, input: {
    pid: string;
    title: string;
    statementMarkdown: string;
    allowLanguages: Array<'cpp' | 'python'>;
    isVisible: boolean;
  }): Promise<void>;
  publishProblem(id: string): Promise<void>;
  updateProfileClassName(userId: string, className: string): Promise<void>;
  resetUserPassword(userId: string, password: string): Promise<void>;
}

function parseSessionToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [rawName, ...rest] = cookie.trim().split('=');
    if (rawName === 'roj_session') {
      return rest.join('=') || null;
    }
  }

  return null;
}

function setSessionCookie(reply: {
  header(name: string, value: string): unknown;
}, token: string) {
  reply.header(
    'set-cookie',
    `roj_session=${token}; Path=/; HttpOnly; SameSite=Lax`,
  );
}

function clearSessionCookie(reply: {
  header(name: string, value: string): unknown;
}) {
  reply.header(
    'set-cookie',
    'roj_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  );
}

export function buildApp(services: ApiServerServices) {
  const app = Fastify();

  void app.register(formbody);
  void app.register(view, {
    engine: {
      pug,
    },
    root: path.join(__dirname, 'views'),
  });

  app.get('/', async (_request, reply) => reply.redirect('/problems'));

  app.get('/register', async (_request, reply) => reply.view('register.pug'));

  app.get('/login', async (_request, reply) => reply.view('login.pug'));

  app.get('/profile', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.redirect('/login');
    }

    return reply.view('profile.pug', { user });
  });

  app.get('/admin/users', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.redirect('/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const users = await services.listAdminUsers();
    return reply.view('admin-users.pug', { currentUser: user, users });
  });

  app.get('/admin/problems', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.redirect('/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const problems = await services.listAdminProblems();
    return reply.view('admin-problems.pug', { problems });
  });

  app.get('/admin/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.redirect('/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const submissions = await services.listAdminSubmissions();
    return reply.view('admin-submissions.pug', { submissions });
  });

  app.get('/problems', async (_request, reply) => {
    const problems = await services.listProblems();
    return reply.view('problems.pug', { problems });
  });

  app.get('/problem/:pid', async (request, reply) => {
    const params = request.params as { pid: string };
    const problem = await services.getProblemByPid(params.pid);
    if (!problem) {
      return reply.code(404).send('Problem not found');
    }

    return reply.view('problem.pug', { problem });
  });

  app.get('/submissions/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.redirect('/login');
    }

    const params = request.params as { id: string };
    const submission = await services.getSubmissionById(params.id);
    if (!submission) {
      return reply.code(404).send('Submission not found');
    }

    return reply.view('submission.pug', { submission });
  });

  app.get('/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.redirect('/login');
    }

    const submissions = await services.listSubmissions(user);
    return reply.view('submissions.pug', { submissions });
  });

  app.get('/api/problems', async () => services.listProblems());

  app.get('/api/problems/:pid', async (request, reply) => {
    const params = request.params as { pid: string };
    const problem = await services.getProblemByPid(params.pid);
    if (!problem) {
      return reply.code(404).send({ message: 'Problem not found' });
    }
    return problem;
  });

  app.get('/api/submissions/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }

    const params = request.params as { id: string };
    const submission = await services.getSubmissionById(params.id);
    if (!submission) {
      return reply.code(404).send({ message: 'Submission not found' });
    }
    return submission;
  });

  app.get('/api/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }

    return {
      submissions: await services.listSubmissions(user),
    };
  });

  app.post('/api/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role === 'student' && user.approvalStatus !== 'approved') {
      return reply.code(403).send({ message: 'Approval required' });
    }

    const parsed = createSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid submission payload',
        issues: parsed.error.issues,
      });
    }

    const created = await services.createSubmission({
      userId: user.id,
      ...parsed.data,
    });
    return reply.code(201).send({
      submissionId: created.id,
      status: created.status,
      verdict: created.verdict,
    });
  });

  app.post('/api/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid registration payload',
        issues: parsed.error.issues,
      });
    }

    const created = await services.registerUser(parsed.data);
    return reply.code(201).send({
      userId: created.id,
      username: created.username,
      approvalStatus: created.approvalStatus,
    });
  });

  app.post('/api/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid login payload',
        issues: parsed.error.issues,
      });
    }

    let result;
    try {
      result = await services.loginUser(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'login failed';
      return reply.code(401).send({ message });
    }
    setSessionCookie(reply, result.token);
    return reply.send({
      user: result.user,
    });
  });

  app.post('/api/logout', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    await services.logoutUser(token);
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get('/api/me', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Not logged in' });
    }
    return { user };
  });

  app.post('/api/me/class-name', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }

    const parsed = updateClassNameSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid class name payload',
        issues: parsed.error.issues,
      });
    }

    await services.updateProfileClassName(user.id, parsed.data.className);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/users', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }
    return {
      users: await services.listAdminUsers(),
    };
  });

  app.post('/api/admin/users/:id/approve', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const params = request.params as { id: string };
    await services.approveUser(params.id, user.id);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/:id/reject', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const params = request.params as { id: string };
    await services.rejectUser(params.id, user.id);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/:id/reset-password', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid password payload',
        issues: parsed.error.issues,
      });
    }

    const params = request.params as { id: string };
    await services.resetUserPassword(params.id, parsed.data.password);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    return {
      submissions: await services.listAdminSubmissions(),
    };
  });

  app.get('/api/admin/grades', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    return {
      grades: await services.listGrades(),
    };
  });

  app.post('/api/admin/grades', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const parsed = createGradeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid grade payload',
        issues: parsed.error.issues,
      });
    }

    const created = await services.createGrade(parsed.data);
    return reply.code(201).send({
      gradeId: created.id,
      name: created.name,
      isActive: created.isActive,
      order: created.order,
    });
  });

  app.put('/api/admin/grades/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const parsed = createGradeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid grade payload',
        issues: parsed.error.issues,
      });
    }

    const params = request.params as { id: string };
    await services.updateGrade(params.id, parsed.data);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/problems', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    return {
      problems: await services.listAdminProblems(),
    };
  });

  app.post('/api/admin/problems', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const parsed = createProblemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid problem payload',
        issues: parsed.error.issues,
      });
    }

    const created = await services.createProblem(parsed.data);
    return reply.code(201).send({
      problemId: created.id,
      pid: created.pid,
    });
  });

  app.put('/api/admin/problems/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const parsed = createProblemSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid problem payload',
        issues: parsed.error.issues,
      });
    }

    const params = request.params as { id: string };
    await services.updateProblem(params.id, parsed.data);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/problems/:id/publish', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const params = request.params as { id: string };
    await services.publishProblem(params.id);
    return reply.send({ ok: true });
  });

  app.post('/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.redirect('/login');
    }
    if (user.role === 'student' && user.approvalStatus !== 'approved') {
      return reply.code(403).send('Approval required');
    }

    const parsed = createSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid submission payload');
    }

    const created = await services.createSubmission({
      userId: user.id,
      ...parsed.data,
    });
    return reply.redirect(`/submissions/${created.id}`);
  });

  return app;
}

export function isSubmissionTerminal(status: string) {
  return (
    status === OJSubmissionStatuses.FINISHED ||
    status === OJSubmissionStatuses.FAILED
  );
}
