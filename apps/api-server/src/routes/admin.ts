import type { FastifyInstance } from 'fastify';

import type { RouteContext } from '../http/context.ts';
import { registerAdminDictionaryRoutes } from './admin/dictionaries.ts';
import { registerAdminProblemRoutes } from './admin/problems.ts';
import { registerAdminProblemSetRoutes } from './admin/problem-sets.ts';
import { registerAdminSettingsRoutes } from './admin/settings.ts';
import { registerAdminSubmissionRoutes } from './admin/submissions.ts';
import { registerAdminUserRoutes } from './admin/users.ts';

export function registerAdminRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    renderPage,
    requireHtmlAdmin,
  } = context;

  registerAdminSettingsRoutes(app, context);
  registerAdminUserRoutes(app, context);
  registerAdminDictionaryRoutes(app, context);
  registerAdminSubmissionRoutes(app, context);
  registerAdminProblemSetRoutes(app, context);
  registerAdminProblemRoutes(app, context);

  app.get('/admin', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'admin-dashboard.pug');
  });

}
