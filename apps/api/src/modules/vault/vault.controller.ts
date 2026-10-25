import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { vaultService } from './vault.service';
import { isAllowedFileType, parseFileName } from './naming.service';

export async function vaultRoutes(app: FastifyInstance) {
  // Get all documents for a project grouped by folder
  app.get('/api/vault/projects/:projectCode/documents', async (request: FastifyRequest<{ Params: { projectCode: string } }>, reply: FastifyReply) => {
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
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    return {
      projectCode: project.projectCode,
      allowClientDownloads: project.allowClientDownloads,
      folders: project.folders.map(f => ({
        id: f.id,
        categoryCode: f.categoryCode,
        folderName: f.folderName,
        phaseGroup: f.phaseGroup,
        fileCount: f.documents.length,
        documents: f.documents.map(d => ({
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
      })),
    };
  });

  // Request Presigned Upload & Evaluate Naming Convention
  app.post('/api/vault/presigned-upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      projectCode: z.string().min(1),
      filename: z.string().min(1),
      fileSizeBytes: z.number().optional().default(1024),
      uploaderId: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid projectCode and filename required' });
    }

    const { projectCode, filename, fileSizeBytes, uploaderId } = body.data;

    if (!isAllowedFileType(filename)) {
      return reply.status(400).send({
        error: `File type not allowed. Allowed types: .pdf, .dwg, .dxf, .dgn, .jpg, .jpeg, .png, .webp`,
      });
    }

    // Find Project in database
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

    // Evaluate standard naming convention: [ProjectName]_[Category]_[SubCategory]_[FileName]
    const parseResult = parseFileName(filename, project.projectCode);

    // Target folder lookup
    let targetFolder = project.folders.find(f => f.categoryCode === parseResult.categoryCode);
    if (!targetFolder) {
      // Fallback to 16_OTHER / 03_OTHER
      targetFolder = project.folders.find(f => f.categoryCode === '16_OTHER' || f.categoryCode === '03_OTHER') || project.folders[0];
    }

    // Generate R2 storage key and mock presigned upload URL
    const uploadResult = await vaultService.prepareUpload(project.projectCode, filename);

    const isDwg = filename.toLowerCase().endsWith('.dwg');

    // Create document record in database
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
        uploadedBy: uploaderId,
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

  // Get File Download URL (Protected by folder & project download permissions)
  app.get('/api/vault/document/:id/download', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const document = await prisma.projectDocument.findUnique({
      where: { id: request.params.id },
      include: {
        project: true,
        folder: true,
      },
    });

    if (!document) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    // Check project master download switch
    if (document.project.allowClientDownloads === 'VIEW_ONLY') {
      const authHeader = request.headers.authorization || '';
      // Admin and Staff can always download; clients cannot
      const isClient = authHeader.includes('client');
      if (isClient) {
        return reply.status(403).send({ error: 'Download permission denied for this document (View Only mode enforced)' });
      }
    }

    const downloadUrl = `https://${process.env.S3_BUCKET_NAME || 'afdesign-vault-prod'}.r2.cloudflarestorage.com/${document.originalKey}`;

    return {
      documentId: document.id,
      fileName: document.fileName,
      downloadUrl,
      previewUrl: document.previewKey ? `https://${process.env.S3_BUCKET_NAME || 'afdesign-vault-prod'}.r2.cloudflarestorage.com/${document.previewKey}` : null,
    };
  });
}
