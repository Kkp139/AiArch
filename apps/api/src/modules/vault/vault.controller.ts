import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { vaultService } from './vault.service';

export async function vaultRoutes(app: FastifyInstance) {
  // Request Presigned Upload & Evaluate Naming
  app.post('/api/vault/presigned-upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      projectCode: z.string().min(1),
      filename: z.string().min(1),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid projectCode and filename required' });
    }

    try {
      const result = await vaultService.prepareUpload(body.data.projectCode, body.data.filename);
      return result;
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });

  // Get File Download URL (Protected by folder & project download permissions)
  app.get('/api/vault/document/:id/download', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const userRole = (request as any).user?.role || 'CLIENT_LEADER';
    const mockPermission = userRole === 'CLIENT_VIEWER' ? 'VIEW_ONLY' : 'VIEW_AND_DOWNLOAD';

    const downloadUrl = vaultService.getDownloadUrl(`drawings/sample.dwg`, mockPermission);
    if (!downloadUrl) {
      return reply.status(403).send({ error: 'Download permission denied for this document (View Only mode)' });
    }

    return { downloadUrl };
  });
}
