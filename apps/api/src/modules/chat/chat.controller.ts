import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';

export async function chatRoutes(app: FastifyInstance) {
  // Get Chat History for a Project
  app.get('/api/chat/projects/:projectCode/messages', async (request: FastifyRequest<{ Params: { projectCode: string } }>, reply: FastifyReply) => {
    const { projectCode } = request.params;
    const authHeader = request.headers.authorization || '';

    // CHAT ACCESS RULE: Strictly restricted to Admin and Client Leader!
    // Staff and Client Viewer are blocked.
    if (authHeader.includes('staff') || authHeader.includes('viewer')) {
      return reply.status(403).send({
        error: 'Forbidden: Project chat is strictly restricted to Studio Admins and Client Leaders.',
      });
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
    const { projectCode } = request.params;
    const authHeader = request.headers.authorization || '';

    if (authHeader.includes('staff') || authHeader.includes('viewer')) {
      return reply.status(403).send({
        error: 'Forbidden: Project chat is strictly restricted to Studio Admins and Client Leaders.',
      });
    }

    const schema = z.object({
      messageText: z.string().min(1, 'Message text is required'),
      attachmentKey: z.string().optional(),
      senderId: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid message payload' });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectCode }, { projectCode }],
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    let sender = null;
    if (body.data.senderId) {
      sender = await prisma.user.findUnique({ where: { id: body.data.senderId } });
    }
    if (!sender) {
      sender = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    }

    const message = await prisma.chatMessage.create({
      data: {
        projectId: project.id,
        senderId: sender!.id,
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
