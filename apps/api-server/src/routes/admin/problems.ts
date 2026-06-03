import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../../http/context.ts';
import { messageFromError } from '../../http/form-errors.ts';
import { sendValidationError } from '../../http/validation.ts';
import { createProblemSchema } from '../../http/schemas.ts';
import { querySuffixWithoutPage, readEnumQuery, readTrimmedQuery } from '../../http/query.ts';
import type { AdminProblemListFilters } from '../../service-types.ts';
import {
  adminProblemsPath,
  adminProblemsQueryParts,
  problemFormValues,
  problemInputFromBody,
} from './form-parsers.ts';
import { handleAdminHtmlFormAction } from './html-form-action.ts';

function parseAdminProblemListFilters(query: unknown): AdminProblemListFilters {
  const filters: AdminProblemListFilters = {};
  const q = readTrimmedQuery(query, 'q');
  const visibility = readEnumQuery(query, 'visibility', ['visible', 'hidden'] as const);

  if (q) {
    filters.q = q;
  }
  if (visibility) {
    filters.visibility = visibility;
  }

  return filters;
}

function adminProblemListContext(query: unknown) {
  const queryParts = adminProblemsQueryParts(query);
  const currentQuerySuffix = querySuffixWithoutPage(queryParts);
  const actionQuery = currentQuerySuffix ? `?${currentQuerySuffix}` : '';

  return {
    listPath: adminProblemsPath(query),
    currentQuerySuffix: actionQuery,
    actionQuery,
  };
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
      ...adminProblemListContext(request.query),
    });
  }

  app.get('/admin/problems', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const filters = parseAdminProblemListFilters(request.query);
    const problems = await services.listAdminProblems(filters);
    return renderPage(request, reply, 'admin-problems.pug', {
      problems,
      filters,
      ...adminProblemListContext(request.query),
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
      ...adminProblemListContext(request.query),
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
      ...adminProblemListContext(request.query),
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
    return handleAdminHtmlFormAction({
      schema: createProblemSchema,
      rawBody: raw,
      inputFromBody: problemInputFromBody,
      formValues: problemFormValues,
      validationMessage: '题目信息填写不正确，请至少填写题号、标题、题面并选择一种语言。',
      failureMessage: '创建题目失败，请检查后重试。',
      action: async (input) => {
        await services.createProblem(input);
      },
      renderError: (formProblem, formError) => renderProblemFormError(
        request,
        reply,
        'create',
        formProblem,
        formError,
      ),
      redirect: () => redirectTo(reply, adminProblemsPath(request.query)),
    });
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
    return handleAdminHtmlFormAction({
      schema: createProblemSchema,
      rawBody: raw,
      inputFromBody: problemInputFromBody,
      formValues: (body) => problemFormValues(body, params.id),
      validationMessage: '题目信息填写不正确，请至少填写题号、标题、题面并选择一种语言。',
      failureMessage: '保存题目失败，请检查后重试。',
      action: async (input) => {
        await services.updateProblem(params.id, input);
      },
      renderError: (formProblem, formError) => renderProblemFormError(
        request,
        reply,
        'edit',
        formProblem,
        formError,
      ),
      redirect: () => redirectTo(reply, adminProblemsPath(request.query)),
    });
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
    return redirectTo(reply, adminProblemsPath(request.query));
  });
}
