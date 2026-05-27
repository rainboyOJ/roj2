import type { FastifyInstance } from 'fastify';

import type { RouteContext } from '../http/context.ts';

export function registerMiscRoutes(app: FastifyInstance, context: RouteContext) {
  const { renderPage, services } = context;

  app.get('/', async (request, reply) => renderPage(request, reply, 'home.pug'));

  app.get('/ranklist', async (request, reply) => {
    const entries = await services.listRanklist();
    return renderPage(request, reply, 'ranklist.pug', { entries });
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
