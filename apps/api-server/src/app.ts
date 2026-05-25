// 这个文件是整个 HTTP / HTML 层的中心。
// 它负责：
// - 定义页面路由
// - 定义 JSON API 路由
// - 做登录态检查、管理员权限检查
// - 渲染 Pug 模板
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import formbody from '@fastify/formbody';
import view from '@fastify/view';
import Fastify from 'fastify';
import pug from 'pug';
import { OJSubmissionStatuses, type SubmissionCaseResult } from '@roj/shared';
import type { AppLanguage } from '@roj/shared';
import { z } from 'zod';

import { createViewContext, resolveUiLang, type UiLang } from './view-i18n.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 用 zod 把用户提交的表单 / JSON 先做一层结构校验。
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

const enabledLanguagesSchema = z.object({
  enabledLanguages: z.array(z.enum(['cpp', 'python'])).min(1),
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

const updateMyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export interface CreateSubmissionResult {
  id: string;
  publicId: string;
  submissionNo: number | null;
  status: string;
  verdict: string;
}

export interface ProblemViewModel {
  pid: string;
  title: string;
  statementMarkdown: string;
  statementHtml: string;
  allowLanguages: string[];
}

export interface LanguageSettingsViewModel {
  enabledLanguages: AppLanguage[];
}

export interface SessionUser {
  id: string;
  username: string;
  role: 'student' | 'admin';
  approvalStatus: 'pending' | 'approved' | 'rejected';
}

export interface SubmissionViewModel {
  id: string;
  publicId: string;
  submissionNo: number | null;
  userId: string;
  pid: string;
  problemTitle: string;
  problemLabel: string;
  username: string;
  displayName: string | undefined;
  language: string;
  sourceCode: string;
  status: string;
  verdict: string;
  score: number;
  judgeStatus?: string | null;
  message?: string;
  caseResults: SubmissionCaseResult[];
}

export interface GradeViewModel {
  id: string;
  name: string;
  isActive: boolean;
  order: number;
}

export interface RanklistEntryViewModel {
  rank: number;
  username: string;
  acceptedCount: number;
  submissionCount: number;
  lastAcceptedAt: string | null;
}

export interface ContestViewModel {
  id: string;
  title: string;
  status: string;
  startAtText: string;
  endAtText: string;
  description: string;
}

export interface AdminProblemViewModel extends ProblemViewModel {
  id: string;
  isVisible: boolean;
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
  listRanklist(): Promise<RanklistEntryViewModel[]>;
  listContests(): Promise<ContestViewModel[]>;
  getContestById(id: string): Promise<ContestViewModel | null>;
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
  getEnabledLanguages(): Promise<readonly AppLanguage[]>;
  updateEnabledLanguages(enabledLanguages: AppLanguage[]): Promise<void>;
  listAdminProblems(): Promise<AdminProblemViewModel[]>;
  getAdminProblemById(id: string): Promise<AdminProblemViewModel | null>;
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
  deleteUser(userId: string): Promise<void>;
  updateMyPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
}

// 从 cookie 头里解析出 session token。
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

// 当前项目使用简单 cookie session，不引入更复杂的认证中间件。
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

function getRequestLang(request: {
  query?: unknown;
}): UiLang {
  const query = request.query;
  if (query && typeof query === 'object' && 'lang' in query) {
    return resolveUiLang((query as { lang?: unknown }).lang);
  }

  return 'zh';
}

function filterAllowedLanguages(
  allowLanguages: string[],
  enabledLanguages: readonly AppLanguage[],
): string[] {
  return allowLanguages.filter((language) =>
    enabledLanguages.includes(language as AppLanguage),
  );
}

// 保证页面跳转后还能保留当前语言。
function buildLangPath(pathname: string, lang: UiLang): string {
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}lang=${lang}`;
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

  app.get('/favicon.svg', async (_request, reply) => {
    const favicon = await readFile(path.join(__dirname, 'assets', 'favicon.svg'), 'utf-8');
    return reply.type('image/svg+xml').send(favicon);
  });

  app.get('/assets/pico.classless.min.css', async (_request, reply) => {
    const css = await readFile(path.join(__dirname, 'assets', 'pico.classless.min.css'), 'utf-8');
    return reply.type('text/css').send(css);
  });

  app.get('/assets/katex.min.css', async (_request, reply) => {
    const css = await readFile(path.join(__dirname, 'assets', 'katex.min.css'), 'utf-8');
    return reply.type('text/css').send(css);
  });

  app.get('/assets/fonts/:file', async (request, reply) => {
    const params = request.params as { file: string };
    if (!/^[A-Za-z0-9_.-]+$/.test(params.file)) {
      return reply.code(400).send('Invalid font path');
    }

    const font = await readFile(path.join(__dirname, 'assets', 'fonts', params.file));
    if (params.file.endsWith('.woff2')) {
      return reply.type('font/woff2').send(font);
    }
    if (params.file.endsWith('.woff')) {
      return reply.type('font/woff').send(font);
    }
    if (params.file.endsWith('.ttf')) {
      return reply.type('font/ttf').send(font);
    }

    return reply.code(404).send('Font not found');
  });

  async function renderPage(
    request: { query?: unknown; url: string; headers?: { cookie?: string | undefined } },
    reply: { view(template: string, data?: Record<string, unknown>): unknown },
    template: string,
    data: Record<string, unknown> = {},
  ) {
    // 所有 Pug 页面都走这个统一入口，
    // 这样模板天然就能拿到 i18n helper、当前用户和 admin 区域标记。
    const lang = getRequestLang(request);
    const currentPath = request.url || '/';
    const sessionToken = parseSessionToken(request.headers?.cookie);
    const currentUser = sessionToken ? await services.getCurrentUser(sessionToken) : null;
    const pathname = currentPath.split('?')[0] || '/';
    return reply.view(template, {
      ...createViewContext(lang, currentPath),
      currentUser,
      isAdminArea: pathname === '/admin' || pathname.startsWith('/admin/'),
      ...data,
    });
  }

  function redirectWithLang(
    request: { query?: unknown },
    reply: { redirect(location: string): unknown },
    pathname: string,
  ) {
    const lang = getRequestLang(request);
    return reply.redirect(buildLangPath(pathname, lang));
  }

  // ===== 页面路由区 =====
  app.get('/', async (request, reply) => renderPage(request, reply, 'home.pug'));

  app.get('/register', async (request, reply) => {
    const grades = (await services.listGrades()).filter((grade) => grade.isActive);
    return renderPage(request, reply, 'register.pug', { grades });
  });

  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid registration payload');
    }

    await services.registerUser(parsed.data);
    return redirectWithLang(request, reply, '/login');
  });

  app.get('/login', async (request, reply) => renderPage(request, reply, 'login.pug'));

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid login payload');
    }

    let result;
    try {
      result = await services.loginUser(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'login failed';
      return reply.code(401).send(message);
    }

    setSessionCookie(reply, result.token);
    return redirectWithLang(request, reply, '/');
  });

  app.post('/logout', async (request, reply) => {
    // HTML 流程的 logout 是表单 POST，不走 GET，避免误触发。
    const token = parseSessionToken(request.headers.cookie);
    await services.logoutUser(token);
    clearSessionCookie(reply);
    return redirectWithLang(request, reply, '/');
  });

  app.get('/profile', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }

    return renderPage(request, reply, 'profile.pug', { user });
  });

  app.post('/profile/password', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }

    const raw = request.body as Record<string, string | undefined>;
    const parsed = updateMyPasswordSchema.safeParse({
      currentPassword: raw.currentPassword,
      newPassword: raw.newPassword,
    });
    if (!parsed.success) {
      return reply.code(400).send('Invalid password payload');
    }

    try {
      await services.updateMyPassword(
        user.id,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to update password';
      return reply.code(400).send(message);
    }

    return redirectWithLang(request, reply, '/profile');
  });

  app.get('/admin', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    return renderPage(request, reply, 'admin-dashboard.pug');
  });

  app.get('/admin/settings/languages', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const enabledLanguages = await services.getEnabledLanguages();
    return renderPage(request, reply, 'admin-language-settings.pug', {
      settings: { enabledLanguages },
    });
  });

  app.get('/admin/users', async (request, reply) => {
    // 用户审核页：支持批量审核，也支持行内单个审核。
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const users = await services.listAdminUsers();
    return renderPage(request, reply, 'admin-users.pug', { currentUser: user, users });
  });

  app.post('/admin/users/:id/reset-password', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid password payload');
    }

    const params = request.params as { id: string };
    await services.resetUserPassword(params.id, parsed.data.password);
    return redirectWithLang(request, reply, '/admin/users');
  });

  app.post('/admin/users/:id/delete', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const params = request.params as { id: string };
    await services.deleteUser(params.id);
    return redirectWithLang(request, reply, '/admin/users');
  });

  app.get('/admin/grades', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const grades = await services.listGrades();
    return renderPage(request, reply, 'admin-grades.pug', { grades });
  });

  app.post('/admin/grades', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const raw = request.body as Record<string, string | undefined>;
    const parsed = createGradeSchema.safeParse({
      name: raw.name,
      isActive: raw.isActive === 'true',
      order: Number(raw.order ?? '0'),
    });
    if (!parsed.success) {
      return reply.code(400).send('Invalid grade payload');
    }

    await services.createGrade(parsed.data);
    return redirectWithLang(request, reply, '/admin/grades');
  });

  app.post('/admin/grades/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const params = request.params as { id: string };
    const raw = request.body as Record<string, string | undefined>;
    const parsed = createGradeSchema.safeParse({
      name: raw.name,
      isActive: raw.isActive === 'true',
      order: Number(raw.order ?? '0'),
    });
    if (!parsed.success) {
      return reply.code(400).send('Invalid grade payload');
    }

    await services.updateGrade(params.id, parsed.data);
    return redirectWithLang(request, reply, '/admin/grades');
  });

  app.post('/admin/users/bulk-approve', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const raw = request.body as { userIds?: string | string[] };
    const userIds = Array.isArray(raw.userIds)
      ? raw.userIds
      : raw.userIds
        ? [raw.userIds]
        : [];

    // 批量审核目前直接串行循环，先保持实现简单清楚。
    for (const userId of userIds) {
      await services.approveUser(userId, user.id);
    }

    return redirectWithLang(request, reply, '/admin/users');
  });

  app.post('/admin/users/bulk-reject', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const raw = request.body as { userIds?: string | string[] };
    const userIds = Array.isArray(raw.userIds)
      ? raw.userIds
      : raw.userIds
        ? [raw.userIds]
        : [];

    for (const userId of userIds) {
      await services.rejectUser(userId, user.id);
    }

    return redirectWithLang(request, reply, '/admin/users');
  });

  app.get('/admin/problems', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const problems = await services.listAdminProblems();
    return renderPage(request, reply, 'admin-problems.pug', { problems });
  });

  app.get('/admin/problems/new', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    return renderPage(request, reply, 'admin-problem-form.pug', {
      mode: 'create',
      problem: {
        id: '',
        pid: '',
        title: '',
        statementMarkdown: '',
        allowLanguages: ['cpp', 'python'],
        isVisible: false,
      },
    });
  });

  app.get('/admin/problems/:id/edit', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const params = request.params as { id: string };
    const problem = await services.getAdminProblemById(params.id);
    if (!problem) {
      return reply.code(404).send('Problem not found');
    }

    return renderPage(request, reply, 'admin-problem-form.pug', {
      mode: 'edit',
      problem,
    });
  });

  app.get('/admin/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const submissions = await services.listAdminSubmissions();
    return renderPage(request, reply, 'admin-submissions.pug', { submissions });
  });

  app.get('/problems', async (request, reply) => {
    const [problems, enabledLanguages] = await Promise.all([
      services.listProblems(),
      services.getEnabledLanguages(),
    ]);

    return renderPage(request, reply, 'problems.pug', {
      problems: problems.map((problem) => ({
        ...problem,
        allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
      })),
    });
  });

  app.get('/ranklist', async (request, reply) => {
    const entries = await services.listRanklist();
    return renderPage(request, reply, 'ranklist.pug', { entries });
  });

  app.get('/contests', async (request, reply) => {
    const contests = await services.listContests();
    return renderPage(request, reply, 'contests.pug', { contests });
  });

  app.get('/contests/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const contest = await services.getContestById(params.id);
    if (!contest) {
      return reply.code(404).send('Contest not found');
    }

    return renderPage(request, reply, 'contest-detail.pug', { contest });
  });

  app.get('/problem/:pid', async (request, reply) => {
    const params = request.params as { pid: string };
    const problem = await services.getProblemByPid(params.pid);
    if (!problem) {
      return reply.code(404).send('Problem not found');
    }
    const enabledLanguages = await services.getEnabledLanguages();

    return renderPage(request, reply, 'problem.pug', {
      problem: {
        ...problem,
        allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
      },
    });
  });

  app.get('/submissions/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }

    const params = request.params as { id: string };
    const submission = await services.getSubmissionById(params.id);
    if (!submission) {
      return reply.code(404).send('Submission not found');
    }
    if (user.role !== 'admin' && submission.userId !== user.id) {
      return reply.code(403).send('Forbidden');
    }

    return renderPage(request, reply, 'submission.pug', { submission });
  });

  app.get('/submissions', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }

    const submissions = await services.listSubmissions(user);
    return renderPage(request, reply, 'submissions.pug', { submissions });
  });

  app.get('/api/problems', async () => {
    const [problems, enabledLanguages] = await Promise.all([
      services.listProblems(),
      services.getEnabledLanguages(),
    ]);

    return problems.map((problem) => ({
      ...problem,
      allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
    }));
  });

  app.get('/api/problems/:pid', async (request, reply) => {
    const params = request.params as { pid: string };
    const problem = await services.getProblemByPid(params.pid);
    if (!problem) {
      return reply.code(404).send({ message: 'Problem not found' });
    }
    const enabledLanguages = await services.getEnabledLanguages();
    return {
      ...problem,
      allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
    };
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
    if (user.role !== 'admin' && submission.userId !== user.id) {
      return reply.code(403).send({ message: 'Forbidden' });
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
    // API 模式下，创建 submission 后立刻返回 submissionId；
    // 真正评测由独立 dispatcher 异步完成。
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
    const enabledLanguages = await services.getEnabledLanguages();
    if (!enabledLanguages.includes(parsed.data.language)) {
      return reply.code(400).send({
        message: `language ${parsed.data.language} is disabled`,
      });
    }

    const created = await services.createSubmission({
      userId: user.id,
      ...parsed.data,
    });
    return reply.code(201).send({
      submissionId: created.publicId,
      submissionNo: created.submissionNo,
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

  app.post('/api/me/password', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }

    const parsed = updateMyPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid password payload',
        issues: parsed.error.issues,
      });
    }

    try {
      await services.updateMyPassword(
        user.id,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to update password';
      return reply.code(400).send({ message });
    }
    return reply.send({ ok: true });
  });

  // ===== 管理端 JSON API 区 =====
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

  app.delete('/api/admin/users/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const params = request.params as { id: string };
    await services.deleteUser(params.id);
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

  app.get('/api/admin/settings/languages', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    return {
      enabledLanguages: await services.getEnabledLanguages(),
    };
  });

  app.post('/api/admin/settings/languages', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Login required' });
    }
    if (user.role !== 'admin') {
      return reply.code(403).send({ message: 'Admin required' });
    }

    const parsed = enabledLanguagesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid language settings payload',
        issues: parsed.error.issues,
      });
    }

    await services.updateEnabledLanguages(parsed.data.enabledLanguages);
    return reply.send({ ok: true });
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

  app.post('/admin/problems', async (request, reply) => {
    // 页面表单提交不会自动把 checkbox 变成 zod 想要的数组格式，
    // 所以这里先手工整理 allowLanguages。
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const raw = request.body as Record<string, string | string[] | undefined>;
    const languages = Array.isArray(raw.allowLanguages)
      ? raw.allowLanguages
      : raw.allowLanguages
        ? [raw.allowLanguages]
        : [];

    const parsed = createProblemSchema.safeParse({
      pid: raw.pid,
      title: raw.title,
      statementMarkdown: raw.statementMarkdown,
      allowLanguages: languages,
      isVisible: raw.isVisible === 'true',
    });
    if (!parsed.success) {
      return reply.code(400).send('Invalid problem payload');
    }

    await services.createProblem(parsed.data);
    return redirectWithLang(request, reply, '/admin/problems');
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

  app.post('/admin/problems/:id', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const params = request.params as { id: string };
    const raw = request.body as Record<string, string | string[] | undefined>;
    const languages = Array.isArray(raw.allowLanguages)
      ? raw.allowLanguages
      : raw.allowLanguages
        ? [raw.allowLanguages]
        : [];

    const parsed = createProblemSchema.safeParse({
      pid: raw.pid,
      title: raw.title,
      statementMarkdown: raw.statementMarkdown,
      allowLanguages: languages,
      isVisible: raw.isVisible === 'true',
    });
    if (!parsed.success) {
      return reply.code(400).send('Invalid problem payload');
    }

    await services.updateProblem(params.id, parsed.data);
    return redirectWithLang(request, reply, '/admin/problems');
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

  app.post('/admin/problems/:id/publish', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const params = request.params as { id: string };
    await services.publishProblem(params.id);
    return redirectWithLang(request, reply, '/admin/problems');
  });

  app.post('/admin/settings/languages', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role !== 'admin') {
      return reply.code(403).send('Forbidden');
    }

    const raw = request.body as { enabledLanguages?: string | string[] };
    const enabledLanguages = Array.isArray(raw.enabledLanguages)
      ? raw.enabledLanguages
      : raw.enabledLanguages
        ? [raw.enabledLanguages]
        : [];

    const parsed = enabledLanguagesSchema.safeParse({ enabledLanguages });
    if (!parsed.success) {
      return reply.code(400).send('Invalid language settings payload');
    }

    await services.updateEnabledLanguages(parsed.data.enabledLanguages);
    return redirectWithLang(request, reply, '/admin/settings/languages');
  });

  app.post('/submissions', async (request, reply) => {
    // 页面提交流程和 API 提交流程的核心逻辑一样，
    // 区别只在于这里最终跳转到 submission 详情页。
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return redirectWithLang(request, reply, '/login');
    }
    if (user.role === 'student' && user.approvalStatus !== 'approved') {
      return reply.code(403).send('Approval required');
    }

    const parsed = createSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid submission payload');
    }
    const enabledLanguages = await services.getEnabledLanguages();
    if (!enabledLanguages.includes(parsed.data.language)) {
      return reply.code(400).send(`language ${parsed.data.language} is disabled`);
    }

    const created = await services.createSubmission({
      userId: user.id,
      ...parsed.data,
    });
    return redirectWithLang(request, reply, `/submissions/${created.publicId}`);
  });

  return app;
}

// 页面层判断 submission 是否终态时，只关心 OJ 自己的状态。
export function isSubmissionTerminal(status: string) {
  return (
    status === OJSubmissionStatuses.FINISHED ||
    status === OJSubmissionStatuses.FAILED
  );
}
