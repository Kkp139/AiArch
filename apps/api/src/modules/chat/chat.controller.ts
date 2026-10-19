import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { canUserAccessProjectChat, chatService, UserRole } from './chat.service';

function resolveUserFromRequest(request: FastifyRequest): { id: string; role: UserRole; name: string; projectIds: string[] } {
  const authHeader = request.headers.authorization || '';

  if (authHeader.includes('mock-admin-token')) {
    return { id: 'admin-1', role: 'ADMIN', name: 'Admin Lead', projectIds: [] };
  }
  if (authHeader.includes('mock-staff-token')) {
    return { id: 'staff-1', role: 'STAFF', name: 'Architect Staff', projectIds: ['proj-1'] };
  }
  if (authHeader.includes('mock-viewer-token')) {
    return { id: 'viewer-1', role: 'CLIENT_VIEWER', name: 'Client Viewer', projectIds: ['proj-1'] };
  }
  if (authHeader.includes('mock-client-token')) {
    return { id: 'client-1', role: 'CLIENT_LEADER', name: 'Client Leader', projectIds: ['proj-1'] };
  }

  const user = (request as any).user;
  if (user) {
    return {
      id: user.id || 'anonymous',
      role: (user.role as UserRole) || 'STAFF',
      name: user.name || 'Anonymous User',
      projectIds: user.projectIds || [],
    };
  }

  // Default fallback for unauthorized callers
  return { id: 'anon', role: 'STAFF', name: 'Unknown', projectIds: [] };
}

export async function chatRoutes(app: FastifyInstance) {
  // Get Chat History for a Project
  app.get(
    '/api/chat/projects/:projectId/messages',
    async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
      const user = resolveUserFromRequest(request);
      const { projectId } = request.params;

      if (!canUserAccessProjectChat(user.role, user.projectIds, projectId)) {
        return reply.status(403).send({
          error: `Forbidden: User role '${user.role}' is not authorized to access project chat.`,
        });
      }

      try {
        const messages = chatService.getMessages(projectId, user.role, user.projectIds);
        return messages;
      } catch (err: any) {
        return reply.status(403).send({ error: err.message });
      }
    }
  );

  // Send Chat Message
  app.post(
    '/api/chat/projects/:projectId/messages',
    async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
      const user = resolveUserFromRequest(request);
      const { projectId } = request.params;

      if (!canUserAccessProjectChat(user.role, user.projectIds, projectId)) {
        return reply.status(403).send({
          error: `Forbidden: User role '${user.role}' is not authorized to send messages in project chat.`,
        });
      }

      const schema = z.object({
        messageText: z.string().min(1),
        attachment: z
          .object({
            fileName: z.string().min(1),
            fileSize: z.number().positive(),
            mimeType: z.string().min(1),
            url: z.string().url(),
          })
          .optional(),
      });

      const body = schema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'Invalid message payload' });
      }

      try {
        const message = chatService.sendMessage({
          projectId,
          senderId: user.id,
          senderRole: user.role,
          senderName: user.name,
          userProjectIds: user.projectIds,
          text: body.data.messageText,
          attachment: body.data.attachment,
        });

        return reply.status(201).send(message);
      } catch (err: any) {
        return reply.status(400).send({ error: err.message });
      }
    }
  );
}
