import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { vaultService } from './vault.service';
import { isAllowedFileType, parseFileName } from './naming.service';
import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';

export async function vaultRoutes(app: FastifyInstance) {
  // Get all documents for a project grouped by folder
  app.get('/api/vault/projects/:projectCode/documents', async (request: FastifyRequest<{ Params: { projectCode: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to view documents.' });
    }

    const { projectCode } = request.params;

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectCode }, { projectCode }],
      },
      include: {
        folders: {
          include: {
            documents: {
              include: {
                uploader: {
                  select: { id: true, fullName: true, role: true },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
            permissions: true,
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    if (!userHasProjectAccess(user, project.id)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    const isClient = user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER';
    if (isClient && project.status === 'INACTIVE') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
    }

    return {
      projectCode: project.projectCode,
      projectStatus: project.status,
      allowClientDownloads: project.allowClientDownloads,
      folders: project.folders.map((f) => {
        const rolePerm = f.permissions.find((p) => p.role === user.role);
        const effectiveAccess = isClient
          ? project.allowClientDownloads === 'VIEW_ONLY' || rolePerm?.accessLevel === 'VIEW_ONLY'
            ? 'VIEW_ONLY'
            : 'VIEW_AND_DOWNLOAD'
          : 'VIEW_AND_DOWNLOAD';

        return {
          id: f.id,
          categoryCode: f.categoryCode,
          folderName: f.folderName,
          phaseGroup: f.phaseGroup,
          accessLevel: effectiveAccess,
          fileCount: f.documents.length,
          documents: f.documents.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            fileSizeBytes: Number(d.fileSizeBytes),
            mimeType: d.mimeType,
            isDwg: d.isDwg,
            isApprovedDrawing: d.isApprovedDrawing,
            previewKey: d.previewKey,
            createdAt: d.createdAt,
            uploader: d.uploader,
          })),
        };
      }),
    };
  });

  // Request Presigned Upload & Evaluate Naming Convention
  app.post('/api/vault/presigned-upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (user.role === 'CLIENT_VIEWER') {
      return reply.status(403).send({ error: 'Forbidden: Client Viewers cannot upload documents.' });
    }

    const schema = z.object({
      projectCode: z.string().min(1),
      filename: z.string().min(1),
      folderId: z.string().optional(),
      categoryCode: z.string().optional(),
      fileSizeBytes: z.number().optional().default(1024),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid projectCode and filename required' });
    }

    const { projectCode, filename, fileSizeBytes, folderId, categoryCode } = body.data;

    if (!isAllowedFileType(filename)) {
      return reply.status(400).send({
        error: `File type not allowed. Allowed types: .pdf, .dwg, .dxf, .dgn, .jpg, .jpeg, .png, .webp`,
      });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectCode }, { projectCode }],
      },
      include: {
        folders: true,
      },
    });

    if (!project) {
      return reply.status(404).send({ error: `Project '${projectCode}' not found.` });
    }

    if (!userHasProjectAccess(user, project.id)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    if (project.status !== 'ACTIVE' && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Uploads are disabled on inactive projects.' });
    }

    const parseResult = parseFileName(filename, project.projectCode);

    // Target folder lookup: explicit folderId, categoryCode, parsed category, or fallback
    let targetFolder = folderId
      ? project.folders.find((f) => f.id === folderId)
      : categoryCode
      ? project.folders.find((f) => f.categoryCode === categoryCode)
      : project.folders.find((f) => f.categoryCode === parseResult.categoryCode);

    if (!targetFolder) {
      targetFolder = project.folders.find((f) => f.categoryCode === '16_OTHER' || f.categoryCode === '03_OTHER') || project.folders[0];
    }

    const uploadResult = await vaultService.prepareUpload(project.projectCode, filename);
    const isDwg = filename.toLowerCase().endsWith('.dwg');

    const document = await prisma.projectDocument.create({
      data: {
        projectId: project.id,
        folderId: targetFolder.id,
        fileName: filename,
        originalKey: uploadResult.fileKey,
        previewKey: isDwg ? `previews/${uploadResult.fileKey}.pdf` : null,
        fileSizeBytes: BigInt(fileSizeBytes),
        mimeType: isDwg ? 'image/vnd.dwg' : 'application/pdf',
        isDwg,
        uploadedBy: user.id,
      },
      include: {
        uploader: true,
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPLOAD_DOCUMENT',
      entityType: 'PROJECT_DOCUMENT',
      entityId: document.id,
      newData: {
        projectCode: project.projectCode,
        folderCode: targetFolder.categoryCode,
        fileName: document.fileName,
      },
    });

    return {
      success: true,
      documentId: document.id,
      uploadUrl: uploadResult.uploadUrl,
      fileKey: uploadResult.fileKey,
      targetFolder: {
        id: targetFolder.id,
        categoryCode: targetFolder.categoryCode,
        folderName: targetFolder.folderName,
      },
      namingAudit: parseResult,
    };
  });

  // Get File Download URL (Protected by project & per-folder download permissions)
  app.get('/api/vault/document/:id/download', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const document = await prisma.projectDocument.findUnique({
      where: { id: request.params.id },
      include: {
        project: true,
        folder: {
          include: { permissions: true },
        },
      },
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required to download documents.' });
    }

    if (!userHasProjectAccess(user, document.projectId)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    const isClient = user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER';
    if (isClient && document.project.status === 'INACTIVE') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
    }

    if (isClient) {
      const folderPerm = document.folder.permissions.find((p) => p.role === user.role);
      if (document.project.allowClientDownloads === 'VIEW_ONLY' || folderPerm?.accessLevel === 'VIEW_ONLY') {
        return reply.status(403).send({ error: 'Download permission denied for this document (View Only mode enforced)' });
      }
    }

    const bucket = process.env.S3_BUCKET_NAME || 'afdesign-vault-prod';
    const downloadUrl = `https://${bucket}.r2.cloudflarestorage.com/${document.originalKey}`;

    return {
      documentId: document.id,
      fileName: document.fileName,
      downloadUrl,
      previewUrl: document.previewKey ? `https://${bucket}.r2.cloudflarestorage.com/${document.previewKey}` : null,
    };
  });

  // Rename Document (Admin & Staff on Active Projects only)
  app.patch('/api/vault/document/:id/rename', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Only Admins and Staff can rename vault documents.' });
    }

    const schema = z.object({
      fileName: z.string().min(1, 'New file name is required').max(255),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid filename' });
    }

    const nextName = parsed.data.fileName.trim();
    if (!isAllowedFileType(nextName)) {
      return reply.status(400).send({
        error: 'File type not allowed. Allowed types: .pdf, .dwg, .dxf, .dgn, .jpg, .jpeg, .png, .webp',
      });
    }

    const document = await prisma.projectDocument.findUnique({
      where: { id: request.params.id },
      include: { project: true, folder: true },
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found.' });
    }

    if (!userHasProjectAccess(user, document.projectId)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    if (document.project.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Document mutations are only allowed on active projects.' });
    }

    const updated = await prisma.projectDocument.update({
      where: { id: document.id },
      data: {
        fileName: nextName,
        isDwg: nextName.toLowerCase().endsWith('.dwg'),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'RENAME_DOCUMENT',
      entityType: 'PROJECT_DOCUMENT',
      entityId: updated.id,
      oldData: { fileName: document.fileName },
      newData: { fileName: updated.fileName },
    });

    return {
      success: true,
      document: {
        id: updated.id,
        fileName: updated.fileName,
        folderId: updated.folderId,
        isDwg: updated.isDwg,
      },
    };
  });

  // Delete Document (Admin & Staff on Active Projects only)
  app.delete('/api/vault/document/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Only Admins and Staff can delete vault documents.' });
    }

    const document = await prisma.projectDocument.findUnique({
      where: { id: request.params.id },
      include: { project: true },
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found.' });
    }

    if (!userHasProjectAccess(user, document.projectId)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    if (document.project.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Document mutations are only allowed on active projects.' });
    }

    await prisma.projectDocument.delete({ where: { id: document.id } });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'DELETE_DOCUMENT',
      entityType: 'PROJECT_DOCUMENT',
      entityId: document.id,
      oldData: {
        projectId: document.projectId,
        folderId: document.folderId,
        fileName: document.fileName,
      },
    });

    return {
      success: true,
      message: 'Document deleted successfully.',
    };
  });
}
