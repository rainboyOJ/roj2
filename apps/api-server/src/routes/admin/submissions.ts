import type { FastifyInstance } from 'fastify';

import type { RouteContext } from '../../http/context.ts';
import { firstQueryValue } from '../../http/query.ts';

function readNonNegativeIntegerQuery(query: unknown, key: string) {
  const value = Number(firstQueryValue(query, key));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function cleanupResultFromQuery(query: unknown) {
  const submissionCount = readNonNegativeIntegerQuery(query, 'cleanupSubmissions');
  const progressCount = readNonNegativeIntegerQuery(query, 'cleanupProgress');
  if (submissionCount === null || progressCount === null) {
    return null;
  }
  return {
    submissionCount,
    progressCount,
  };
}

export function registerAdminSubmissionRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    parsePage,
    parsePageSize,
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

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
    return renderPage(request, reply, 'admin-submissions.pug', {
      ...result,
      cleanupResult: cleanupResultFromQuery(request.query),
    });
  });

  app.get('/admin/submissions/cleanup-deleted-users', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'admin-submission-cleanup.pug', {
      cleanup: await services.countDeletedUserSubmissionCleanup(),
    });
  });

  app.post('/admin/submissions/cleanup-deleted-users', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const result = await services.cleanupDeletedUserSubmissions();
    return redirectTo(
      reply,
      `/admin/submissions?cleanupSubmissions=${result.submissionCount}&cleanupProgress=${result.progressCount}`,
    );
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

  app.get('/api/admin/submissions/cleanup-deleted-users', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return services.countDeletedUserSubmissionCleanup();
  });

  app.post('/api/admin/submissions/cleanup-deleted-users', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return services.cleanupDeletedUserSubmissions();
  });
}
