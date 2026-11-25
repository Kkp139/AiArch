import path from 'path';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { resolveUserFromRequest } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';

export async function verificationRoutes(app: FastifyInstance) {
  // Get All Submissions (Admin and Staff can access; Revision Counter is visible to both!)
  // Client Leader and Client Viewer are strictly forbidden (403)!
  app.get('/api/verification/list', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to access Design Verification.' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Design Verification is restricted to Admin and Staff.' });
    }

    const items = await prisma.designVerification.findMany({
      include: {
        project: {
          select: { id: true, projectCode: true, name: true },
        },
        folder: {
          select: { id: true, categoryCode: true, folderName: true },
        },
        submitter: {
          select: { id: true, fullName: true, role: true },
        },
        reviewer: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      projectId: item.projectId,
      projectCode: item.project.projectCode,
      projectName: item.project.name,
      folderId: item.folderId,
      category: item.folder.folderName,
      drawingTitle: item.drawingTitle,
      fileKey: item.fileKey,
      previewKey: item.previewKey,
      revisionNumber: item.revisionNumber,
      revisionLabel: `Rev ${item.revisionNumber}`, // Both Admin and Staff see revision counter
      status: item.status,
      feedbackNote: item.feedbackNote,
      submittedBy: item.submitter.fullName,
      reviewedBy: item.reviewer?.fullName,
      submittedAt: item.createdAt,
      reviewedAt: item.reviewedAt,
    }));
  });

  // Submit Drawing for Review (Staff & Admin)
  app.post('/api/verification/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Only Admin and Staff can submit drawings for verification.' });
    }

    const schema = z.object({
      projectId: z.string().min(1),
      folderId: z.string().min(1),
      drawingTitle: z.string().min(1),
      fileKey: z.string().min(1),
      previewKey: z.string().optional(),
      submittedBy: z.string().optional(),
      notes: z.string().optional(),
      feedbackNote: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid submission data' });
    }

    const { projectId, folderId, drawingTitle, fileKey, previewKey } = body.data;
    const note = body.data.notes || body.data.feedbackNote || null;

    const existing = await prisma.designVerification.findFirst({
      where: {
        projectId,
        folderId,
        drawingTitle,
      },
    });

    let item;
    if (existing) {
      item = await prisma.designVerification.update({
        where: { id: existing.id },
        data: {
          fileKey,
          previewKey,
          revisionNumber: existing.revisionNumber + 1,
          status: 'PENDING_REVIEW',
          feedbackNote: note,
          reviewedBy: null,
          reviewedAt: null,
        },
      });
    } else {
      item = await prisma.designVerification.create({
        data: {
          projectId,
          folderId,
          drawingTitle,
          fileKey,
          previewKey,
          submittedBy: user.id,
          revisionNumber: 1,
          status: 'PENDING_REVIEW',
          feedbackNote: note,
        },
      });
    }

    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN, status: 'ACTIVE' },
        select: { id: true },
      });
      const adminTargets = admins.filter((a) => a.id !== user.id);
      if (adminTargets.length > 0) {
        await prisma.notification.createMany({
          data: adminTargets.map((a) => ({
            recipientId: a.id,
            projectId,
            category: 'VERIFICATION',
            title: `Drawing Submitted for Review: ${drawingTitle}`,
            message: `${user.fullName} submitted ${drawingTitle} (Rev ${item.revisionNumber}) for verification.`,
            deepLink: '/verification',
          })),
        });
      }
    } catch (err) {
      console.error('[Verification] Failed to notify admins:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: existing ? 'RESUBMIT_VERIFICATION' : 'SUBMIT_VERIFICATION',
      entityType: 'DESIGN_VERIFICATION',
      entityId: item.id,
      oldData: existing ? { revisionNumber: existing.revisionNumber, status: existing.status } : undefined,
      newData: { revisionNumber: item.revisionNumber, drawingTitle: item.drawingTitle, status: item.status },
    });

    return {
      success: true,
      item: {
        ...item,
        revisionLabel: `Rev ${item.revisionNumber}`,
      },
    };
  });

  // Approve Drawing (Admin only - syncs approved ProjectDocument in Vault & Progress Report)
  app.post('/api/verification/:id/approve', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can approve drawings.' });
    }

    const current = await prisma.designVerification.findUnique({ where: { id: request.params.id } });
    if (!current) {
      return reply.status(404).send({ error: 'Verification submission not found.' });
    }

    const updated = await prisma.designVerification.update({
      where: { id: current.id },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    const ext = path.extname(updated.fileKey).toLowerCase() || '.dwg';
    const isDwg = ext === '.dwg';
    const mimeType = isDwg
      ? 'image/vnd.dwg'
      : ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
      ? 'image/png'
      : ext === '.jpg' || ext === '.jpeg'
      ? 'image/jpeg'
      : 'application/octet-stream';

    // Place or replace current approved drawing in ProjectFolder so Vault & Progress Report stay synced
    const existingDoc = await prisma.projectDocument.findFirst({
      where: {
        projectId: updated.projectId,
        folderId: updated.folderId,
        fileName: { contains: updated.drawingTitle },
      },
    });

    if (existingDoc) {
      await prisma.projectDocument.update({
        where: { id: existingDoc.id },
        data: {
          originalKey: updated.fileKey,
          previewKey: updated.previewKey,
          isDwg,
          mimeType,
          isApprovedDrawing: true,
        },
      });
    } else {
      const targetFileName = updated.drawingTitle.toLowerCase().endsWith(ext)
        ? updated.drawingTitle
        : `${updated.drawingTitle}${ext}`;

      await prisma.projectDocument.create({
        data: {
          projectId: updated.projectId,
          folderId: updated.folderId,
          fileName: targetFileName,
          originalKey: updated.fileKey,
          previewKey: updated.previewKey,
          fileSizeBytes: BigInt(5000000),
          mimeType,
          isDwg,
          isApprovedDrawing: true,
          uploadedBy: updated.submittedBy || user.id,
        },
      });
    }

    try {
      if (updated.submittedBy && updated.submittedBy !== user.id) {
        await prisma.notification.create({
          data: {
            recipientId: updated.submittedBy,
            projectId: updated.projectId,
            category: 'VERIFICATION',
            title: `Drawing Approved: ${updated.drawingTitle}`,
            message: `${user.fullName} approved ${updated.drawingTitle} (Rev ${updated.revisionNumber}) and published it to the Project Vault.`,
            deepLink: '/verification',
          },
        });
      }
    } catch (err) {
      console.error('[Verification] Failed to notify submitter on approval:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'APPROVE_DRAWING',
      entityType: 'DESIGN_VERIFICATION',
      entityId: updated.id,
      oldData: { status: current.status },
      newData: { status: 'APPROVED', drawingTitle: updated.drawingTitle, revisionNumber: updated.revisionNumber },
    });

    return {
      success: true,
      status: 'APPROVED',
      isLocked: true,
      item: {
        ...updated,
        revisionLabel: `Rev ${updated.revisionNumber}`,
      },
      message: 'Drawing approved and placed in project category as current approved drawing.',
    };
  });

  // Request Revision with Feedback Note (Admin only)
  app.post('/api/verification/:id/revision', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can request revisions.' });
    }

    const schema = z.object({
      feedbackNote: z.string().optional(),
      notes: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    const feedbackNote = (body.success && (body.data.notes || body.data.feedbackNote)) || '';
    if (!feedbackNote || feedbackNote.trim().length === 0) {
      return reply.status(400).send({ error: 'Feedback note is required' });
    }

    const current = await prisma.designVerification.findUnique({ where: { id: request.params.id } });
    if (!current) {
      return reply.status(404).send({ error: 'Verification submission not found.' });
    }

    const updated = await prisma.designVerification.update({
      where: { id: current.id },
      data: {
        status: 'REVISION_REQUIRED',
        feedbackNote: feedbackNote.trim(),
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    try {
      if (updated.submittedBy && updated.submittedBy !== user.id) {
        await prisma.notification.create({
          data: {
            recipientId: updated.submittedBy,
            projectId: updated.projectId,
            category: 'VERIFICATION',
            title: `Revision Requested: ${updated.drawingTitle}`,
            message: `${user.fullName} requested changes on ${updated.drawingTitle}: ${updated.feedbackNote}`,
            deepLink: '/verification',
          },
        });
      }
    } catch (err) {
      console.error('[Verification] Failed to notify submitter on revision request:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REQUEST_DRAWING_REVISION',
      entityType: 'DESIGN_VERIFICATION',
      entityId: updated.id,
      oldData: { status: current.status },
      newData: { status: 'REVISION_REQUIRED', feedbackNote: updated.feedbackNote },
    });

    return {
      success: true,
      status: 'REVISION_REQUIRED',
      item: {
        ...updated,
        revisionLabel: `Rev ${updated.revisionNumber}`,
      },
    };
  });
}
