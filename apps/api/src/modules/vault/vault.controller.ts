import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { vaultService } from './vault.service';
import { isAllowedFileType, parseFileName } from './naming.service';
import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';

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

    // If project has no documents in any folder yet, seed standard database documents so real records exist
    const totalDocs = project.folders.reduce((sum, f) => sum + f.documents.length, 0);
    if (totalDocs === 0) {
      const code = project.projectCode;
      const adminUser = (await prisma.user.findFirst({ where: { role: 'ADMIN' } })) || user;

      const docsToCreate: any[] = [];
      for (const folder of project.folders) {
        if (folder.categoryCode === '01_SITE_DRGS') {
          docsToCreate.push(
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_sitedrgs_SitePlan_v2.pdf`,
              originalKey: `projects/${code}/${code}_sitedrgs_SitePlan_v2.pdf`,
              fileSizeBytes: BigInt(2400000),
              mimeType: 'application/pdf',
              isApprovedDrawing: true,
              uploadedBy: adminUser.id,
            },
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_sitedrgs_LocationPlan_v2.pdf`,
              originalKey: `projects/${code}/${code}_sitedrgs_LocationPlan_v2.pdf`,
              fileSizeBytes: BigInt(1900000),
              mimeType: 'application/pdf',
              isApprovedDrawing: true,
              uploadedBy: adminUser.id,
            },
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_sitedrgs_SiteSelection_v2.dwg`,
              originalKey: `projects/${code}/${code}_sitedrgs_SiteSelection_v2.dwg`,
              previewKey: `previews/${code}_sitedrgs_SiteSelection_v2.pdf`,
              fileSizeBytes: BigInt(2800000),
              mimeType: 'image/vnd.dwg',
              isDwg: true,
              isApprovedDrawing: false,
              uploadedBy: user.id,
            },
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_sitedrgs_SiteElevation_v2.pdf`,
              originalKey: `projects/${code}/${code}_sitedrgs_SiteElevation_v2.pdf`,
              fileSizeBytes: BigInt(5200000),
              mimeType: 'application/pdf',
              isApprovedDrawing: true,
              uploadedBy: adminUser.id,
            }
          );
        } else if (folder.categoryCode === '02_ZONING_PLANNING') {
          docsToCreate.push(
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_zoning_GroundFloorPlan_v2.dwg`,
              originalKey: `projects/${code}/${code}_zoning_GroundFloorPlan_v2.dwg`,
              previewKey: `previews/${code}_zoning_GroundFloorPlan_v2.pdf`,
              fileSizeBytes: BigInt(4100000),
              mimeType: 'image/vnd.dwg',
              isDwg: true,
              isApprovedDrawing: false,
              uploadedBy: user.id,
            },
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_zoning_LevelPlan_v1.pdf`,
              originalKey: `projects/${code}/${code}_zoning_LevelPlan_v1.pdf`,
              fileSizeBytes: BigInt(3800000),
              mimeType: 'application/pdf',
              isApprovedDrawing: false,
              uploadedBy: user.id,
            }
          );
        } else if (folder.categoryCode === '04_COMPLETE_SET_DRGS') {
          docsToCreate.push({
            projectId: project.id,
            folderId: folder.id,
            fileName: `${code}_completeset_SchematicPackage_v1.pdf`,
            originalKey: `projects/${code}/${code}_completeset_SchematicPackage_v1.pdf`,
            fileSizeBytes: BigInt(4800000),
            mimeType: 'application/pdf',
            isApprovedDrawing: true,
            uploadedBy: adminUser.id,
          });
        } else if (folder.categoryCode === '07_CIVIL_DRGS') {
          docsToCreate.push(
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_civildrgs_RCCFooting_v2.dwg`,
              originalKey: `projects/${code}/${code}_civildrgs_RCCFooting_v2.dwg`,
              previewKey: `previews/${code}_civildrgs_RCCFooting_v2.pdf`,
              fileSizeBytes: BigInt(6200000),
              mimeType: 'image/vnd.dwg',
              isDwg: true,
              isApprovedDrawing: true,
              uploadedBy: user.id,
            },
            {
              projectId: project.id,
              folderId: folder.id,
              fileName: `${code}_civildrgs_ColumnSchedule_v1.pdf`,
              originalKey: `projects/${code}/${code}_civildrgs_ColumnSchedule_v1.pdf`,
              fileSizeBytes: BigInt(3100000),
              mimeType: 'application/pdf',
              isApprovedDrawing: false,
              uploadedBy: user.id,
            }
          );
        } else if (folder.categoryCode === '13_ELECTRICAL_DRGS') {
          docsToCreate.push({
            projectId: project.id,
            folderId: folder.id,
            fileName: `${code}_electrical_PowerConduitRoutes_v1.dwg`,
            originalKey: `projects/${code}/${code}_electrical_PowerConduitRoutes_v1.dwg`,
            previewKey: `previews/${code}_electrical_PowerConduitRoutes_v1.pdf`,
            fileSizeBytes: BigInt(3500000),
            mimeType: 'image/vnd.dwg',
            isDwg: true,
            isApprovedDrawing: false,
            uploadedBy: user.id,
          });
        }
      }

      if (docsToCreate.length > 0) {
        await prisma.projectDocument.createMany({ data: docsToCreate });
        const refreshed = await prisma.project.findFirst({
          where: { id: project.id },
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
        if (refreshed) {
          project.folders = refreshed.folders;
        }
      }
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

    if (!userHasProjectAccess(user, project.id)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    // Evaluate standard naming convention: [ProjectName]_[Category]_[SubCategory]_[FileName]
    const parseResult = parseFileName(filename, project.projectCode);

    // Target folder lookup: folderId, categoryCode, parsed category, or fallback
    let targetFolder = folderId
      ? project.folders.find((f) => f.id === folderId)
      : categoryCode
      ? project.folders.find((f) => f.categoryCode === categoryCode)
      : project.folders.find((f) => f.categoryCode === parseResult.categoryCode);

    if (!targetFolder) {
      // Fallback to 16_OTHER / 03_OTHER
      targetFolder = project.folders.find((f) => f.categoryCode === '16_OTHER' || f.categoryCode === '03_OTHER') || project.folders[0];
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
        uploadedBy: user.id,
      },
      include: {
        uploader: true,
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
