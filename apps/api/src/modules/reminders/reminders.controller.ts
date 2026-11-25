import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ReminderPriority, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';

export async function reminderRoutes(app: FastifyInstance) {
  // List Admin Reminders (Strictly Admin-only)
  app.get('/api/reminders', async (
    request: FastifyRequest<{ Querystring: { completed?: string; priority?: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Studio reminders are strictly restricted to Administrators.' });
    }

    const where: any = {};
    if (request.query.completed === 'true') where.isCompleted = true;
    if (request.query.completed === 'false') where.isCompleted = false;
    if (request.query.priority && ['HIGH', 'MEDIUM', 'NORMAL'].includes(request.query.priority.toUpperCase())) {
      where.priority = request.query.priority.toUpperCase() as ReminderPriority;
    }

    const reminders = await prisma.adminReminder.findMany({
      where,
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ isCompleted: 'asc' }, { dueAt: 'asc' }],
    });

    const formatted = reminders.map((r) => ({
      id: r.id,
      title: r.title,
      notes: r.notes,
      projectId: r.projectId,
      projectCode: r.project?.projectCode || null,
      projectName: r.project?.name || null,
      dueAt: r.dueAt.toISOString(),
      priority: r.priority,
      isCompleted: r.isCompleted,
      completedAt: r.completedAt ? r.completedAt.toISOString() : null,
      createdById: r.createdById,
      createdByName: r.createdBy.fullName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }));

    return {
      reminders: formatted,
      summary: {
        total: formatted.length,
        pending: formatted.filter((r) => !r.isCompleted).length,
        completed: formatted.filter((r) => r.isCompleted).length,
        highPriority: formatted.filter((r) => !r.isCompleted && r.priority === 'HIGH').length,
      },
    };
  });

  // Create Reminder (Strictly Admin-only)
  app.post('/api/reminders', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only Administrators can create reminders.' });
    }

    const schema = z.object({
      title: z.string().min(1, 'Reminder title is required').max(250),
      notes: z.string().optional().nullable(),
      projectId: z.string().optional().nullable(),
      projectCode: z.string().optional().nullable(),
      dueAt: z.string().min(1, 'Due date/time is required'),
      priority: z.enum(['HIGH', 'MEDIUM', 'NORMAL']).optional().default('NORMAL'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid reminder data' });
    }

    const dueAtDate = new Date(parsed.data.dueAt);
    if (Number.isNaN(dueAtDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid dueAt date/time format' });
    }

    let resolvedProjectId: string | null = null;
    const projectIdentifier = parsed.data.projectId || parsed.data.projectCode;
    if (projectIdentifier) {
      const project = await prisma.project.findFirst({
        where: { OR: [{ id: projectIdentifier }, { projectCode: projectIdentifier }] },
        select: { id: true },
      });
      if (!project) {
        return reply.status(404).send({ error: 'Referenced project not found.' });
      }
      resolvedProjectId = project.id;
    }

    const reminder = await prisma.adminReminder.create({
      data: {
        title: parsed.data.title.trim(),
        notes: parsed.data.notes?.trim() || null,
        projectId: resolvedProjectId,
        dueAt: dueAtDate,
        priority: parsed.data.priority as ReminderPriority,
        createdById: user.id,
      },
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CREATE_REMINDER',
      entityType: 'ADMIN_REMINDER',
      entityId: reminder.id,
      newData: {
        title: reminder.title,
        priority: reminder.priority,
        dueAt: reminder.dueAt.toISOString(),
        projectId: reminder.projectId,
      },
    });

    return {
      success: true,
      reminder: {
        id: reminder.id,
        title: reminder.title,
        notes: reminder.notes,
        projectId: reminder.projectId,
        projectCode: reminder.project?.projectCode || null,
        projectName: reminder.project?.name || null,
        dueAt: reminder.dueAt.toISOString(),
        priority: reminder.priority,
        isCompleted: reminder.isCompleted,
        completedAt: reminder.completedAt ? reminder.completedAt.toISOString() : null,
        createdById: reminder.createdById,
        createdByName: reminder.createdBy.fullName,
        createdAt: reminder.createdAt.toISOString(),
        updatedAt: reminder.updatedAt.toISOString(),
      },
    };
  });

  // Update / Complete Reminder (Strictly Admin-only)
  app.patch('/api/reminders/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only Administrators can update reminders.' });
    }

    const existing = await prisma.adminReminder.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Reminder not found.' });
    }

    const schema = z.object({
      title: z.string().min(1).max(250).optional(),
      notes: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      projectCode: z.string().nullable().optional(),
      dueAt: z.string().optional(),
      priority: z.enum(['HIGH', 'MEDIUM', 'NORMAL']).optional(),
      isCompleted: z.boolean().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid reminder update payload' });
    }

    const updateData: any = {};
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title.trim();
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes ? parsed.data.notes.trim() : null;
    if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority as ReminderPriority;

    if (parsed.data.dueAt !== undefined) {
      const dueAtDate = new Date(parsed.data.dueAt);
      if (Number.isNaN(dueAtDate.getTime())) {
        return reply.status(400).send({ error: 'Invalid dueAt date/time format' });
      }
      updateData.dueAt = dueAtDate;
    }

    if (parsed.data.projectId !== undefined || parsed.data.projectCode !== undefined) {
      const identifier = parsed.data.projectId ?? parsed.data.projectCode;
      if (!identifier) {
        updateData.projectId = null;
      } else {
        const project = await prisma.project.findFirst({
          where: { OR: [{ id: identifier }, { projectCode: identifier }] },
          select: { id: true },
        });
        if (!project) {
          return reply.status(404).send({ error: 'Referenced project not found.' });
        }
        updateData.projectId = project.id;
      }
    }

    if (parsed.data.isCompleted !== undefined) {
      updateData.isCompleted = parsed.data.isCompleted;
      updateData.completedAt = parsed.data.isCompleted ? new Date() : null;
    }

    const updated = await prisma.adminReminder.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_REMINDER',
      entityType: 'ADMIN_REMINDER',
      entityId: updated.id,
      oldData: {
        title: existing.title,
        priority: existing.priority,
        isCompleted: existing.isCompleted,
      },
      newData: {
        title: updated.title,
        priority: updated.priority,
        isCompleted: updated.isCompleted,
      },
    });

    return {
      success: true,
      reminder: {
        id: updated.id,
        title: updated.title,
        notes: updated.notes,
        projectId: updated.projectId,
        projectCode: updated.project?.projectCode || null,
        projectName: updated.project?.name || null,
        dueAt: updated.dueAt.toISOString(),
        priority: updated.priority,
        isCompleted: updated.isCompleted,
        completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
        createdById: updated.createdById,
        createdByName: updated.createdBy.fullName,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  });

  // Delete Reminder (Strictly Admin-only)
  app.delete('/api/reminders/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only Administrators can delete reminders.' });
    }

    const existing = await prisma.adminReminder.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Reminder not found.' });
    }

    await prisma.adminReminder.delete({ where: { id: existing.id } });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'DELETE_REMINDER',
      entityType: 'ADMIN_REMINDER',
      entityId: existing.id,
      oldData: { title: existing.title, priority: existing.priority },
    });

    return {
      success: true,
      message: 'Reminder deleted successfully.',
    };
  });
}
