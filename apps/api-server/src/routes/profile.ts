import type { FastifyInstance } from 'fastify';

import type { RouteContext } from '../http/context.ts';
import { messageFromError, passwordErrorMessage } from '../http/form-errors.ts';
import { updateClassNameSchema, updateMyPasswordSchema } from '../http/schemas.ts';

export function registerProfileRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    redirectTo,
    renderPage,
    requireApiUser,
    requireHtmlUser,
    services,
  } = context;

  app.get('/profile', async (request, reply) => {
    const user = await requireHtmlUser(request, reply);
    if (!user) {
      return;
    }

    return renderPage(request, reply, 'profile.pug', {
      user,
      classes: await services.listActiveClasses(),
    });
  });

  app.post('/profile/password', async (request, reply) => {
    const user = await requireHtmlUser(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as Record<string, string | undefined>;
    const parsed = updateMyPasswordSchema.safeParse({
      currentPassword: raw.currentPassword,
      newPassword: raw.newPassword,
    });
    if (!parsed.success) {
      reply.code(400);
      return renderPage(request, reply, 'profile.pug', {
        user,
        classes: await services.listActiveClasses(),
        formError: '密码填写不正确，请检查后重试。',
      });
    }

    try {
      await services.updateMyPassword(
        user.id,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );
    } catch (error) {
      reply.code(400);
      return renderPage(request, reply, 'profile.pug', {
        user,
        classes: await services.listActiveClasses(),
        formError: passwordErrorMessage(messageFromError(error, 'failed to update password')),
      });
    }

    return redirectTo(reply, '/profile');
  });

  app.post('/api/me/class-name', async (request, reply) => {
    const user = await requireApiUser(request, reply);
    if (!user) {
      return;
    }

    const parsed = updateClassNameSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid class name payload',
        issues: parsed.error.issues,
      });
    }

    await services.updateProfileClassName(user.id, parsed.data.className);
    return reply.send({ ok: true });
  });

  app.post('/api/me/password', async (request, reply) => {
    const user = await requireApiUser(request, reply);
    if (!user) {
      return;
    }

    const parsed = updateMyPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid password payload',
        issues: parsed.error.issues,
      });
    }

    try {
      await services.updateMyPassword(
        user.id,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'failed to update password';
      return reply.code(400).send({ message });
    }
    return reply.send({ ok: true });
  });
}
