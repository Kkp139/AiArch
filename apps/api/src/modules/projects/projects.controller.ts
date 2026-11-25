import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DownloadPermission, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { calculateProgress } from './progress.service';
import { validateProjectStatusTransition } from './projects.service';
import { recordAuditLog } from '../../lib/audit.service';

const STANDARD_FOLDERS = [
  // Phase 1: Concept Design (6)
  { categoryCode: '01_SITE_DRGS', folderName: '01 Site Drawings & Topographic Layout', phaseGroup: 'CONCEPT', displayOrder: 1 },
  { categoryCode: '02_ZONING_PLANNING', folderName: '02 Zoning & Space Planning', phaseGroup: 'CONCEPT', displayOrder: 2 },
  { categoryCode: '03_SPACE_OBJECT_DESIGN', folderName: '03 Space & Object Studies', phaseGroup: 'CONCEPT', displayOrder: 3 },
  { categoryCode: '04_COMPLETE_SET_DRGS', folderName: '04 Complete Architectural Schematic Package', phaseGroup: 'CONCEPT', displayOrder: 4 },
  { categoryCode: '05_MATERIAL_SELECTION', folderName: '05 Material Selection & Moodboards', phaseGroup: 'CONCEPT', displayOrder: 5 },
  { categoryCode: '06_3D_IMAGES', folderName: '06 3D Photorealistic CGI Renders', phaseGroup: 'CONCEPT', displayOrder: 6 },

  // Phase 2: Construction Design (9)
  { categoryCode: '07_CIVIL_DRGS', folderName: '07 Civil Footing & Column Layouts', phaseGroup: 'CONSTRUCTION', displayOrder: 7 },
  { categoryCode: '08_PLUMBING_DRGS', folderName: '08 Plumbing & Drainage Schematics', phaseGroup: 'CONSTRUCTION', displayOrder: 8 },
  { categoryCode: '09_FIRE_DRGS', folderName: '09 Fire Hydrant & Life Safety Plans', phaseGroup: 'CONSTRUCTION', displayOrder: 9 },
  { categoryCode: '10_HVAC_DRGS', folderName: '10 HVAC Chilled Water & Ducting', phaseGroup: 'CONSTRUCTION', displayOrder: 10 },
  { categoryCode: '11_FLOORING_DRGS', folderName: '11 Marble & Tile Flooring Layouts', phaseGroup: 'CONSTRUCTION', displayOrder: 11 },
  { categoryCode: '12_CEILING_DRGS', folderName: '12 Reflected Ceiling & Lighting Drops', phaseGroup: 'CONSTRUCTION', displayOrder: 12 },
  { categoryCode: '13_ELECTRICAL_DRGS', folderName: '13 Electrical SLD & Power Conduit Routes', phaseGroup: 'CONSTRUCTION', displayOrder: 13 },
  { categoryCode: '14_WALL_ELEVATION', folderName: '14 Internal & External Wall Elevations', phaseGroup: 'CONSTRUCTION', displayOrder: 14 },
  { categoryCode: '15_ELEMENT_DRGS', folderName: '15 Architectural Joinery & Element Details', phaseGroup: 'CONSTRUCTION', displayOrder: 15 },

  // Catch-all (1)
  { categoryCode: '16_OTHER', folderName: '03 Other / Miscellaneous Reference', phaseGroup: 'OTHER', displayOrder: 16 },
];

import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';

