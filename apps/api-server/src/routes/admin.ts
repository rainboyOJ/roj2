import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../http/context.ts';
import { messageFromError } from '../http/form-errors.ts';
import { sendValidationError } from '../http/validation.ts';
import {
  createProblemSchema,
  createProblemSetSchema,
} from '../http/schemas.ts';
import { registerAdminDictionaryRoutes } from './admin/dictionaries.ts';
import { registerAdminSettingsRoutes } from './admin/settings.ts';
import { registerAdminUserRoutes } from './admin/users.ts';
import {
  type AdminFormBody,
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

  registerAdminSettingsRoutes(app, context);
  registerAdminUserRoutes(app, context);
  registerAdminDictionaryRoutes(app, context);

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

}
