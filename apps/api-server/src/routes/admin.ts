import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../http/context.ts';
import { messageFromError } from '../http/form-errors.ts';
import { sendValidationError } from '../http/validation.ts';
import {
  createClassSchema,
  createGradeSchema,
  createProblemSchema,
  createProblemSetSchema,
  enabledLanguagesSchema,
  paginationSettingsSchema,
  resetPasswordSchema,
} from '../http/schemas.ts';
import {
  type AdminFormBody,
  adminUsersPath,
  dictionaryFormValues,
  dictionaryInputFromBody,
  enabledLanguagesInputFromBody,
  paginationSettingsInputFromBody,
  parseUserIds,
  problemFormValues,
  problemInputFromBody,
  problemSetFormValues,
  problemSetInputFromBody,
} from './admin/form-parsers.ts';

export function registerAdminRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    parsePage,
    parsePageSize,
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

  async function renderAdminUsersError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, user: { id: string }, formError: string) {
    const paginationSettings = await services.getPaginationSettings();
    const result = await services.listAdminUsersPaginated({
      page: parsePage(request.query),
      pageSize: paginationSettings.listPageSize,
    });
    reply.code(400);
    return renderPage(request, reply, 'admin-users.pug', {
      currentUser: user,
      ...result,
      formError,
    });
  }

  async function renderAdminGradesError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string, formValues?: Record<string, string>) {
    const grades = await services.listGrades();
    reply.code(400);
    return renderPage(request, reply, 'admin-grades.pug', {
      grades,
      formError,
      formValues,
    });
  }

  async function renderAdminClassesError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string, formValues?: Record<string, string>) {
    const classes = await services.listClasses();
    reply.code(400);
    return renderPage(request, reply, 'admin-classes.pug', {
      classes,
      formError,
      formValues,
    });
  }

  async function renderLanguageSettingsError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string) {
    const enabledLanguages = await services.getEnabledLanguages();
    reply.code(400);
    return renderPage(request, reply, 'admin-language-settings.pug', {
      settings: { enabledLanguages },
      formError,
    });
  }

  async function renderPaginationSettingsError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string) {
    const settings = await services.getPaginationSettings();
    reply.code(400);
    return renderPage(request, reply, 'admin-pagination-settings.pug', {
      settings,
      formError,
    });
  }

  function renderProblemFormError(
    request: Parameters<typeof renderPage>[0],
    reply: FastifyReply,
    mode: 'create' | 'edit',
    problem: {
      id: string;
      pid: string;
      title: string;
      statementMarkdown: string;
      allowLanguages: string[];
      isVisible: boolean;
    },
    formError: string,
  ) {
    reply.code(400);
    return renderPage(request, reply, 'admin-problem-form.pug', {
      mode,
      problem,
      formError,
    });
  }

  function renderProblemSetFormError(
    request: Parameters<typeof renderPage>[0],
    reply: FastifyReply,
    mode: 'create' | 'edit',
    problemSet: {
      id: string;
      title: string;
      contentMarkdown: string;
    },
    formError: string,
  ) {
    reply.code(400);
    return renderPage(request, reply, 'admin-problem-set-form.pug', {
      mode,
      problemSet,
      formError,
    });
  }

  app.get('/admin', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'admin-dashboard.pug');
  });

  app.get('/admin/settings/languages', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const enabledLanguages = await services.getEnabledLanguages();
    return renderPage(request, reply, 'admin-language-settings.pug', {
      settings: { enabledLanguages },
    });
  });

  app.get('/admin/settings/pagination', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'admin-pagination-settings.pug', {
      settings: await services.getPaginationSettings(),
    });
  });

  app.get('/admin/users', async (request, reply) => {
    // 用户审核页：支持批量审核，也支持行内单个审核。
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const paginationSettings = await services.getPaginationSettings();
    const result = await services.listAdminUsersPaginated({
      page: parsePage(request.query),
      pageSize: paginationSettings.listPageSize,
    });
    return renderPage(request, reply, 'admin-users.pug', { currentUser: user, ...result });
  });

  app.post('/admin/users/:id/reset-password', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return renderAdminUsersError(request, reply, user, '新密码至少需要 8 个字符。');
    }

    const params = request.params as { id: string };
    try {
      await services.resetUserPassword(params.id, parsed.data.password);
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '重置密码失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.post('/admin/users/:id/delete', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    try {
      await services.deleteUser(params.id);
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '删除用户失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.get('/admin/grades', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const grades = await services.listGrades();
    return renderPage(request, reply, 'admin-grades.pug', { grades });
  });

  app.post('/admin/grades', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = createGradeSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminGradesError(request, reply, '年级信息填写不正确。', dictionaryFormValues(raw));
    }

    try {
      await services.createGrade(parsed.data);
    } catch (error) {
      return renderAdminGradesError(
        request,
        reply,
        messageFromError(error, '创建年级失败，请检查后重试。'),
        dictionaryFormValues(raw),
      );
    }
    return redirectTo(reply, '/admin/grades');
  });

  app.post('/admin/grades/:id', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    const raw = request.body as AdminFormBody;
    const parsed = createGradeSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminGradesError(request, reply, '年级信息填写不正确。');
    }

    try {
      await services.updateGrade(params.id, parsed.data);
    } catch (error) {
      return renderAdminGradesError(
        request,
        reply,
        messageFromError(error, '保存年级失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/grades');
  });

  app.get('/admin/classes', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const classes = await services.listClasses();
    return renderPage(request, reply, 'admin-classes.pug', { classes });
  });

  app.post('/admin/classes', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = createClassSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminClassesError(request, reply, '班级信息填写不正确。', dictionaryFormValues(raw));
    }

    try {
      await services.createClass(parsed.data);
    } catch (error) {
      return renderAdminClassesError(
        request,
        reply,
        messageFromError(error, '创建班级失败，请检查后重试。'),
        dictionaryFormValues(raw),
      );
    }
    return redirectTo(reply, '/admin/classes');
  });

  app.post('/admin/classes/:id', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    const raw = request.body as AdminFormBody;
    const parsed = createClassSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminClassesError(request, reply, '班级信息填写不正确。');
    }

    try {
      await services.updateClass(params.id, parsed.data);
    } catch (error) {
      return renderAdminClassesError(
        request,
        reply,
        messageFromError(error, '保存班级失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/classes');
  });

  app.post('/admin/users/bulk-approve', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return renderAdminUsersError(request, reply, user, '请先选择需要通过的用户。');
    }

    // 批量审核目前直接串行循环，先保持实现简单清楚。
    try {
      for (const userId of userIds) {
        await services.approveUser(userId, user.id);
      }
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '审核用户失败，请检查后重试。'),
      );
    }

    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.post('/admin/users/bulk-reject', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return renderAdminUsersError(request, reply, user, '请先选择需要拒绝的用户。');
    }

    try {
      for (const userId of userIds) {
        await services.rejectUser(userId, user.id);
      }
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '拒绝用户失败，请检查后重试。'),
      );
    }

    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.get('/admin/problems', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const problems = await services.listAdminProblems();
    return renderPage(request, reply, 'admin-problems.pug', { problems });
  });

  app.get('/admin/problem-sets', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const problemSets = await services.listAdminProblemSets();
    return renderPage(request, reply, 'admin-problem-sets.pug', { problemSets });
  });

  app.get('/admin/problem-sets/new', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'admin-problem-set-form.pug', {
      mode: 'create',
      problemSet: {
        id: '',
        title: '',
        contentMarkdown: '',
      },
    });
  });

  app.get('/admin/problem-sets/:id/edit', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    const problemSet = await services.getAdminProblemSetById(params.id);
    if (!problemSet) {
      return reply.code(404).send('Problem set not found');
    }

    return renderPage(request, reply, 'admin-problem-set-form.pug', {
      mode: 'edit',
      problemSet,
    });
  });

  app.get('/admin/problems/new', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const paginationSettings = await services.getPaginationSettings();
    const result = await services.listAdminSubmissions({
      page: parsePage(request.query),
      pageSize: paginationSettings.listPageSize,
    });
    return renderPage(request, reply, 'admin-submissions.pug', { ...result });
  });

  app.get('/api/admin/users', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }
    const paginationSettings = await services.getPaginationSettings();
    return services.listAdminUsersPaginated({
      page: parsePage(request.query),
      pageSize: parsePageSize(request.query, paginationSettings.listPageSize),
    });
  });

  app.post('/api/admin/users/:id/approve', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.approveUser(params.id, user.id);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/:id/reject', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.rejectUser(params.id, user.id);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/bulk-approve', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return reply.code(400).send({ message: 'No users selected' });
    }

    for (const userId of userIds) {
      await services.approveUser(userId, user.id);
    }
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/bulk-reject', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return reply.code(400).send({ message: 'No users selected' });
    }

    for (const userId of userIds) {
      await services.rejectUser(userId, user.id);
    }
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/:id/reset-password', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid password payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.resetUserPassword(params.id, parsed.data.password);
    return reply.send({ ok: true });
  });

  app.delete('/api/admin/users/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.deleteUser(params.id);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/submissions', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const paginationSettings = await services.getPaginationSettings();
    return services.listAdminSubmissions({
      page: parsePage(request.query),
      pageSize: parsePageSize(request.query, paginationSettings.listPageSize),
    });
  });

  app.get('/api/admin/grades', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      grades: await services.listGrades(),
    };
  });

  app.post('/api/admin/grades', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createGradeSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid grade payload', parsed.error.issues);
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
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createGradeSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid grade payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.updateGrade(params.id, parsed.data);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/classes', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      classes: await services.listClasses(),
    };
  });

  app.post('/api/admin/classes', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createClassSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid class payload', parsed.error.issues);
    }

    const created = await services.createClass(parsed.data);
    return reply.code(201).send({
      classId: created.id,
      name: created.name,
      isActive: created.isActive,
      order: created.order,
    });
  });

  app.put('/api/admin/classes/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createClassSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid class payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.updateClass(params.id, parsed.data);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/problems', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      problems: await services.listAdminProblems(),
    };
  });

  app.get('/api/admin/problem-sets', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      problemSets: await services.listAdminProblemSets(),
    };
  });

  app.get('/api/admin/settings/languages', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      enabledLanguages: await services.getEnabledLanguages(),
    };
  });

  app.get('/api/admin/settings/pagination', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return services.getPaginationSettings();
  });

  app.post('/api/admin/settings/languages', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = enabledLanguagesSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid language settings payload', parsed.error.issues);
    }

    await services.updateEnabledLanguages(parsed.data.enabledLanguages);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/settings/pagination', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = paginationSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid pagination settings payload', parsed.error.issues);
    }

    await services.updateListPageSize(parsed.data.listPageSize);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/problems', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createProblemSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid problem payload', parsed.error.issues);
    }

    const created = await services.createProblem(parsed.data);
    return reply.code(201).send({
      problemId: created.id,
      pid: created.pid,
    });
  });

  app.post('/api/admin/problem-sets', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createProblemSetSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid problem set payload', parsed.error.issues);
    }

    const created = await services.createProblemSet(parsed.data);
    return reply.code(201).send({
      problemSetId: created.id,
    });
  });

  app.post('/admin/problem-sets', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as Record<string, string | undefined>;
    const parsed = createProblemSetSchema.safeParse(problemSetInputFromBody(raw));
    const formProblemSet = problemSetFormValues(raw);
    if (!parsed.success) {
      return renderProblemSetFormError(
        request,
        reply,
        'create',
        formProblemSet,
        '题目单信息填写不正确，请填写标题和内容。',
      );
    }

    try {
      await services.createProblemSet(parsed.data);
    } catch (error) {
      return renderProblemSetFormError(
        request,
        reply,
        'create',
        formProblemSet,
        messageFromError(error, '创建题目单失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/problem-sets');
  });

  app.post('/admin/problems', async (request, reply) => {
    // 页面表单提交不会自动把 checkbox 变成 zod 想要的数组格式，
    // 所以这里先手工整理 allowLanguages。
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as Record<string, string | string[] | undefined>;
    const parsed = createProblemSchema.safeParse(problemInputFromBody(raw));
    const formProblem = problemFormValues(raw);
    if (!parsed.success) {
      return renderProblemFormError(
        request,
        reply,
        'create',
        formProblem,
        '题目信息填写不正确，请至少填写题号、标题、题面并选择一种语言。',
      );
    }

    try {
      await services.createProblem(parsed.data);
    } catch (error) {
      return renderProblemFormError(
        request,
        reply,
        'create',
        formProblem,
        messageFromError(error, '创建题目失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/problems');
  });

  app.put('/api/admin/problems/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createProblemSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid problem payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.updateProblem(params.id, parsed.data);
    return reply.send({ ok: true });
  });

  app.put('/api/admin/problem-sets/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createProblemSetSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid problem set payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.updateProblemSet(params.id, parsed.data);
    return reply.send({ ok: true });
  });

  app.post('/admin/problem-sets/:id', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    const raw = request.body as Record<string, string | undefined>;
    const parsed = createProblemSetSchema.safeParse(problemSetInputFromBody(raw));
    const formProblemSet = problemSetFormValues(raw, params.id);
    if (!parsed.success) {
      return renderProblemSetFormError(
        request,
        reply,
        'edit',
        formProblemSet,
        '题目单信息填写不正确，请填写标题和内容。',
      );
    }

    try {
      await services.updateProblemSet(params.id, parsed.data);
    } catch (error) {
      return renderProblemSetFormError(
        request,
        reply,
        'edit',
        formProblemSet,
        messageFromError(error, '保存题目单失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/problem-sets');
  });

  app.post('/admin/problems/:id', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    const raw = request.body as Record<string, string | string[] | undefined>;
    const parsed = createProblemSchema.safeParse(problemInputFromBody(raw));
    const formProblem = problemFormValues(raw, params.id);
    if (!parsed.success) {
      return renderProblemFormError(
        request,
        reply,
        'edit',
        formProblem,
        '题目信息填写不正确，请至少填写题号、标题、题面并选择一种语言。',
      );
    }

    try {
      await services.updateProblem(params.id, parsed.data);
    } catch (error) {
      return renderProblemFormError(
        request,
        reply,
        'edit',
        formProblem,
        messageFromError(error, '保存题目失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/problems');
  });

  app.post('/api/admin/problems/:id/publish', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.publishProblem(params.id);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/problem-sets/:id/publish', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.publishProblemSet(params.id);
    return reply.send({ ok: true });
  });

  app.post('/admin/problem-sets/:id/publish', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    try {
      await services.publishProblemSet(params.id);
    } catch (error) {
      const problemSets = await services.listAdminProblemSets();
      reply.code(400);
      return renderPage(request, reply, 'admin-problem-sets.pug', {
        problemSets,
        formError: messageFromError(error, '发布题目单失败，请检查后重试。'),
      });
    }
    return redirectTo(reply, '/admin/problem-sets');
  });

  app.post('/admin/problems/:id/publish', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    try {
      await services.publishProblem(params.id);
    } catch (error) {
      const problems = await services.listAdminProblems();
      reply.code(400);
      return renderPage(request, reply, 'admin-problems.pug', {
        problems,
        formError: messageFromError(error, '发布题目失败，请检查后重试。'),
      });
    }
    return redirectTo(reply, '/admin/problems');
  });

  app.post('/admin/settings/languages', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = enabledLanguagesSchema.safeParse(enabledLanguagesInputFromBody(raw));
    if (!parsed.success) {
      return renderLanguageSettingsError(request, reply, '至少选择一种可用语言。');
    }

    try {
      await services.updateEnabledLanguages(parsed.data.enabledLanguages);
    } catch (error) {
      return renderLanguageSettingsError(
        request,
        reply,
        messageFromError(error, '保存语言设置失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/settings/languages');
  });

  app.post('/admin/settings/pagination', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = paginationSettingsSchema.safeParse(paginationSettingsInputFromBody(raw));
    if (!parsed.success) {
      return renderPaginationSettingsError(request, reply, '请选择有效的每页数量。');
    }

    try {
      await services.updateListPageSize(parsed.data.listPageSize);
    } catch (error) {
      return renderPaginationSettingsError(
        request,
        reply,
        messageFromError(error, '保存分页设置失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/settings/pagination');
  });
}
