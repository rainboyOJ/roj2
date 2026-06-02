import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../../http/context.ts';
import { messageFromError } from '../../http/form-errors.ts';
import { sendValidationError } from '../../http/validation.ts';
import { createProblemSchema } from '../../http/schemas.ts';
import type { AdminProblemListFilters } from '../../service-types.ts';
import {
  problemFormValues,
  problemInputFromBody,
} from './form-parsers.ts';

function parseAdminProblemListFilters(query: unknown): AdminProblemListFilters {
  if (typeof query !== 'object' || query === null) {
    return {};
  }

  const raw = query as { q?: unknown; visibility?: unknown };
  const q = Array.isArray(raw.q) ? raw.q[0] : raw.q;
  const visibility = Array.isArray(raw.visibility) ? raw.visibility[0] : raw.visibility;
  const filters: AdminProblemListFilters = {};

  if (typeof q === 'string' && q.trim()) {
    filters.q = q.trim();
  }
  if (visibility === 'visible' || visibility === 'hidden') {
    filters.visibility = visibility;
  }

  return filters;
}

export function registerAdminProblemRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

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

  app.get('/admin/problems', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const filters = parseAdminProblemListFilters(request.query);
    const problems = await services.listAdminProblems(filters);
    return renderPage(request, reply, 'admin-problems.pug', { problems, filters });
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

  app.get('/api/admin/problems', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      problems: await services.listAdminProblems(parseAdminProblemListFilters(request.query)),
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

  app.post('/admin/problems', async (request, reply) => {
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

  app.post('/admin/problems/:id/publish', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    try {
      await services.publishProblem(params.id);
    } catch (error) {
      const filters = parseAdminProblemListFilters(request.query);
      const problems = await services.listAdminProblems(filters);
      reply.code(400);
      return renderPage(request, reply, 'admin-problems.pug', {
        problems,
        filters,
        formError: messageFromError(error, '发布题目失败，请检查后重试。'),
      });
    }
    return redirectTo(reply, '/admin/problems');
  });
}