export async function projectRoutes(app: FastifyInstance) {
  // Get All Projects (with strict authentication and role-based access filtering)
  app.get('/api/projects', async (
    request: FastifyRequest<{ Querystring: { status?: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to view projects.' });
    }

    const requestedStatus = request.query?.status?.toUpperCase();
    const isClient = user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER';

    // Clients have zero access to Inactive projects
    if (isClient && requestedStatus === 'INACTIVE') {
      return [];
    }

    const where: any = {};
    if (user.role !== 'ADMIN') {
      const assignedIds = user.assignedProjects.map(ap => ap.projectId);
      where.id = { in: assignedIds };
    }

    if (isClient) {
      where.status = 'ACTIVE';
    } else if (user.role === 'STAFF') {
      if (requestedStatus === 'INACTIVE') {
        where.status = 'INACTIVE';
      } else if (requestedStatus === 'ALL') {
        // Staff retains read-only access to assigned inactive projects
      } else {
        where.status = 'ACTIVE';
      }
    } else {
      // ADMIN: filter when explicitly requested; otherwise return all projects for lifecycle management
      if (requestedStatus === 'ACTIVE' || requestedStatus === 'INACTIVE') {
        where.status = requestedStatus;
      }
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        folders: {
          include: {
            _count: {
              select: { documents: true },
            },
          },
        },
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = projects.map((p) => {
      // Calculate progress: count of folders that have at least 1 document / 16
      const populatedCount = p.folders.filter((f) => f._count.documents > 0).length;
      const progress = calculateProgress(populatedCount, 16);

      // Financial visibility permission:
      // ADMIN: always visible
      // STAFF: NEVER visible (Strict Staff Isolation)
      // CLIENT_LEADER: only if p.showPricingClientLeader === true
      // CLIENT_VIEWER: only if p.showPricingClientViewer === true
      const canSeePricing = user.role === 'ADMIN'
        ? true
        : user.role === 'STAFF'
        ? false
        : user.role === 'CLIENT_LEADER'
        ? p.showPricingClientLeader
        : p.showPricingClientViewer;

      return {
        id: p.id,
        projectCode: p.projectCode,
        name: p.name,
        category: p.category,
        siteLocation: p.siteLocation,
        status: p.status,
        totalAgreedFee: canSeePricing ? Number(p.totalAgreedFee) : 0,
        advancePaymentReceived: canSeePricing ? Number(p.advancePaymentReceived) : 0,
        allowClientDownloads: p.allowClientDownloads,
        showPricingClientLeader: p.showPricingClientLeader,
        showPricingClientViewer: p.showPricingClientViewer,
        allowClientMeetings: p.allowClientMeetings,
        documentCount: p._count.documents,
        folderCount: p.folders.length,
        completionPercentage: progress.percentage,
        populatedFolders: populatedCount,
      };
    });

    return enriched;
  });

  // Get Single Project by ID or Code (with all 16 folders & documents)
  app.get('/api/projects/:idOrCode', async (request: FastifyRequest<{ Params: { idOrCode: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to view this project.' });
    }

    const { idOrCode } = request.params;
    if (!userHasProjectAccess(user, idOrCode)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: idOrCode }, { projectCode: idOrCode }],
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
        assignments: {
          include: {
            user: {
              select: { id: true, fullName: true, role: true, mobile: true, username: true },
            },
          },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    if ((user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER') && project.status === 'INACTIVE') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
    }

    const populatedCount = project.folders.filter((f) => f.documents.length > 0).length;
    const progress = calculateProgress(populatedCount, 16);

    const canSeePricing = user.role === 'ADMIN'
      ? true
      : user.role === 'STAFF'
      ? false
      : user.role === 'CLIENT_LEADER'
      ? project.showPricingClientLeader
      : project.showPricingClientViewer;

    return {
      ...project,
      totalAgreedFee: canSeePricing ? Number(project.totalAgreedFee) : 0,
      advancePaymentReceived: canSeePricing ? Number(project.advancePaymentReceived) : 0,
      completionPercentage: progress.percentage,
      populatedFolders: populatedCount,
    };
  });

  // Create Project (Admin only - Automatically generates all 16 standard folders)
  app.post('/api/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can create projects.' });
    }

    const schema = z.object({
      projectCode: z.string().min(2).max(32),
      name: z.string().min(1),
      category: z.string().min(1),
      siteLocation: z.string().min(1),
      totalAgreedFee: z.number().optional().default(0),
      advancePaymentReceived: z.number().optional().default(0),
      allowClientMeetings: z.boolean().optional().default(true),
      showPricingClientLeader: z.boolean().optional().default(true),
      showPricingClientViewer: z.boolean().optional().default(false),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid project data' });
    }

    const existing = await prisma.project.findUnique({
      where: { projectCode: body.data.projectCode.toUpperCase() },
    });

    if (existing) {
      return reply.status(409).send({ error: `Project with code '${body.data.projectCode}' already exists.` });
    }

    const project = await prisma.project.create({
      data: {
        projectCode: body.data.projectCode.toUpperCase(),
        name: body.data.name,
        category: body.data.category,
        siteLocation: body.data.siteLocation,
        totalAgreedFee: body.data.totalAgreedFee,
        advancePaymentReceived: body.data.advancePaymentReceived,
        allowClientMeetings: body.data.allowClientMeetings,
        showPricingClientLeader: body.data.showPricingClientLeader,
        showPricingClientViewer: body.data.showPricingClientViewer,
        folders: {
          create: STANDARD_FOLDERS.map((f) => ({
            categoryCode: f.categoryCode,
            folderName: f.folderName,
            phaseGroup: f.phaseGroup,
            displayOrder: f.displayOrder,
            isCounted: true,
          })),
        },
      },
      include: {
        folders: true,
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CREATE_PROJECT',
      entityType: 'PROJECT',
      entityId: project.id,
      newData: { projectCode: project.projectCode, name: project.name },
    });

    return {
      success: true,
      project: {
        ...project,
        totalAgreedFee: Number(project.totalAgreedFee),
        advancePaymentReceived: Number(project.advancePaymentReceived),
        completionPercentage: 0,
      },
    };
  });

  // Get Progress
  app.get('/api/projects/:id/progress', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (!userHasProjectAccess(user, request.params.id)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    const folders = await prisma.projectFolder.findMany({
      where: { projectId: request.params.id },
      include: {
        _count: {
          select: { documents: true },
        },
      },
    });

    const populatedCount = folders.filter((f) => f._count.documents > 0).length;
    return calculateProgress(populatedCount, 16);
  });

  // Get Detailed 16-Category Progress Report (Admin, assigned Client Leader, assigned Client Viewer ONLY; Staff gets 403)
  app.get('/api/projects/:idOrCode/progress-report', async (
    request: FastifyRequest<{ Params: { idOrCode: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role === 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Progress Reports are restricted to Administrators and Clients.' });
    }

    const { idOrCode } = request.params;
    const project = await prisma.project.findFirst({
      where: { OR: [{ id: idOrCode }, { projectCode: idOrCode }] },
      include: {
        folders: {
          include: {
            documents: {
              select: { id: true, isApprovedDrawing: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    if (!userHasProjectAccess(user, project.id)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    if (project.status === 'INACTIVE' && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
    }

    const countedFolders = project.folders.filter((f) => f.isCounted);
    const populatedCategories = countedFolders.filter((f) => f.documents.length > 0).length;
    const pendingCategories = Math.max(0, 16 - populatedCategories);
    const overall = calculateProgress(populatedCategories, 16);

    const conceptFolders = countedFolders.filter((f) => f.phaseGroup.toUpperCase().startsWith('CONCEPT'));
    const constructionFolders = countedFolders.filter((f) => f.phaseGroup.toUpperCase().startsWith('CONSTRUCTION'));
    const otherFolders = countedFolders.filter((f) => f.phaseGroup.toUpperCase() === 'OTHER');

    const summarizePhase = (list: typeof countedFolders) => {
      const total = list.length;
      const populated = list.filter((f) => f.documents.length > 0).length;
      const prog = calculateProgress(populated, total);
      return {
        total,
        populated,
        pending: Math.max(0, total - populated),
        percentage: prog.percentage,
      };
    };

    let latestTimestamp = project.updatedAt.getTime();
    const categories = project.folders.map((f) => {
      const latestDoc = f.documents[0];
      if (latestDoc && latestDoc.createdAt.getTime() > latestTimestamp) {
        latestTimestamp = latestDoc.createdAt.getTime();
      }
      return {
        folderId: f.id,
        categoryCode: f.categoryCode,
        folderName: f.folderName,
        phaseGroup: f.phaseGroup,
        displayOrder: f.displayOrder,
        isPopulated: f.documents.length > 0,
        documentCount: f.documents.length,
        approvedCount: f.documents.filter((d) => d.isApprovedDrawing).length,
        lastUpdatedAt: latestDoc ? latestDoc.createdAt.toISOString() : null,
      };
    });

    return {
      projectId: project.id,
      projectCode: project.projectCode,
      projectName: project.name,
      completionPercentage: overall.percentage,
      populatedCategories,
      pendingCategories,
      totalCategories: 16,
      lastUpdatedAt: new Date(latestTimestamp).toISOString(),
      phaseBreakdown: {
        concept: summarizePhase(conceptFolders),
        construction: summarizePhase(constructionFolders),
        other: summarizePhase(otherFolders),
      },
      categories,
    };
  });

  // Get Per-Folder Download Permissions (Authenticated + Assigned)
  app.get('/api/projects/:id/folder-permissions', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const project = await prisma.project.findFirst({
      where: { OR: [{ id: request.params.id }, { projectCode: request.params.id }] },
      include: {
        folders: {
          include: { permissions: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    if (!userHasProjectAccess(user, project.id)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    if ((user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER') && project.status === 'INACTIVE') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
    }

    return {
      projectId: project.id,
      projectCode: project.projectCode,
      allowClientDownloads: project.allowClientDownloads,
      folders: project.folders.map((f) => ({
        folderId: f.id,
        categoryCode: f.categoryCode,
        folderName: f.folderName,
        phaseGroup: f.phaseGroup,
        displayOrder: f.displayOrder,
        permissions: f.permissions.map((perm) => ({
          id: perm.id,
          role: perm.role,
          accessLevel: perm.accessLevel,
        })),
      })),
    };
  });

  // Update Per-Folder Download Permissions (Admin Only)
  app.put('/api/projects/:id/folder-permissions', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can update folder permissions.' });
    }

    const entrySchema = z.object({
      folderId: z.string().min(1),
      role: z.enum(['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER']),
      accessLevel: z.enum(['VIEW_ONLY', 'VIEW_AND_DOWNLOAD']),
    });

    const schema = z.union([
      z.object({ permissions: z.array(entrySchema).min(1) }),
      entrySchema,
    ]);

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid folder permissions payload' });
    }

    const project = await prisma.project.findFirst({
      where: { OR: [{ id: request.params.id }, { projectCode: request.params.id }] },
      include: { folders: true, folderPermissions: true },
    });
    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    const entries = 'permissions' in parsed.data ? parsed.data.permissions : [parsed.data];
    const validFolderIds = new Set(project.folders.map((f) => f.id));
    for (const entry of entries) {
      if (!validFolderIds.has(entry.folderId)) {
        return reply.status(400).send({ error: `Folder '${entry.folderId}' does not belong to this project.` });
      }
    }

    const upserted = await prisma.$transaction(
      entries.map((entry) =>
        prisma.projectFolderPermission.upsert({
          where: {
            projectId_folderId_role: {
              projectId: project.id,
              folderId: entry.folderId,
              role: entry.role as UserRole,
            },
          },
          create: {
            projectId: project.id,
            folderId: entry.folderId,
            role: entry.role as UserRole,
            accessLevel: entry.accessLevel as DownloadPermission,
          },
          update: {
            accessLevel: entry.accessLevel as DownloadPermission,
          },
        })
      )
    );

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_FOLDER_PERMISSIONS',
      entityType: 'PROJECT',
      entityId: project.id,
      oldData: project.folderPermissions.map((p) => ({
        folderId: p.folderId,
        role: p.role,
        accessLevel: p.accessLevel,
      })),
      newData: upserted.map((p) => ({
        folderId: p.folderId,
        role: p.role,
        accessLevel: p.accessLevel,
      })),
    });

    return {
      success: true,
      permissions: upserted,
    };
  });

  // Toggle Active / Inactive Status (Admin only - No Project Deletion Allowed)
  app.patch('/api/projects/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can modify project status.' });
    }

    const schema = z.object({
      status: z.enum(['ACTIVE', 'INACTIVE']),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Status must be ACTIVE or INACTIVE' });
    }

    const currentProject = await prisma.project.findUnique({
      where: { id: request.params.id },
    });

    if (!currentProject) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    if (!validateProjectStatusTransition(currentProject.status as any, body.data.status)) {
      return reply.status(400).send({ error: 'Invalid project status transition' });
    }

    const updated = await prisma.project.update({
      where: { id: request.params.id },
      data: { status: body.data.status },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_PROJECT_STATUS',
      entityType: 'PROJECT',
      entityId: updated.id,
      oldData: { status: currentProject.status },
      newData: { status: updated.status },
    });

    return {
      success: true,
      projectId: updated.id,
      status: updated.status,
    };
  });

  // Update Project Settings (Admin only: Pricing visibility, Meetings toggle, Client downloads)
  app.patch('/api/projects/:id/settings', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can update project settings.' });
    }
    const schema = z.object({
      showPricingClientLeader: z.boolean().optional(),
      showPricingClientViewer: z.boolean().optional(),
      allowClientMeetings: z.boolean().optional(),
      allowClientDownloads: z.enum(['VIEW_ONLY', 'VIEW_AND_DOWNLOAD']).optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid settings payload' });
    }

    const currentProject = await prisma.project.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        projectCode: true,
        showPricingClientLeader: true,
        showPricingClientViewer: true,
        allowClientMeetings: true,
        allowClientDownloads: true,
      },
    });

    if (!currentProject) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const updated = await prisma.project.update({
      where: { id: request.params.id },
      data: body.data,
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_PROJECT_SETTINGS',
      entityType: 'PROJECT',
      entityId: updated.id,
      oldData: currentProject,
      newData: {
        showPricingClientLeader: updated.showPricingClientLeader,
        showPricingClientViewer: updated.showPricingClientViewer,
        allowClientMeetings: updated.allowClientMeetings,
        allowClientDownloads: updated.allowClientDownloads,
      },
    });

    return {
      success: true,
      project: updated,
    };
  });
}
