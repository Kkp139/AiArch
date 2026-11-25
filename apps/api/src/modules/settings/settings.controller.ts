import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';

const DEFAULT_SLOTS = ['12:00', '17:30'];

async function getOrCreateStudioSetting() {
  const existing = await prisma.studioSetting.findUnique({ where: { id: 'singleton' } });
  if (existing) return existing;
  return prisma.studioSetting.create({
    data: {
      id: 'singleton',
      firmName: 'A&F Design',
      clientLeaderApprovalRequired: true,
      clientViewerApprovalRequired: false,
      maxFileSizeMb: 50,
      allowedExtensions: '.pdf,.dwg,.dxf,.dgn,.jpg,.jpeg,.png,.webp',
      updateTriggerMode: 'FIXED_SLOTS',
      updateIntervalHours: 4,
      fixedUpdateSlots: DEFAULT_SLOTS,
      primaryColor: '#BF935A',
      accentColor: '#352618',
    },
  });
}

export async function settingsRoutes(app: FastifyInstance) {
  // Get Studio Settings (Authenticated)
  app.get('/api/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const settings = await getOrCreateStudioSetting();
    return {
      settings: {
        ...settings,
        fixedUpdateSlots: settings.fixedUpdateSlots ?? DEFAULT_SLOTS,
        updatedAt: settings.updatedAt.toISOString(),
      },
    };
  });

  // Update Studio Settings (Strictly Admin-only)
  app.patch('/api/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only Administrators can modify studio settings.' });
    }

    const schema = z.object({
      firmName: z.string().min(1).max(120).optional(),
      clientLeaderApprovalRequired: z.boolean().optional(),
      clientViewerApprovalRequired: z.boolean().optional(),
      maxFileSizeMb: z.number().int().min(1).max(500).optional(),
      allowedExtensions: z.string().min(2).optional(),
      updateTriggerMode: z.enum(['FIXED_SLOTS', 'INTERVAL']).optional(),
      updateIntervalHours: z.number().int().min(1).max(24).optional(),
      fixedUpdateSlots: z.array(z.string()).optional(),
      primaryColor: z.string().min(4).max(32).optional(),
      accentColor: z.string().min(4).max(32).optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid studio settings payload' });
    }

    const previous = await getOrCreateStudioSetting();

    const updated = await prisma.studioSetting.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        firmName: parsed.data.firmName ?? previous.firmName,
        clientLeaderApprovalRequired: parsed.data.clientLeaderApprovalRequired ?? previous.clientLeaderApprovalRequired,
        clientViewerApprovalRequired: parsed.data.clientViewerApprovalRequired ?? previous.clientViewerApprovalRequired,
        maxFileSizeMb: parsed.data.maxFileSizeMb ?? previous.maxFileSizeMb,
        allowedExtensions: parsed.data.allowedExtensions ?? previous.allowedExtensions,
        updateTriggerMode: parsed.data.updateTriggerMode ?? previous.updateTriggerMode,
        updateIntervalHours: parsed.data.updateIntervalHours ?? previous.updateIntervalHours,
        fixedUpdateSlots: (parsed.data.fixedUpdateSlots ?? previous.fixedUpdateSlots ?? DEFAULT_SLOTS) as any,
        primaryColor: parsed.data.primaryColor ?? previous.primaryColor,
        accentColor: parsed.data.accentColor ?? previous.accentColor,
      },
      update: {
        ...(parsed.data.firmName !== undefined ? { firmName: parsed.data.firmName.trim() } : {}),
        ...(parsed.data.clientLeaderApprovalRequired !== undefined
          ? { clientLeaderApprovalRequired: parsed.data.clientLeaderApprovalRequired }
          : {}),
        ...(parsed.data.clientViewerApprovalRequired !== undefined
          ? { clientViewerApprovalRequired: parsed.data.clientViewerApprovalRequired }
          : {}),
        ...(parsed.data.maxFileSizeMb !== undefined ? { maxFileSizeMb: parsed.data.maxFileSizeMb } : {}),
        ...(parsed.data.allowedExtensions !== undefined ? { allowedExtensions: parsed.data.allowedExtensions.trim() } : {}),
        ...(parsed.data.updateTriggerMode !== undefined ? { updateTriggerMode: parsed.data.updateTriggerMode } : {}),
        ...(parsed.data.updateIntervalHours !== undefined ? { updateIntervalHours: parsed.data.updateIntervalHours } : {}),
        ...(parsed.data.fixedUpdateSlots !== undefined ? { fixedUpdateSlots: parsed.data.fixedUpdateSlots as any } : {}),
        ...(parsed.data.primaryColor !== undefined ? { primaryColor: parsed.data.primaryColor.trim() } : {}),
        ...(parsed.data.accentColor !== undefined ? { accentColor: parsed.data.accentColor.trim() } : {}),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_STUDIO_SETTINGS',
      entityType: 'STUDIO_SETTING',
      entityId: updated.id,
      oldData: {
        firmName: previous.firmName,
        maxFileSizeMb: previous.maxFileSizeMb,
        updateTriggerMode: previous.updateTriggerMode,
        clientLeaderApprovalRequired: previous.clientLeaderApprovalRequired,
        clientViewerApprovalRequired: previous.clientViewerApprovalRequired,
      },
      newData: {
        firmName: updated.firmName,
        maxFileSizeMb: updated.maxFileSizeMb,
        updateTriggerMode: updated.updateTriggerMode,
        clientLeaderApprovalRequired: updated.clientLeaderApprovalRequired,
        clientViewerApprovalRequired: updated.clientViewerApprovalRequired,
      },
    });

    return {
      success: true,
      settings: {
        ...updated,
        fixedUpdateSlots: updated.fixedUpdateSlots ?? DEFAULT_SLOTS,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  });
}
