import type { FastifyInstance } from 'fastify';

import type { RouteContext } from '../../http/context.ts';

export function registerAdminSubmissionRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    parsePage,
    parsePageSize,
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
}
