import type { FastifyInstance, FastifyReply } from 'fastify';

import type { RouteContext } from '../../http/context.ts';
import { messageFromError } from '../../http/form-errors.ts';
import { sendValidationError } from '../../http/validation.ts';
import {
  createClassSchema,
  createGradeSchema,
} from '../../http/schemas.ts';
import {
  type AdminFormBody,
  dictionaryFormValues,
  dictionaryInputFromBody,
} from './form-parsers.ts';

export function registerAdminDictionaryRoutes(app: FastifyInstance, context: RouteContext) {
  const {
    redirectTo,
    renderPage,
    requireApiAdmin,
    requireHtmlAdmin,
    services,
  } = context;

  async function renderAdminGradesError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string, formValues?: Record<string, string>) {
    const grades = await services.listGrades();
    reply.code(400);
    return renderPage(request, reply, 'admin-grades.pug', {
      grades,
      formError,
      formValues,
    });
  }

  async function renderAdminClassesError(request: Parameters<typeof renderPage>[0], reply: FastifyReply, formError: string, formValues?: Record<string, string>) {
    const classes = await services.listClasses();
    reply.code(400);
    return renderPage(request, reply, 'admin-classes.pug', {
      classes,
      formError,
      formValues,
    });
  }

  app.get('/admin/grades', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const grades = await services.listGrades();
    return renderPage(request, reply, 'admin-grades.pug', { grades });
  });

  app.post('/admin/grades', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = createGradeSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminGradesError(request, reply, '年级信息填写不正确。', dictionaryFormValues(raw));
    }

    try {
      await services.createGrade(parsed.data);
    } catch (error) {
      return renderAdminGradesError(
        request,
        reply,
        messageFromError(error, '创建年级失败，请检查后重试。'),
        dictionaryFormValues(raw),
      );
    }
    return redirectTo(reply, '/admin/grades');
  });

  app.post('/admin/grades/:id', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    const raw = request.body as AdminFormBody;
    const parsed = createGradeSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminGradesError(request, reply, '年级信息填写不正确。');
    }

    try {
      await services.updateGrade(params.id, parsed.data);
    } catch (error) {
      return renderAdminGradesError(
        request,
        reply,
        messageFromError(error, '保存年级失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/grades');
  });

  app.get('/admin/classes', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const classes = await services.listClasses();
    return renderPage(request, reply, 'admin-classes.pug', { classes });
  });

  app.post('/admin/classes', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const raw = request.body as AdminFormBody;
    const parsed = createClassSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminClassesError(request, reply, '班级信息填写不正确。', dictionaryFormValues(raw));
    }

    try {
      await services.createClass(parsed.data);
    } catch (error) {
      return renderAdminClassesError(
        request,
        reply,
        messageFromError(error, '创建班级失败，请检查后重试。'),
        dictionaryFormValues(raw),
      );
    }
    return redirectTo(reply, '/admin/classes');
  });

  app.post('/admin/classes/:id', async (request, reply) => {
    const user = await requireHtmlAdmin(request, reply);
    if (!user) {
      return;
    }

    const params = request.params as { id: string };
    const raw = request.body as AdminFormBody;
    const parsed = createClassSchema.safeParse(dictionaryInputFromBody(raw));
    if (!parsed.success) {
      return renderAdminClassesError(request, reply, '班级信息填写不正确。');
    }

    try {
      await services.updateClass(params.id, parsed.data);
    } catch (error) {
      return renderAdminClassesError(
        request,
        reply,
        messageFromError(error, '保存班级失败，请检查后重试。'),
      );
    }
    return redirectTo(reply, '/admin/classes');
  });

  app.get('/api/admin/grades', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      grades: await services.listGrades(),
    };
  });

  app.post('/api/admin/grades', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createGradeSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid grade payload', parsed.error.issues);
    }

    const created = await services.createGrade(parsed.data);
    return reply.code(201).send({
      gradeId: created.id,
      name: created.name,
      isActive: created.isActive,
      order: created.order,
    });
  });

  app.put('/api/admin/grades/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createGradeSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid grade payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.updateGrade(params.id, parsed.data);
    return reply.send({ ok: true });
  });

  app.get('/api/admin/classes', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    return {
      classes: await services.listClasses(),
    };
  });

  app.post('/api/admin/classes', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createClassSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid class payload', parsed.error.issues);
    }

    const created = await services.createClass(parsed.data);
    return reply.code(201).send({
      classId: created.id,
      name: created.name,
      isActive: created.isActive,
      order: created.order,
    });
  });

  app.put('/api/admin/classes/:id', async (request, reply) => {
    const user = await requireApiAdmin(request, reply);
    if (!user) {
      return;
    }

    const parsed = createClassSchema.safeParse(request.body);
    if (!parsed.success) {
      return sendValidationError(reply, 'Invalid class payload', parsed.error.issues);
    }

    const params = request.params as { id: string };
    await services.updateClass(params.id, parsed.data);
    return reply.send({ ok: true });
  });
}
