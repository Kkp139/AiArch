import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { calculateProgress } from './progress.service';
import { validateProjectStatusTransition } from './projects.service';

export async function projectRoutes(app: FastifyInstance) {
  // Create Project (Admin only)
  app.post('/api/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      projectCode: z.string().min(2).max(32),
      name: z.string().min(1),
      category: z.string().min(1),
      siteLocation: z.string().min(1),
      totalAgreedFee: z.number().optional().default(0),
      advancePaymentReceived: z.number().optional().default(0),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid project data' });
    }

    return {
      success: true,
      project: {
        id: 'proj-uuid-placeholder',
        ...body.data,
        status: 'ACTIVE',
        folderCount: 16,
      },
    };
  });

  // Get Progress
  app.get('/api/projects/:id/progress', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    // In actual database query: count populated categories
    const mockPopulated = 12;
    const progress = calculateProgress(mockPopulated);
    return progress;
  });

  // Toggle Active / Inactive Status
  app.patch('/api/projects/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const schema = z.object({
      status: z.enum(['ACTIVE', 'INACTIVE']),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Status must be ACTIVE or INACTIVE' });
    }

    return {
      success: true,
      projectId: request.params.id,
      status: body.data.status,
    };
  });
}
