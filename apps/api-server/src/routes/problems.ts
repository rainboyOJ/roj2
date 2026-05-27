import type { FastifyInstance } from 'fastify';

import type { ProblemListViewModel, ProblemProgress } from '../app.ts';
import type { RouteContext } from '../http/context.ts';
import { createSubmissionSchema } from '../http/schemas.ts';

export function registerProblemRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    filterAllowedLanguages,
    parseSessionToken,
    redirectTo,
    renderPage,
    requireHtmlUser,
    services,
  } = context;

  app.get('/problems', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const currentUser = await services.getCurrentUser(token);
    const [problems, enabledLanguages, progressByPid] = await Promise.all([
      services.listProblems(),
      services.getEnabledLanguages(),
      currentUser
        ? services.listProblemProgressByUser(currentUser.id)
        : Promise.resolve(new Map<string, ProblemProgress>()),
    ]);

    return renderPage(request, reply, 'problems.pug', {
      problems: problems.map((problem): ProblemListViewModel => ({
        ...problem,
        allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
        progress: progressByPid.get(problem.pid) ?? null,
      })),
    });
  });

  app.get('/problem/:pid', async (request, reply) => {
    const params = request.params as { pid: string };
    const problem = await services.getProblemByPid(params.pid);
    if (!problem) {
      return reply.code(404).send('Problem not found');
    }
    const enabledLanguages = await services.getEnabledLanguages();

    return renderPage(request, reply, 'problem.pug', {
      problem: {
        ...problem,
        allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
      },
    });
  });

  app.get('/api/problems', async () => {
    const [problems, enabledLanguages] = await Promise.all([
      services.listProblems(),
      services.getEnabledLanguages(),
    ]);

    return problems.map((problem) => ({
      ...problem,
      allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
    }));
  });

  app.get('/api/problems/:pid', async (request, reply) => {
    const params = request.params as { pid: string };
    const problem = await services.getProblemByPid(params.pid);
    if (!problem) {
      return reply.code(404).send({ message: 'Problem not found' });
    }
    const enabledLanguages = await services.getEnabledLanguages();
    return {
      ...problem,
      allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
    };
  });

  app.post('/submissions', async (request, reply) => {
    // 页面提交流程和 API 提交流程的核心逻辑一样，
    // 区别只在于这里最终跳转到 submission 详情页。
    const user = await requireHtmlUser(request, reply);
    if (!user) {
      return;
    }
    if (user.role === 'student' && user.approvalStatus !== 'approved') {
      return reply.code(403).send('Approval required');
    }

    const parsed = createSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid submission payload');
    }
    const enabledLanguages = await services.getEnabledLanguages();
    if (!enabledLanguages.includes(parsed.data.language)) {
      return reply.code(400).send(`language ${parsed.data.language} is disabled`);
    }

    const created = await services.createSubmission({
      userId: user.id,
      ...parsed.data,
    });
    return redirectTo(reply, `/submissions/${created.publicId}`);
  });
}
