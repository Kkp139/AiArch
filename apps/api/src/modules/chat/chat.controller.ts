import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';
import { getSocketIO } from '../../gateway/socket.gateway';

function formatAttachmentUrl(attachmentKey: string | null | undefined): string | undefined {
  if (!attachmentKey) return undefined;
  if (
    attachmentKey.startsWith('data:') ||
    attachmentKey.startsWith('http://') ||
    attachmentKey.startsWith('https://')
  ) {
    return attachmentKey;
  }
  const bucket = process.env.S3_BUCKET_NAME || 'afdesign-vault-prod';
  return `https://${bucket}.r2.cloudflarestorage.com/${attachmentKey}`;
}

export async function chatRoutes(app: FastifyInstance) {
  // Get Chat History for a Project (Admin, assigned Client Leader, assigned Client Viewer; Staff strictly 403)
  app.get('/api/chat/projects/:projectCode/messages', async (
    request: FastifyRequest<{ Params: { projectCode: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to access project chat.' });
    }

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

    if (user.role !== 'ADMIN' && project.status === 'INACTIVE') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
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

    return messages.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      senderId: m.senderId,
      senderName: m.sender.fullName,
      senderRole: m.sender.role,
      text: m.messageText,
      attachmentUrl: formatAttachmentUrl(m.attachmentKey),
      createdAt: m.createdAt,
    }));
  });

  // Send Chat Message (Broadcasts via Socket.io if active)
  app.post('/api/chat/projects/:projectCode/messages', async (
    request: FastifyRequest<{ Params: { projectCode: string } }>,
    reply: FastifyReply
  ) => {
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

    if (user.role !== 'ADMIN' && project.status === 'INACTIVE') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
    }

    const schema = z.object({
      messageText: z.string().optional().default(''),
      attachmentKey: z.string().optional(),
    }).refine(
      (data) => data.messageText.trim().length > 0 || Boolean(data.attachmentKey && data.attachmentKey.trim().length > 0),
      { message: 'Message text or attachment is required' }
    );

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid message payload' });
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId: project.id,
        senderId: user.id,
        messageText: body.data.messageText.trim(),
        attachmentKey: body.data.attachmentKey,
      },
      include: {
        sender: true,
      },
    });

    const formattedMessage = {
      id: message.id,
      projectId: message.projectId,
      senderId: message.senderId,
      senderName: message.sender.fullName,
      senderRole: message.sender.role,
      text: message.messageText,
      attachmentUrl: formatAttachmentUrl(message.attachmentKey),
      createdAt: message.createdAt,
    };

    const io = getSocketIO();
    if (io) {
      io.to(`project:${project.id}`).emit('new_message', formattedMessage);
      io.to(`project:${project.projectCode}`).emit('new_message', formattedMessage);
    }

    return formattedMessage;
  });
}
