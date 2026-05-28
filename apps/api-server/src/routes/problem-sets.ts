import type { FastifyInstance } from 'fastify';

import type { ProblemProgress } from '../app.ts';
import type { RouteContext } from '../http/context.ts';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function problemRefHtml(input: {
  pid: string;
  title: string;
  href: string | null;
  status: 'accepted' | 'empty';
  missing: boolean;
}) {
  const icon = input.status === 'accepted'
    ? '<span class="problem-set-ref-icon accepted" aria-hidden="true">✓</span>'
    : '<span class="problem-set-ref-icon empty" aria-hidden="true"></span>';
  const label = `${escapeHtml(input.pid)} ${escapeHtml(input.title)}`;
  const className = input.missing
    ? 'problem-set-problem-link missing'
    : 'problem-set-problem-link';
  if (!input.href) {
    return `<span class="${className}">${icon}<span>${label}</span></span>`;
  }
  return `<a class="${className}" href="${input.href}">${icon}<span>${label}</span></a>`;
}

function renderProblemSetContent(
  contentHtml: string,
  refs: Array<Parameters<typeof problemRefHtml>[0]>,
) {
  const refByPid = new Map(refs.map((ref) => [ref.pid, ref]));
  return contentHtml.replace(
    /<span class="problem-set-ref" data-pid="([^"]+)"><\/span>/g,
    (match, pid: string) => {
      const ref = refByPid.get(pid);
      return ref ? problemRefHtml(ref) : match;
    },
  );
}

export function registerProblemSetRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    parseSessionToken,
    renderPage,
    services,
  } = context;

  app.get('/problem-sets', async (request, reply) => {
    const problemSets = await services.listPublishedProblemSets();
    return renderPage(request, reply, 'problem-sets.pug', { problemSets });
  });

  app.get('/problem-sets/:id', async (request, reply) => {
    const params = request.params as { id: string };
    const problemSet = await services.getPublishedProblemSetById(params.id);
    if (!problemSet) {
      return reply.code(404).send('Problem set not found');
    }

    const token = parseSessionToken(request.headers.cookie);
    const currentUser = await services.getCurrentUser(token);
    const [problems, progressByPid] = await Promise.all([
      services.listProblemsByPids(problemSet.problemRefs),
      currentUser
        ? services.listProblemProgressByUser(currentUser.id)
        : Promise.resolve(new Map<string, ProblemProgress>()),
    ]);
    const problemByPid = new Map(problems.map((problem) => [problem.pid, problem]));
    const problemRefsView = problemSet.problemRefs.map((pid) => {
      const problem = problemByPid.get(pid);
      return {
        pid,
        title: problem?.title ?? '题目不存在或不可见',
        href: problem ? `/problem/${encodeURIComponent(pid)}` : null,
        status: progressByPid.get(pid) === 'accepted' ? 'accepted' as const : 'empty' as const,
        missing: !problem,
      };
    });

    return renderPage(request, reply, 'problem-set.pug', {
      problemSet: {
        ...problemSet,
        problemRefsView,
        renderedContentHtml: renderProblemSetContent(problemSet.contentHtml, problemRefsView),
      },
    });
  });
}
