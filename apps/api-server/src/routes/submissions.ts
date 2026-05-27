import type { FastifyInstance } from 'fastify';

import { DEFAULT_PAGE_SIZE, type RouteContext } from '../http/context.ts';
import { createSubmissionSchema } from '../http/schemas.ts';

export function registerSubmissionRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    parsePage,
    renderPage,
    requireApiUser,
    requireHtmlUser,
    services,
  } = context;

  app.get('/submissions/:id', async (request, reply) => {
    const user = await requireHtmlUser(request, reply);
    if (!user) {
      return;
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
    const user = await requireHtmlUser(request, reply);
    if (!user) {
      return;
    }

    const result = await services.listSubmissions(user, {
      page: parsePage(request.query),
      pageSize: DEFAULT_PAGE_SIZE,
    });
    return renderPage(request, reply, 'submissions.pug', { ...result });
  });

  app.get('/api/submissions/:id', async (request, reply) => {
    const user = await requireApiUser(request, reply);
    if (!user) {
      return;
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
    const user = await requireApiUser(request, reply);
    if (!user) {
      return;
    }

    return services.listSubmissions(user, {
      page: parsePage(request.query),
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });

  app.post('/api/submissions', async (request, reply) => {
    // API 模式下，创建 submission 后立刻返回 submissionId；
    // 真正评测由独立 dispatcher 异步完成。
    const user = await requireApiUser(request, reply);
    if (!user) {
      return;
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
}
