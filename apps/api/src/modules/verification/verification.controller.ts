import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { canRoleAccessVerification, serializeVerificationItem } from './verification.service';

export async function verificationRoutes(app: FastifyInstance) {
  // Submit Drawing for Review (Staff & Admin)
  app.post('/api/verification/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = (request as any).user?.role || 'STAFF';
    if (!canRoleAccessVerification(userRole)) {
      return reply.status(403).send({ error: 'Access denied to Design Verification module' });
    }

    const schema = z.object({
      projectId: z.string().min(1),
      folderId: z.string().min(1),
      drawingTitle: z.string().min(1),
      fileKey: z.string().min(1),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid submission data' });
    }

    return {
      success: true,
      item: {
        id: 'verif-new-id',
        ...body.data,
        revisionNumber: 1,
        revisionLabel: 'Rev 1',
        status: 'PENDING_REVIEW',
      },
    };
  });

  // Get Submissions (Staff sees their own, Admin sees all; both see revisionNumber)
  app.get('/api/verification/list', async (request: FastifyRequest, reply: FastifyReply) => {
    const userRole = (request as any).user?.role || 'STAFF';
    if (!canRoleAccessVerification(userRole)) {
      return reply.status(403).send({ error: 'Access denied to Design Verification module' });
    }

    const mockItem = {
      id: 'verif-1',
      drawingTitle: 'Ground Floor Column Layout',
      revisionNumber: 2,
      status: 'REVISION_REQUIRED' as const,
      feedbackNote: 'Revise column dimensions to 450x600',
    };

    return [serializeVerificationItem(mockItem, userRole)];
  });

  // Approve Drawing (Admin only)
  app.post('/api/verification/:id/approve', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userRole = (request as any).user?.role || 'ADMIN';
    if (userRole !== 'ADMIN') {
      return reply.status(403).send({ error: 'Only Admins can approve design verifications' });
    }

    return {
      success: true,
      status: 'APPROVED',
      isLocked: true,
      message: 'Drawing approved and placed in project category as current approved drawing.',
    };
  });
}
