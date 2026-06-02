import type { FastifyInstance } from 'fastify';

import type { RouteContext } from '../http/context.ts';

export function registerMiscRoutes(app: FastifyInstance, context: RouteContext) {
  const { redirectTo, renderPage, services } = context;

  app.get('/', async (request, reply) => renderPage(request, reply, 'home.pug'));

  app.get('/problem-jump', async (request, reply) => {
    const query = request.query as { pid?: string | string[] } | undefined;
    const rawPid = Array.isArray(query?.pid) ? query?.pid[0] : query?.pid;
    const pid = rawPid?.trim();

    if (!pid) {
      return redirectTo(reply, '/');
    }

    return redirectTo(reply, `/problem/${encodeURIComponent(pid)}`);
  });

  app.get('/ranklist', async (request, reply) => {
    const query = request.query as { className?: string | string[] } | undefined;
    const rawClassName = Array.isArray(query?.className) ? query?.className[0] : query?.className;
    const className = rawClassName?.trim() || undefined;
    const filters = className ? { className } : {};
    const [entries, classes] = await Promise.all([
      services.listRanklist(filters),
      services.listActiveClasses(),
    ]);
    return renderPage(request, reply, 'ranklist.pug', {
      entries,
      classes,
      filters,
    });
  });

  app.get('/contests', async (request, reply) => {
    const contests = await services.listContests();
    return renderPage(request, reply, 'contests.pug', { contests });
  });

  app.get('/contests/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const contest = await services.getContestById(params.id);
    if (!contest) {
      return reply.code(404).send('Contest not found');
    }

    return renderPage(request, reply, 'contest-detail.pug', { contest });
  });
}
