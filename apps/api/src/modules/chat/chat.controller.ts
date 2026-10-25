import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';

export async function chatRoutes(app: FastifyInstance) {
  // Get Chat History for a Project (Strictly restricted to Admin and assigned Client Leader!)
  app.get('/api/chat/projects/:projectCode/messages', async (request: FastifyRequest<{ Params: { projectCode: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to access project chat.' });
    }

    // CHAT ACCESS RULE: Admin has full access; Client Leader & Client Viewer have dynamic access based on project assignment.
    // Staff is blocked.
    if (user.role === 'STAFF') {
      return reply.status(403).send({
        error: 'Forbidden: Studio staff cannot access client discussions.',
      });
    }

    if (user.role !== 'ADMIN' && user.role !== 'CLIENT_LEADER' && user.role !== 'CLIENT_VIEWER') {
      return reply.status(403).send({
        error: 'Forbidden: Project chat is strictly restricted to Admins, Client Leaders, and Client Viewers.',
      });
    }

    const { projectCode } = request.params;
    if (!userHasProjectAccess(user, projectCode)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectCode }, { projectCode }],
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { projectId: project.id },
      include: {
        sender: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return messages.map(m => ({
      id: m.id,
      projectId: m.projectId,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      senderRole: m.sender.role,
      text: m.messageText,
      attachmentUrl: m.attachmentKey ? `https://${process.env.S3_BUCKET_NAME || 'afdesign-vault-prod'}.r2.cloudflarestorage.com/${m.attachmentKey}` : undefined,
      createdAt: m.createdAt,
    }));
  });

  // Send Chat Message
  app.post('/api/chat/projects/:projectCode/messages', async (request: FastifyRequest<{ Params: { projectCode: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (user.role === 'STAFF') {
      return reply.status(403).send({
        error: 'Forbidden: Studio staff cannot post in client discussions.',
      });
    }

    if (user.role !== 'ADMIN' && user.role !== 'CLIENT_LEADER' && user.role !== 'CLIENT_VIEWER') {
      return reply.status(403).send({
        error: 'Forbidden: Project chat is restricted to Admins, Client Leaders, and Client Viewers.',
      });
    }

    const { projectCode } = request.params;
    if (!userHasProjectAccess(user, projectCode)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectCode }, { projectCode }],
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    const schema = z.object({
      messageText: z.string().min(1, 'Message text is required'),
      attachmentKey: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid message payload' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId: project.id,
        senderId: user.id,
        messageText: body.data.messageText,
        attachmentKey: body.data.attachmentKey,
      },
      include: {
        sender: true,
      },
    });

    return {
      id: message.id,
      projectId: message.projectId,
      senderId: message.senderId,
      senderName: message.sender.fullName,
      senderRole: message.sender.role,
      text: message.messageText,
      createdAt: message.createdAt,
    };
  });
}
