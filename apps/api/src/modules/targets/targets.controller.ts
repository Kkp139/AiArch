import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { TargetStatus, UserRole } from '@prisma/client';
import { resolveUserFromRequest } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';
import { computeEffectiveTargetStatus, validateTargetStatusTransition } from './targets.service';

export async function targetRoutes(app: FastifyInstance) {
  // 1. List Targets (Admin sees all; Staff sees assigned only; Clients strictly 403 forbidden)
  app.get('/api/targets', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    // Master Spec Section 10.2: Assigned Staff can see their target; clients cannot access targets.
    if (user.role === UserRole.CLIENT_LEADER || user.role === UserRole.CLIENT_VIEWER) {
      return reply.status(403).send({ error: 'Access denied: Client accounts cannot access staff targets.' });
    }

    const where: any = {};
    if (user.role === UserRole.STAFF) {
      where.assignedStaff = {
        some: { staffId: user.id },
      };
    }

    const targets = await prisma.staffTarget.findMany({
      where,
      include: {
        creator: { select: { id: true, fullName: true } },
        approver: { select: { id: true, fullName: true } },
        assignedStaff: {
          include: { staff: { select: { id: true, fullName: true, username: true } } },
        },
        assignedProjects: {
          include: { project: { select: { id: true, projectCode: true, name: true } } },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    return targets.map(t => {
      const effectiveStatus = computeEffectiveTargetStatus(t.status, t.dueDate);
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate.toISOString().split('T')[0],
        status: effectiveStatus,
        rawStatus: t.status,
        submissionNotes: t.submissionNotes,
        submittedAt: t.submittedAt,
        completedAt: t.completedAt,
        createdBy: t.creator.fullName,
        approvedBy: t.approver?.fullName || null,
        assignedStaff: t.assignedStaff.map(as => ({
          id: as.staff.id,
          fullName: as.staff.fullName,
          username: as.staff.username,
        })),
        assignedProjects: t.assignedProjects.map(ap => ({
          id: ap.project.id,
          projectCode: ap.project.projectCode,
          name: ap.project.name,
        })),
        createdAt: t.createdAt,
      };
    });
  });

  // 2. Create Target (Admin Only)
  app.post('/api/targets', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can create targets.' });
    }

    const schema = z.object({
      title: z.string().min(2, 'Title is required'),
      description: z.string().optional(),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format'),
      staffIds: z.array(z.string()).min(1, 'At least one staff member must be assigned'),
      projectIds: z.array(z.string()).optional().default([]),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid target parameters' });
    }

    const { title, description, dueDate, staffIds, projectIds } = parsed.data;

    const target = await prisma.staffTarget.create({
      data: {
        title,
        description: description || null,
        dueDate: new Date(dueDate),
        status: TargetStatus.PENDING,
        createdById: user.id,
        assignedStaff: {
          create: staffIds.map(staffId => ({ staffId })),
        },
        assignedProjects: {
          create: projectIds.map(projectId => ({ projectId })),
        },
      },
      include: {
        assignedStaff: { include: { staff: true } },
        assignedProjects: { include: { project: true } },
      },
    });

    // Notify assigned staff
    try {
      await prisma.notification.createMany({
        data: staffIds.map(staffId => ({
          recipientId: staffId,
          category: 'TARGET',
          title: `New Target Assigned: ${target.title}`,
          message: `Due date: ${dueDate}. Please review and begin work.`,
          deepLink: '/targets',
        })),
      });
    } catch (notifErr) {
      console.error('[Targets] Failed to notify assigned staff:', notifErr);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CREATE_TARGET',
      entityType: 'STAFF_TARGET',
      entityId: target.id,
      newData: { title: target.title, dueDate, assignedStaffCount: staffIds.length },
    });

    return {
      success: true,
      target,
    };
  });

  // 3. Update Target Status (Staff or Admin with state machine validation)
  app.patch('/api/targets/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const schema = z.object({
      status: z.enum(['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED']),
      submissionNotes: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid status transition' });
    }

    const target = await prisma.staffTarget.findUnique({
      where: { id: request.params.id },
      include: { assignedStaff: true },
    });

    if (!target) {
      return reply.status(404).send({ error: 'Target not found.' });
    }

    // Verify staff is assigned if actor is Staff
    if (user.role === UserRole.STAFF) {
      const isAssigned = target.assignedStaff.some(as => as.staffId === user.id);
      if (!isAssigned) {
        return reply.status(403).send({ error: 'Access denied: You are not assigned to this target.' });
      }
    }

    const currentEffective = computeEffectiveTargetStatus(target.status, target.dueDate);
    const transitionCheck = validateTargetStatusTransition(
      user.role,
      currentEffective,
      parsed.data.status as TargetStatus
    );

    if (!transitionCheck.allowed) {
      return reply.status(403).send({ error: transitionCheck.error });
    }

    const updateData: any = {
      status: parsed.data.status as TargetStatus,
    };

    if (parsed.data.submissionNotes) {
      updateData.submissionNotes = parsed.data.submissionNotes;
    }

    if (parsed.data.status === TargetStatus.SUBMITTED) {
      updateData.submittedAt = new Date();
    } else if (parsed.data.status === TargetStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.approvedById = user.id;
    }

    const updated = await prisma.staffTarget.update({
      where: { id: target.id },
      data: updateData,
    });

    // Notify appropriate stakeholders
    try {
      if (parsed.data.status === TargetStatus.SUBMITTED) {
        // Notify all studio Admins that target is ready for review
        const admins = await prisma.user.findMany({ where: { role: UserRole.ADMIN, status: 'ACTIVE' }, select: { id: true } });
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map(a => ({
              recipientId: a.id,
              category: 'TARGET',
              title: `Target Submitted for Review: ${target.title}`,
              message: `Submitted by ${user.fullName}. Requires Admin completion approval.`,
              deepLink: '/targets',
            })),
          });
        }
      } else if (parsed.data.status === TargetStatus.COMPLETED) {
        // Notify assigned staff that target has been approved
        await prisma.notification.createMany({
          data: target.assignedStaff.map(as => ({
            recipientId: as.staffId,
            category: 'TARGET',
            title: `Target Approved & Completed: ${target.title}`,
            message: `Approved by ${user.fullName}. Great job!`,
            deepLink: '/targets',
          })),
        });
      }
    } catch (notifErr) {
      console.error('[Targets] Failed to send status notification:', notifErr);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_TARGET_STATUS',
      entityType: 'STAFF_TARGET',
      entityId: updated.id,
      oldData: { status: target.status },
      newData: { status: updated.status, approvedById: updated.approvedById },
    });

    return {
      success: true,
      target: updated,
    };
  });

  // 4. Delete Target (Admin Only)
  app.delete('/api/targets/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can delete targets.' });
    }

    const target = await prisma.staffTarget.findUnique({ where: { id: request.params.id } });
    if (!target) {
      return reply.status(404).send({ error: 'Target not found.' });
    }

    await prisma.staffTarget.delete({ where: { id: target.id } });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'DELETE_TARGET',
      entityType: 'STAFF_TARGET',
      entityId: target.id,
      oldData: { title: target.title },
    });

    return {
      success: true,
      message: 'Target deleted successfully.',
    };
  });
}
