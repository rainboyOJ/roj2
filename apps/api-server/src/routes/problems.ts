import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../http/context.ts';
import {
  buildQueryString,
  readEnumQuery,
  readTrimmedQuery,
  type QueryValueInput,
} from '../http/query.ts';
import { createSubmissionSchema } from '../http/schemas.ts';
import type {
  ProblemListFilters,
  ProblemListQueryFilters,
  ProblemListViewModel,
  ProblemProgress,
} from '../service-types.ts';

function parseProblemListFilters(query: unknown): ProblemListFilters {
  const filters: ProblemListFilters = {};
  const q = readTrimmedQuery(query, 'q');
  const progress = readEnumQuery(query, 'progress', ['accepted', 'attempted', 'empty'] as const);

  if (q) {
    filters.q = q;
  }
  if (progress) {
    filters.progress = progress;
  }

  return filters;
}

function problemListQueryParts(filters: ProblemListFilters): QueryValueInput[] {
  return [
    { key: 'q', value: filters.q },
    { key: 'progress', value: filters.progress },
  ];
}

function buildProblemListQueryFilters(
  filters: ProblemListFilters,
  progressByPid: Map<string, ProblemProgress>,
): ProblemListQueryFilters {
  const queryFilters: ProblemListQueryFilters = {};
  const progressEntries = Array.from(progressByPid.entries());

  if (filters.q) {
    queryFilters.q = filters.q;
  }
  if (filters.progress === 'accepted') {
    queryFilters.pidIn = progressEntries
      .filter(([, progress]) => progress === 'accepted')
      .map(([pid]) => pid);
  } else if (filters.progress === 'attempted') {
    queryFilters.pidIn = progressEntries
      .filter(([, progress]) => progress === 'attempted')
      .map(([pid]) => pid);
  } else if (filters.progress === 'empty') {
    queryFilters.pidNin = progressEntries.map(([pid]) => pid);
  }

  return queryFilters;
}

function buildProblemListQuerySuffix(filters: ProblemListFilters) {
  return buildQueryString(problemListQueryParts(filters));
}

function searchOnlyProblemListFilters(filters: ProblemListFilters): ProblemListFilters {
  const searchFilters: ProblemListFilters = {};
  if (filters.q) {
    searchFilters.q = filters.q;
  }
  return searchFilters;
}

export function registerProblemRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    filterAllowedLanguages,
    parsePage,
    parsePageSize,
    parseSessionToken,
    redirectTo,
    renderPage,
    requireHtmlUser,
    services,
  } = context;

  async function renderProblemSubmissionError(
    request: Parameters<typeof renderPage>[0],
    reply: FastifyReply,
    pid: string,
    formError: string,
    formValues: Record<string, string>,
  ) {
    const problem = await services.getProblemByPid(pid);
    if (!problem) {
      return reply.code(404).send('Problem not found');
    }
    const enabledLanguages = await services.getEnabledLanguages();
    reply.code(400);
    return renderPage(request, reply, 'problem.pug', {
      problem: {
        ...problem,
        allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
      },
      formError,
      formValues,
    });
  }

  app.get('/problems', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const currentUser = await services.getCurrentUser(token);
    const paginationSettings = await services.getPaginationSettings();
    const pageSize = paginationSettings.listPageSize;
    const filters = parseProblemListFilters(request.query);
    const progressByPid = currentUser
      ? await services.listProblemProgressByUser(currentUser.id)
      : new Map<string, ProblemProgress>();
    const queryFilters = currentUser
      ? buildProblemListQueryFilters(filters, progressByPid)
      : buildProblemListQueryFilters(searchOnlyProblemListFilters(filters), progressByPid);
    const [result, enabledLanguages] = await Promise.all([
      services.listProblemsPaginated({
        page: parsePage(request.query),
        pageSize,
        filters: queryFilters,
      }),
      services.getEnabledLanguages(),
    ]);

    return renderPage(request, reply, 'problems.pug', {
      problems: result.problems.map((problem): ProblemListViewModel => ({
        ...problem,
        allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
        progress: progressByPid.get(problem.pid) ?? null,
      })),
      pagination: result.pagination,
      filters,
      paginationQuerySuffix: buildProblemListQuerySuffix(filters),
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

  app.get('/api/problems', async (request) => {
    const token = parseSessionToken(request.headers.cookie);
    const currentUser = await services.getCurrentUser(token);
    const paginationSettings = await services.getPaginationSettings();
    const filters = parseProblemListFilters(request.query);
    const progressByPid = currentUser
      ? await services.listProblemProgressByUser(currentUser.id)
      : new Map<string, ProblemProgress>();
    const queryFilters = currentUser
      ? buildProblemListQueryFilters(filters, progressByPid)
      : buildProblemListQueryFilters(searchOnlyProblemListFilters(filters), progressByPid);
    const [result, enabledLanguages] = await Promise.all([
      services.listProblemsPaginated({
        page: parsePage(request.query),
        pageSize: parsePageSize(request.query, paginationSettings.listPageSize),
        filters: queryFilters,
      }),
      services.getEnabledLanguages(),
    ]);

    return {
      problems: result.problems.map((problem) => ({
        ...problem,
        allowLanguages: filterAllowedLanguages(problem.allowLanguages, enabledLanguages),
        progress: progressByPid.get(problem.pid) ?? null,
      })),
      pagination: result.pagination,
      filters,
    };
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

    const raw = request.body as Record<string, string | undefined>;
    const formValues = {
      pid: String(raw.pid || ''),
      language: String(raw.language || ''),
      sourceCode: String(raw.sourceCode || ''),
    };
    const parsed = createSubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      if (!formValues.pid) {
        return reply.code(400).send('Invalid submission payload');
      }
      return renderProblemSubmissionError(
        request,
        reply,
        formValues.pid,
        '提交信息不完整，请检查语言和代码。',
        formValues,
      );
    }
    const enabledLanguages = await services.getEnabledLanguages();
    if (!enabledLanguages.includes(parsed.data.language)) {
      return renderProblemSubmissionError(
        request,
        reply,
        parsed.data.pid,
        `语言 ${parsed.data.language} 当前不可用。`,
        formValues,
      );
    }

    let created;
    try {
      created = await services.createSubmission({
        userId: user.id,
        ...parsed.data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交失败，请检查后重试。';
      return renderProblemSubmissionError(request, reply, parsed.data.pid, message, formValues);
    }
    return redirectTo(reply, `/submissions/${created.publicId}`);
  });
}
