import type { FastifyInstance } from 'fastify';

import type { RouteContext } from '../http/context.ts';
import { loginSchema, registerSchema } from '../http/schemas.ts';

export function registerAuthRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    clearSessionCookie,
    parseSessionToken,
    redirectWithLang,
    renderPage,
    services,
    setSessionCookie,
  } = context;

  app.get('/register', async (request, reply) => {
    const grades = (await services.listGrades()).filter((grade) => grade.isActive);
    return renderPage(request, reply, 'register.pug', { grades });
  });

  app.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid registration payload');
    }

    await services.registerUser(parsed.data);
    return redirectWithLang(request, reply, '/login');
  });

  app.get('/login', async (request, reply) => renderPage(request, reply, 'login.pug'));

  app.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send('Invalid login payload');
    }

    let result;
    try {
      result = await services.loginUser(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'login failed';
      return reply.code(401).send(message);
    }

    setSessionCookie(reply, result.token);
    return redirectWithLang(request, reply, '/');
  });

  app.post('/logout', async (request, reply) => {
    // HTML 流程的 logout 是表单 POST，不走 GET，避免误触发。
    const token = parseSessionToken(request.headers.cookie);
    await services.logoutUser(token);
    clearSessionCookie(reply);
    return redirectWithLang(request, reply, '/');
  });

  app.post('/api/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid registration payload',
        issues: parsed.error.issues,
      });
    }

    let created;
    try {
      created = await services.registerUser(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'registration failed';
      return reply.code(400).send({ message });
    }

    return reply.code(201).send({
      userId: created.id,
      username: created.username,
      approvalStatus: created.approvalStatus,
    });
  });

  app.post('/api/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        message: 'Invalid login payload',
        issues: parsed.error.issues,
      });
    }

    let result;
    try {
      result = await services.loginUser(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'login failed';
      return reply.code(401).send({ message });
    }
    setSessionCookie(reply, result.token);
    return reply.send({
      user: result.user,
    });
  });

  app.post('/api/logout', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    await services.logoutUser(token);
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.get('/api/me', async (request, reply) => {
    const token = parseSessionToken(request.headers.cookie);
    const user = await services.getCurrentUser(token);
    if (!user) {
      return reply.code(401).send({ message: 'Not logged in' });
    }
    return { user };
  });
}
