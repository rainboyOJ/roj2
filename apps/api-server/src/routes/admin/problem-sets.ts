import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../../http/context.ts';
import { messageFromError } from '../../http/form-errors.ts';
import { sendValidationError } from '../../http/validation.ts';
import { createProblemSetSchema } from '../../http/schemas.ts';
import {
  adminProblemSetsPath,
  problemSetFormValues,
  problemSetInputFromBody,
} from './form-parsers.ts';

export function registerAdminProblemSetRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

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
      returnPath: adminProblemSetsPath(request.query),
    });
  }

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
      returnPath: adminProblemSetsPath(request.query),
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
      returnPath: adminProblemSetsPath(request.query),
    });
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
    return redirectTo(reply, adminProblemSetsPath(request.query));
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
    return redirectTo(reply, adminProblemSetsPath(request.query));
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

  app.post('/api/admin/problem-sets/:id/hide', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.hideProblemSet(params.id);
    return reply.send({ ok: true });
  });

  app.delete('/api/admin/problem-sets/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.deleteProblemSet(params.id);
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
    return redirectTo(reply, adminProblemSetsPath(request.query));
  });

  app.post('/admin/problem-sets/:id/hide', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    try {
      await services.hideProblemSet(params.id);
    } catch (error) {
      const problemSets = await services.listAdminProblemSets();
      reply.code(400);
      return renderPage(request, reply, 'admin-problem-sets.pug', {
        problemSets,
        formError: messageFromError(error, '隐藏题目单失败，请检查后重试。'),
      });
    }
    return redirectTo(reply, adminProblemSetsPath(request.query));
  });

  app.post('/admin/problem-sets/:id/delete', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    try {
      await services.deleteProblemSet(params.id);
    } catch (error) {
      const problemSets = await services.listAdminProblemSets();
      reply.code(400);
      return renderPage(request, reply, 'admin-problem-sets.pug', {
        problemSets,
        formError: messageFromError(error, '删除题目单失败，请检查后重试。'),
      });
    }
    return redirectTo(reply, adminProblemSetsPath(request.query));
  });
}
