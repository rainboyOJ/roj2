import type { FastifyInstance } from 'fastify';

import { DEFAULT_PAGE_SIZE, type RouteContext } from '../http/context.ts';
import {
  createGradeSchema,
  createProblemSchema,
  enabledLanguagesSchema,
  resetPasswordSchema,
} from '../http/schemas.ts';

export function registerAdminRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    parsePage,
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

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

  app.get('/admin/users', async (request, reply) => {
    // 用户审核页：支持批量审核，也支持行内单个审核。
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const users = await services.listAdminUsers();
    return renderPage(request, reply, 'admin-users.pug', { currentUser: user, users });
  });

  app.post('/admin/users/:id/reset-password', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid password payload');
    }

    const params = request.params as { id: string };
    await services.resetUserPassword(params.id, parsed.data.password);
    return redirectTo(reply, '/admin/users');
  });

  app.post('/admin/users/:id/delete', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.deleteUser(params.id);
    return redirectTo(reply, '/admin/users');
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
    return redirectTo(reply, '/admin/grades');
  });

  app.post('/admin/grades/:id', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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
    return redirectTo(reply, '/admin/grades');
  });

  app.post('/admin/users/bulk-approve', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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

    return redirectTo(reply, '/admin/users');
  });

  app.post('/admin/users/bulk-reject', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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

    return redirectTo(reply, '/admin/users');
  });

  app.get('/admin/problems', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const problems = await services.listAdminProblems();
    return renderPage(request, reply, 'admin-problems.pug', { problems });
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

    const result = await services.listAdminSubmissions({
      page: parsePage(request.query),
      pageSize: DEFAULT_PAGE_SIZE,
    });
    return renderPage(request, reply, 'admin-submissions.pug', { ...result });
  });

  app.get('/api/admin/users', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }
    return {
      users: await services.listAdminUsers(),
    };
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

  app.post('/api/admin/users/:id/reset-password', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
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

    return {
      ...(await services.listAdminSubmissions({
        page: parsePage(request.query),
        pageSize: DEFAULT_PAGE_SIZE,
      })),
    };
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
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
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
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      problems: await services.listAdminProblems(),
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

  app.post('/api/admin/settings/languages', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
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
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
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
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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
    return redirectTo(reply, '/admin/problems');
  });

  app.put('/api/admin/problems/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
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
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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

  app.post('/admin/problems/:id/publish', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.publishProblem(params.id);
    return redirectTo(reply, '/admin/problems');
  });

  app.post('/admin/settings/languages', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
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
    return redirectTo(reply, '/admin/settings/languages');
  });
}
