// 这个文件是 HTTP / HTML 层的装配入口。
// 具体页面和 JSON API 路由按领域拆在 routes/ 目录中。
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import formbody from '@fastify/formbody';
import view from '@fastify/view';
import Fastify from 'fastify';
import pug from 'pug';
import { OJSubmissionStatuses } from '@roj/shared';

import { createRouteContext } from './http/context.ts';
import { registerAdminRoutes } from './routes/admin.ts';
import { registerAuthRoutes } from './routes/auth.ts';
import { registerMiscRoutes } from './routes/misc.ts';
import { registerProblemRoutes } from './routes/problems.ts';
import { registerProblemSetRoutes } from './routes/problem-sets.ts';
import { registerProfileRoutes } from './routes/profile.ts';
import { registerStaticRoutes } from './routes/static.ts';
import { registerSubmissionRoutes } from './routes/submissions.ts';
import type {
  ApiServerServices,
} from './service-types.ts';
export { buildPaginationViewModel } from './services/pagination.ts';

export type * from './service-types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function buildApp(services: ApiServerServices) {
  const app = Fastify();

  void app.register(formbody);
  void app.register(view, {
    engine: {
      pug,
    },
    root: path.join(__dirname, 'views'),
  });

  const context = createRouteContext(services);

  registerStaticRoutes(app, context);
  registerMiscRoutes(app, context);
  registerAuthRoutes(app, context);
  registerProfileRoutes(app, context);
  registerAdminRoutes(app, context);
  registerProblemRoutes(app, context);
  registerProblemSetRoutes(app, context);
  registerSubmissionRoutes(app, context);

  return app;
}

// 页面层判断 submission 是否终态时，只关心 OJ 自己的状态。
export function isSubmissionTerminal(status: string) {
  return (
    status === OJSubmissionStatuses.FINISHED ||
    status === OJSubmissionStatuses.FAILED
  );
}
