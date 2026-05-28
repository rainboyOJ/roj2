import type { FastifyInstance } from 'fastify';

import { DEFAULT_PAGE_SIZE, type RouteContext } from '../http/context.ts';
import { createSubmissionSchema } from '../http/schemas.ts';
import type { SessionUser, SubmissionListFilters, SubmissionViewModel } from '../app.ts';

function parseSubmissionListFilters(query: unknown): SubmissionListFilters {
  if (typeof query !== 'object' || query === null) {
    return {};
  }

  const raw = query as { pid?: unknown; user?: unknown };
  const pidText = Array.isArray(raw.pid) ? raw.pid[0] : raw.pid;
  const userText = Array.isArray(raw.user) ? raw.user[0] : raw.user;
  const filters: SubmissionListFilters = {};

  if (typeof pidText === 'string' && pidText.trim()) {
    filters.pid = pidText.trim();
  }
  if (typeof userText === 'string' && userText.trim()) {
    filters.user = userText.trim();
  }

  return filters;
}

function withSubmissionSourcePermission(
  submission: SubmissionViewModel,
  user: SessionUser,
): SubmissionViewModel {
  const canViewSourceCode = user.role === 'admin' || submission.userId === user.id;
  return {
    ...submission,
    sourceCode: canViewSourceCode ? submission.sourceCode : '',
    canViewSourceCode,
  };
}

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

    return renderPage(request, reply, 'submission.pug', {
      submission: withSubmissionSourcePermission(submission, user),
    });
  });

  app.get('/submissions', async (request, reply) => {
    const user = await requireHtmlUser(request, reply);
    if (!user) {
      return;
    }

    const filters = parseSubmissionListFilters(request.query);
    const result = await services.listSubmissions(user, {
      page: parsePage(request.query),
      pageSize: DEFAULT_PAGE_SIZE,
    }, filters);
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
    return withSubmissionSourcePermission(submission, user);
  });

  app.get('/api/submissions', async (request, reply) => {
    const user = await requireApiUser(request, reply);
    if (!user) {
      return;
    }

    return services.listSubmissions(user, {
      page: parsePage(request.query),
      pageSize: DEFAULT_PAGE_SIZE,
    }, parseSubmissionListFilters(request.query));
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
