import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../../http/context.ts';
import { messageFromError } from '../../http/form-errors.ts';
import { sendValidationError } from '../../http/validation.ts';
import {
  enabledLanguagesSchema,
  paginationSettingsSchema,
  submissionSettingsSchema,
} from '../../http/schemas.ts';
import {
  type AdminFormBody,
  enabledLanguagesInputFromBody,
  paginationSettingsInputFromBody,
  submissionSettingsInputFromBody,
} from './form-parsers.ts';

export function registerAdminSettingsRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

  async function renderLanguageSettingsError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string) {
    const enabledLanguages = await services.getEnabledLanguages();
    reply.code(400);
    return renderPage(request, reply, 'admin-language-settings.pug', {
      settings: { enabledLanguages },
      formError,
    });
  }

  async function renderPaginationSettingsError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string) {
    const settings = await services.getPaginationSettings();
    reply.code(400);
    return renderPage(request, reply, 'admin-pagination-settings.pug', {
      settings,
      formError,
    });
  }

  async function renderSubmissionSettingsError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string) {
    const settings = await services.getSubmissionSettings();
    reply.code(400);
    return renderPage(request, reply, 'admin-submission-settings.pug', {
      settings,
      formError,
    });
  }

  app.get('/admin/settings/languages', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const enabledLanguages = await services.getEnabledLanguages();
    return renderPage(request, reply, 'admin-language-settings.pug', {
      settings: { enabledLanguages },
    });
  });

  app.get('/admin/settings/pagination', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'admin-pagination-settings.pug', {
      settings: await services.getPaginationSettings(),
    });
  });

  app.get('/admin/settings/submissions', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'admin-submission-settings.pug', {
      settings: await services.getSubmissionSettings(),
    });
  });

  app.get('/api/admin/settings/languages', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      enabledLanguages: await services.getEnabledLanguages(),
    };
  });

  app.get('/api/admin/settings/pagination', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return services.getPaginationSettings();
  });

  app.get('/api/admin/settings/submissions', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return services.getSubmissionSettings();
  });

  app.post('/api/admin/settings/languages', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = enabledLanguagesSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid language settings payload', parsed.error.issues);
    }

    await services.updateEnabledLanguages(parsed.data.enabledLanguages);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/settings/pagination', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = paginationSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid pagination settings payload', parsed.error.issues);
    }

    await services.updateListPageSize(parsed.data.listPageSize);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/settings/submissions', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = submissionSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid submission settings payload', parsed.error.issues);
    }

    await services.updateSubmissionIntervalSeconds(parsed.data.submissionIntervalSeconds);
    return reply.send({ ok: true });
  });

  app.post('/admin/settings/languages', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = enabledLanguagesSchema.safeParse(enabledLanguagesInputFromBody(raw));
    if (!parsed.success) {
      return renderLanguageSettingsError(request, reply, '至少选择一种可用语言。');
    }

    try {
      await services.updateEnabledLanguages(parsed.data.enabledLanguages);
    } catch (error) {
      return renderLanguageSettingsError(
        request,
        reply,
        messageFromError(error, '保存语言设置失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/settings/languages');
  });

  app.post('/admin/settings/pagination', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = paginationSettingsSchema.safeParse(paginationSettingsInputFromBody(raw));
    if (!parsed.success) {
      return renderPaginationSettingsError(request, reply, '请选择有效的每页数量。');
    }

    try {
      await services.updateListPageSize(parsed.data.listPageSize);
    } catch (error) {
      return renderPaginationSettingsError(
        request,
        reply,
        messageFromError(error, '保存分页设置失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/settings/pagination');
  });

  app.post('/admin/settings/submissions', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = submissionSettingsSchema.safeParse(submissionSettingsInputFromBody(raw));
    if (!parsed.success) {
      return renderSubmissionSettingsError(request, reply, '请输入大于等于 0 的整数秒数。');
    }

    try {
      await services.updateSubmissionIntervalSeconds(parsed.data.submissionIntervalSeconds);
    } catch (error) {
      return renderSubmissionSettingsError(
        request,
        reply,
        messageFromError(error, '保存提交设置失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/settings/submissions');
  });
}
