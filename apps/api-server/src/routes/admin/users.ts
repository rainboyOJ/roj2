import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../../http/context.ts';
import { messageFromError } from '../../http/form-errors.ts';
import { sendValidationError } from '../../http/validation.ts';
import { resetPasswordSchema } from '../../http/schemas.ts';
import {
  adminUsersPath,
  parseAdminUserListFilters,
  parseUserIds,
} from './form-parsers.ts';

export function registerAdminUserRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    parsePage,
    parsePageSize,
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

  async function renderAdminUsersError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, user: { id: string }, formError: string) {
    const paginationSettings = await services.getPaginationSettings();
    const result = await services.listAdminUsersPaginated({
      page: parsePage(request.query),
      pageSize: paginationSettings.listPageSize,
    }, parseAdminUserListFilters(request.query));
    reply.code(400);
    return renderPage(request, reply, 'admin-users.pug', {
      currentUser: user,
      ...result,
      formError,
    });
  }

  app.get('/admin/users', async (request, reply) => {
    // 用户审核页：支持批量审核，也支持行内单个审核。
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const paginationSettings = await services.getPaginationSettings();
    const result = await services.listAdminUsersPaginated({
      page: parsePage(request.query),
      pageSize: paginationSettings.listPageSize,
    }, parseAdminUserListFilters(request.query));
    return renderPage(request, reply, 'admin-users.pug', { currentUser: user, ...result });
  });

  app.post('/admin/users/:id/reset-password', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return renderAdminUsersError(request, reply, user, '新密码至少需要 8 个字符。');
    }

    const params = request.params as { id: string };
    try {
      await services.resetUserPassword(params.id, parsed.data.password);
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '重置密码失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.post('/admin/users/:id/delete', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    try {
      await services.deleteUser(params.id);
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '删除用户失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.post('/admin/users/bulk-approve', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return renderAdminUsersError(request, reply, user, '请先选择需要通过的用户。');
    }

    // 批量审核目前直接串行循环，先保持实现简单清楚。
    try {
      for (const userId of userIds) {
        await services.approveUser(userId, user.id);
      }
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '审核用户失败，请检查后重试。'),
      );
    }

    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.post('/admin/users/bulk-reject', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return renderAdminUsersError(request, reply, user, '请先选择需要拒绝的用户。');
    }

    try {
      for (const userId of userIds) {
        await services.rejectUser(userId, user.id);
      }
    } catch (error) {
      return renderAdminUsersError(
        request,
        reply,
        user,
        messageFromError(error, '拒绝用户失败，请检查后重试。'),
      );
    }

    return redirectTo(reply, adminUsersPath(request.query));
  });

  app.get('/api/admin/users', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }
    const paginationSettings = await services.getPaginationSettings();
    return services.listAdminUsersPaginated({
      page: parsePage(request.query),
      pageSize: parsePageSize(request.query, paginationSettings.listPageSize),
    }, parseAdminUserListFilters(request.query));
  });

  app.post('/api/admin/users/:id/approve', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.approveUser(params.id, user.id);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/:id/reject', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.rejectUser(params.id, user.id);
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/bulk-approve', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return reply.code(400).send({ message: 'No users selected' });
    }

    for (const userId of userIds) {
      await services.approveUser(userId, user.id);
    }
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/bulk-reject', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as { userIds?: unknown };
    const userIds = parseUserIds(raw.userIds);
    if (userIds.length === 0) {
      return reply.code(400).send({ message: 'No users selected' });
    }

    for (const userId of userIds) {
      await services.rejectUser(userId, user.id);
    }
    return reply.send({ ok: true });
  });

  app.post('/api/admin/users/:id/reset-password', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid password payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.resetUserPassword(params.id, parsed.data.password);
    return reply.send({ ok: true });
  });

  app.delete('/api/admin/users/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    await services.deleteUser(params.id);
    return reply.send({ ok: true });
  });
}
