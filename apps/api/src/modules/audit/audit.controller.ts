import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest } from '../../lib/auth-guard';
import { sanitizeAuditData } from '../../lib/audit.service';

export async function auditRoutes(app: FastifyInstance) {
  // List Tamper-Evident Audit Logs (Strictly Admin-only)
  app.get('/api/audit-logs', async (
    request: FastifyRequest<{ Querystring: { entityType?: string; action?: string; limit?: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Studio audit logs are strictly restricted to Administrators.' });
    }

    const { entityType, action, limit } = request.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit || '100', 10) || 100, 1), 200);

    const where: any = {};
    if (entityType && entityType.trim() && entityType.toUpperCase() !== 'ALL') {
      where.entityType = entityType.trim().toUpperCase();
    }
    if (action && action.trim()) {
      where.action = action.trim().toUpperCase();
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: { id: true, fullName: true, username: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parsedLimit,
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      actorId: l.actorId,
      actorName: l.actor?.fullName || l.actorName,
      actorRole: l.actor?.role || l.actorRole,
      action: l.action,
      entityType: l.entityType,
      entityId: l.entityId,
      oldData: l.oldData ? sanitizeAuditData(l.oldData) : null,
      newData: l.newData ? sanitizeAuditData(l.newData) : null,
      ipAddress: l.ipAddress || null,
      createdAt: l.createdAt.toISOString(),
    }));

    return {
      logs: formatted,
      totalCount: formatted.length,
    };
  });
}
