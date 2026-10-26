import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { AnnouncementAudience, UserRole } from '@prisma/client';
import { resolveUserFromRequest } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';
import { getAudiencesForRole } from './announcements.service';

export async function announcementRoutes(app: FastifyInstance) {
  // 1. List Announcements for authenticated user based on audience
  app.get('/api/announcements', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const permittedAudiences = getAudiencesForRole(user.role);

    const announcements = await prisma.announcement.findMany({
      where: {
        audience: { in: permittedAudiences },
      },
      include: {
        publisher: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return announcements.map(a => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: a.audience,
      attachments: a.attachments,
      isWithdrawn: a.isWithdrawn,
      publisherName: a.publisherName,
      publisherRole: a.publisherRole,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));
  });

  // 2. Publish New Announcement (Admin only)
  app.post('/api/announcements', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can publish announcements.' });
    }

    const schema = z.object({
      title: z.string().min(2, 'Title is required (min 2 characters)'),
      body: z.string().optional(),
      audience: z.enum(['ALL', 'STAFF', 'CLIENT_LEADERS', 'CLIENT_VIEWERS']).optional().default('ALL'),
      attachments: z.array(z.any()).optional().default([]),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid announcement parameters' });
    }

    const { title, body, audience, attachments } = parsed.data;

    const announcement = await prisma.announcement.create({
      data: {
        title,
        body: body || null,
        audience: audience as AnnouncementAudience,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
        publisherId: user.id,
        publisherName: user.fullName,
        publisherRole: user.role,
      },
    });

    // Notify targeted users
    try {
      let recipientRoles: UserRole[] = [];
      if (audience === 'ALL') {
        recipientRoles = [UserRole.ADMIN, UserRole.STAFF, UserRole.CLIENT_LEADER, UserRole.CLIENT_VIEWER];
      } else if (audience === 'STAFF') {
        recipientRoles = [UserRole.STAFF, UserRole.ADMIN];
      } else if (audience === 'CLIENT_LEADERS') {
        recipientRoles = [UserRole.CLIENT_LEADER, UserRole.ADMIN];
      } else if (audience === 'CLIENT_VIEWERS') {
        recipientRoles = [UserRole.CLIENT_VIEWER, UserRole.ADMIN];
      }

      const recipients = await prisma.user.findMany({
        where: { role: { in: recipientRoles }, status: 'ACTIVE' },
        select: { id: true },
      });

      if (recipients.length > 0) {
        await prisma.notification.createMany({
          data: recipients.map(r => ({
            recipientId: r.id,
            category: 'ANNOUNCEMENT',
            title: `Announcement: ${announcement.title}`,
            message: announcement.body || `New circular published for ${audience.toLowerCase()}`,
            deepLink: '/announcements',
          })),
        });
      }
    } catch (notifErr) {
      console.error('[Announcements] Failed to create notifications:', notifErr);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PUBLISH_ANNOUNCEMENT',
      entityType: 'ANNOUNCEMENT',
      entityId: announcement.id,
      newData: { title: announcement.title, audience: announcement.audience },
    });

    return {
      success: true,
      announcement,
    };
  });

  // 3. Withdraw Announcement (Admin only)
  app.patch('/api/announcements/:id/withdraw', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can withdraw announcements.' });
    }

    const existing = await prisma.announcement.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Announcement not found.' });
    }

    const updated = await prisma.announcement.update({
      where: { id: existing.id },
      data: { isWithdrawn: true },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'WITHDRAW_ANNOUNCEMENT',
      entityType: 'ANNOUNCEMENT',
      entityId: updated.id,
      oldData: { isWithdrawn: existing.isWithdrawn },
      newData: { isWithdrawn: true },
    });

    return {
      success: true,
      announcement: updated,
    };
  });

  // 4. Delete Announcement (Admin only)
  app.delete('/api/announcements/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can delete announcements.' });
    }

    const existing = await prisma.announcement.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Announcement not found.' });
    }

    await prisma.announcement.delete({ where: { id: existing.id } });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'DELETE_ANNOUNCEMENT',
      entityType: 'ANNOUNCEMENT',
      entityId: existing.id,
      oldData: { title: existing.title, audience: existing.audience },
    });

    return {
      success: true,
      message: 'Announcement deleted successfully.',
    };
  });

  // 5. List Policies for authenticated users (Staff & Clients)
  app.get('/api/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const policies = await prisma.studioPolicy.findMany({
      include: {
        acknowledgments: {
          where: { userId: user.id },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return policies.map(p => ({
      id: p.id,
      title: p.title,
      content: p.content,
      attachments: p.attachments,
      isWithdrawn: p.isWithdrawn,
      publisherName: p.publisherName,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      isAcknowledged: p.acknowledgments.length > 0,
      acknowledgedAt: p.acknowledgments[0]?.acknowledgedAt || null,
    }));
  });

  // 6. Publish Studio Policy (Admin only)
  app.post('/api/policies', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can publish studio policies.' });
    }

    const schema = z.object({
      title: z.string().min(2, 'Policy title is required'),
      content: z.string().optional(),
      attachments: z.array(z.any()).optional().default([]),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid policy parameters' });
    }

    const policy = await prisma.studioPolicy.create({
      data: {
        title: parsed.data.title,
        content: parsed.data.content || null,
        attachments: parsed.data.attachments.length > 0 ? parsed.data.attachments : undefined,
        publisherId: user.id,
        publisherName: user.fullName,
      },
    });

    // Notify all active users
    try {
      const activeUsers = await prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
      if (activeUsers.length > 0) {
        await prisma.notification.createMany({
          data: activeUsers.map(u => ({
            recipientId: u.id,
            category: 'POLICY',
            title: `Studio Policy: ${policy.title}`,
            message: `A new policy document has been published. Please review and acknowledge.`,
            deepLink: '/policies',
          })),
        });
      }
    } catch (notifErr) {
      console.error('[Policies] Failed to create notifications:', notifErr);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'PUBLISH_POLICY',
      entityType: 'STUDIO_POLICY',
      entityId: policy.id,
      newData: { title: policy.title },
    });

    return {
      success: true,
      policy,
    };
  });

  // 7. Withdraw Studio Policy (Admin only)
  app.patch('/api/policies/:id/withdraw', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can withdraw policies.' });
    }

    const existing = await prisma.studioPolicy.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Policy not found.' });
    }

    const updated = await prisma.studioPolicy.update({
      where: { id: existing.id },
      data: { isWithdrawn: true },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'WITHDRAW_POLICY',
      entityType: 'STUDIO_POLICY',
      entityId: updated.id,
      oldData: { isWithdrawn: existing.isWithdrawn },
      newData: { isWithdrawn: true },
    });

    return {
      success: true,
      policy: updated,
    };
  });

  // 8. Acknowledge Policy (Staff & Clients)
  app.post('/api/policies/:id/acknowledge', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const policy = await prisma.studioPolicy.findUnique({ where: { id: request.params.id } });
    if (!policy) {
      return reply.status(404).send({ error: 'Policy not found.' });
    }

    const ack = await prisma.policyAcknowledgment.upsert({
      where: {
        policyId_userId: {
          policyId: policy.id,
          userId: user.id,
        },
      },
      create: {
        policyId: policy.id,
        userId: user.id,
      },
      update: {
        acknowledgedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'ACKNOWLEDGE_POLICY',
      entityType: 'POLICY_ACKNOWLEDGMENT',
      entityId: ack.id,
      newData: { policyId: policy.id, acknowledgedAt: ack.acknowledgedAt },
    });

    return {
      success: true,
      acknowledgedAt: ack.acknowledgedAt,
      message: 'Policy acknowledged successfully.',
    };
  });
}
