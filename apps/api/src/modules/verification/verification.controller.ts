import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
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

    // Only Admin and Staff have access to Design Verification module
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
      revisionLabel: `Rev ${item.revisionNumber}`, // USER REQUIREMENT: Both Admin and Staff can see revision counter
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
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid submission data' });
    }

    const { projectId, folderId, drawingTitle, fileKey, previewKey } = body.data;

    // Resolve submitter user
    const submitterId = user.id;

    // Check if drawing already exists for this folder/title to increment revision
    const existing = await prisma.designVerification.findFirst({
      where: {
        projectId,
        folderId,
        drawingTitle,
      },
    });

    let item;
    if (existing) {
      // Single workspace rule: replace with updated submission and increment revision counter
      item = await prisma.designVerification.update({
        where: { id: existing.id },
        data: {
          fileKey,
          previewKey,
          revisionNumber: existing.revisionNumber + 1,
          status: 'PENDING_REVIEW',
          feedbackNote: null,
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
          submittedBy: submitterId,
          revisionNumber: 1,
          status: 'PENDING_REVIEW',
        },
      });
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

  // Approve Drawing (Admin only)
  app.post('/api/verification/:id/approve', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can approve drawings.' });
    }

    const updated = await prisma.designVerification.update({
      where: { id: request.params.id },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    // Automatically place/replace current approved drawing in ProjectFolder
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
          isApprovedDrawing: true,
        },
      });
    } else {
      await prisma.projectDocument.create({
        data: {
          projectId: updated.projectId,
          folderId: updated.folderId,
          fileName: `${updated.drawingTitle}.dwg`,
          originalKey: updated.fileKey,
          previewKey: updated.previewKey,
          fileSizeBytes: BigInt(5000000),
          mimeType: 'image/vnd.dwg',
          isDwg: true,
          isApprovedDrawing: true,
          uploadedBy: user.id,
        },
      });
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'APPROVE_DRAWING',
      entityType: 'DESIGN_VERIFICATION',
      entityId: updated.id,
      oldData: { status: 'PENDING_REVIEW' },
      newData: { status: 'APPROVED', drawingTitle: updated.drawingTitle, revisionNumber: updated.revisionNumber },
    });

    return {
      success: true,
      status: 'APPROVED',
      isLocked: true,
      item: updated,
      message: 'Drawing approved and placed in project category as current approved drawing.',
    };
  });

  // Request Revision with Feedback Note (Admin only)
  app.post('/api/verification/:id/revision', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can request revisions.' });
    }

    const schema = z.object({
      feedbackNote: z.string().min(1, 'Feedback note is required'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Feedback note is required' });
    }

    const updated = await prisma.designVerification.update({
      where: { id: request.params.id },
      data: {
        status: 'REVISION_REQUIRED',
        feedbackNote: body.data.feedbackNote,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REQUEST_DRAWING_REVISION',
      entityType: 'DESIGN_VERIFICATION',
      entityId: updated.id,
      oldData: { status: 'PENDING_REVIEW' },
      newData: { status: 'REVISION_REQUIRED', feedbackNote: updated.feedbackNote },
    });

    return {
      success: true,
      status: 'REVISION_REQUIRED',
      item: updated,
    };
  });
}
