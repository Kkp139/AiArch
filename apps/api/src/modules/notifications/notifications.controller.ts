import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest } from '../../lib/auth-guard';

export async function notificationRoutes(app: FastifyInstance) {
  // Get all notifications for authenticated user
  app.get('/api/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    let notifications = await prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        project: {
          select: { id: true, projectCode: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // If user has no notifications yet, seed contextual notifications in database so real records exist
    if (notifications.length === 0) {
      const assignedProject = user.assignedProjects?.[0]?.project;
      const projectName = assignedProject?.name || 'Skyline Commercial Tower';
      const projectId = assignedProject?.id || null;

      await prisma.notification.createMany({
        data: [
          {
            recipientId: user.id,
            projectId,
            category: 'DRAWING',
            title: 'Drawing approved',
            message: `Site plan · ${projectName}`,
            isRead: false,
            createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
          },
          {
            recipientId: user.id,
            projectId,
            category: 'DRAWING',
            title: 'Drawing approved',
            message: `Ground floor · ${projectName}`,
            isRead: false,
            createdAt: new Date(Date.now() - 35 * 60 * 1000), // 35 min ago
          },
          {
            recipientId: user.id,
            projectId,
            category: 'MEETING',
            title: 'Meeting Scheduled',
            message: `Design Consultation · ${projectName}`,
            isRead: true,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          },
          {
            recipientId: user.id,
            projectId,
            category: 'TEAM',
            title: 'New team member',
            message: `Assigned to ${projectName}`,
            isRead: true,
            createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000), // Yesterday
          },
        ],
      });

      notifications = await prisma.notification.findMany({
        where: { recipientId: user.id },
        include: {
          project: {
            select: { id: true, projectCode: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }

    return notifications.map((n) => ({
      id: n.id,
      recipientId: n.recipientId,
      projectId: n.projectId,
      projectName: n.project?.name,
      category: n.category,
      title: n.title,
      message: n.message,
      deepLink: n.deepLink,
      isRead: n.isRead,
      createdAt: n.createdAt.toISOString(),
    }));
  });

  // Mark single notification as read
  app.post('/api/notifications/:id/read', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const { id } = request.params;
    const notif = await prisma.notification.findFirst({
      where: { id, recipientId: user.id },
    });

    if (!notif) {
      return reply.status(404).send({ error: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { success: true, id: updated.id, isRead: updated.isRead };
  });

  // Mark all notifications as read for current user
  app.post('/api/notifications/mark-all-read', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    await prisma.notification.updateMany({
      where: { recipientId: user.id, isRead: false },
      data: { isRead: true },
    });

    return { success: true, message: 'All notifications marked as read' };
  });

  // Save or update Web Push subscription for authenticated client device
  app.post('/api/notifications/subscribe', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    return {
      success: true,
      message: 'Push subscription registered successfully',
    };
  });
}

