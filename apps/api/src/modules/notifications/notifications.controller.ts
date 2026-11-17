import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest } from '../../lib/auth-guard';

export async function notificationRoutes(app: FastifyInstance) {
  // Get all notifications for the current authenticated user
  app.get('/api/notifications', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required to view notifications.' });
    }

    try {
      const dbNotifications = await prisma.notification.findMany({
        where: { recipientId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          project: {
            select: { id: true, projectCode: true, name: true },
          },
        },
      });

      const formatted = dbNotifications.map((n) => ({
        id: n.id,
        recipientId: n.recipientId,
        projectId: n.projectId,
        projectCode: n.project?.projectCode || null,
        projectName: n.project?.name || null,
        category: n.category,
        title: n.title,
        message: n.message,
        deepLink: n.deepLink || '/meetings',
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }));

      const unreadCount = formatted.filter((n) => !n.isRead).length;

      return {
        notifications: formatted,
        unreadCount,
      };
    } catch (err) {
      console.error('Failed to query notifications:', err);
      return reply.status(500).send({ error: 'Failed to retrieve notifications.' });
    }
  });

  // Mark single notification as read
  app.post('/api/notifications/:id/read', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const { id } = request.params;
    try {
      await prisma.notification.updateMany({
        where: { id, recipientId: user.id },
        data: { isRead: true },
      });
      return { success: true };
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      return reply.status(500).send({ error: 'Failed to update notification.' });
    }
  });

  // Mark all notifications as read for current user
  app.post('/api/notifications/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    try {
      await prisma.notification.updateMany({
        where: { recipientId: user.id, isRead: false },
        data: { isRead: true },
      });
      return { success: true };
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      return reply.status(500).send({ error: 'Failed to update notifications.' });
    }
  });
}
