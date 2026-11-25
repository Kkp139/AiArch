import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { PaymentMode, PaymentStatus, UserRole } from '@prisma/client';
import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';
import { notificationQueueService, sanitizePushText } from '../../lib/queue.service';

async function notifyPaymentStakeholders(params: {
  projectId: string;
  projectCode: string;
  showPricingClientLeader: boolean;
  showPricingClientViewer: boolean;
  title: string;
  rawMessage: string;
}) {
  try {
    const safeMessage = sanitizePushText(params.rawMessage, params.projectCode);
    const allowedClientRoles: UserRole[] = [];
    if (params.showPricingClientLeader) allowedClientRoles.push(UserRole.CLIENT_LEADER);
    if (params.showPricingClientViewer) allowedClientRoles.push(UserRole.CLIENT_VIEWER);

    if (allowedClientRoles.length === 0) return;

    const assignments = await prisma.projectAssignment.findMany({
      where: {
        projectId: params.projectId,
        user: { role: { in: allowedClientRoles }, status: 'ACTIVE' },
      },
      select: { userId: true },
    });

    const recipientIds = Array.from(new Set(assignments.map((a) => a.userId)));
    if (recipientIds.length === 0) return;

    await prisma.notification.createMany({
      data: recipientIds.map((recipientId) => ({
        recipientId,
        projectId: params.projectId,
        category: 'PAYMENT',
        title: params.title,
        message: safeMessage,
        deepLink: '/payments',
      })),
    });

    await notificationQueueService.enqueueBatchPushNotifications(
      recipientIds.map((recipientId) => ({
        recipientId,
        title: params.title,
        rawBody: safeMessage,
        projectCode: params.projectCode,
      }))
    );
  } catch (err) {
    console.error('[Payments] Notification dispatch failed:', err);
  }
}

export async function paymentRoutes(app: FastifyInstance) {
  // Get Payments for Project (Strict Staff Block + Client Project Toggle Check)
  app.get('/api/payments/project/:projectIdentifier', async (
    request: FastifyRequest<{ Params: { projectIdentifier: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to view payment records.' });
    }

    if (user.role === 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Staff accounts cannot access payment records or pricing metadata.' });
    }

    const { projectIdentifier } = request.params;
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: projectIdentifier }, { projectCode: projectIdentifier }],
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    if (!userHasProjectAccess(user, project.id)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    if (user.role !== 'ADMIN' && project.status === 'INACTIVE') {
      return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
    }

    if (user.role === 'CLIENT_LEADER' && !project.showPricingClientLeader) {
      return reply.status(403).send({ error: 'Pricing visibility is disabled for Client Leaders on this project.' });
    }
    if (user.role === 'CLIENT_VIEWER' && !project.showPricingClientViewer) {
      return reply.status(403).send({ error: 'Pricing visibility is disabled for Client Viewers on this project.' });
    }

    const payments = await prisma.payment.findMany({
      where: { projectId: project.id },
      include: {
        project: {
          select: { id: true, projectCode: true, name: true },
        },
        recorder: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      projectCode: p.project?.projectCode || project.projectCode,
      projectName: p.project?.name || project.name,
      milestoneTitle: p.bankName || p.referenceNumber || `Milestone Release — ${p.project?.projectCode || project.projectCode}`,
      amount: Number(p.amount),
      paymentMode: p.paymentMode,
      referenceNumber: p.referenceNumber,
      bankName: p.bankName,
      status: p.status,
      discrepancyNote: p.discrepancyNote,
      recordedBy: p.recorder.fullName,
      createdAt: p.createdAt.toISOString().split('T')[0],
    }));
  });

  // Get All Payments (Admin overview across all projects, or Client for visible assigned projects)
  app.get('/api/payments', async (
    request: FastifyRequest<{ Querystring: { projectCode?: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to view payment records.' });
    }

    if (user.role === 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Staff accounts cannot access payment records.' });
    }

    const { projectCode } = request.query;
    const where: any = {};

    if (projectCode && projectCode !== 'ALL') {
      const project = await prisma.project.findFirst({
        where: { OR: [{ id: projectCode }, { projectCode }] },
      });
      if (!project) {
        return reply.status(404).send({ error: 'Project not found.' });
      }
      if (!userHasProjectAccess(user, project.id)) {
        return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
      }
      if (user.role === 'CLIENT_LEADER' && !project.showPricingClientLeader) {
        return reply.status(403).send({ error: 'Pricing visibility is disabled for Client Leaders on this project.' });
      }
      if (user.role === 'CLIENT_VIEWER' && !project.showPricingClientViewer) {
        return reply.status(403).send({ error: 'Pricing visibility is disabled for Client Viewers on this project.' });
      }
      where.projectId = project.id;
    } else if (user.role !== 'ADMIN') {
      const visibleProjectIds = (user.assignedProjects || [])
        .filter((ap) =>
          user.role === 'CLIENT_LEADER' ? ap.project.showPricingClientLeader : ap.project.showPricingClientViewer
        )
        .map((ap) => ap.projectId);
      where.projectId = { in: visibleProjectIds };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        project: {
          select: { id: true, projectCode: true, name: true, status: true },
        },
        recorder: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = user.role === 'ADMIN'
      ? payments
      : payments.filter((p) => p.project?.status === 'ACTIVE');

    return filtered.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      projectCode: p.project?.projectCode || 'GENERAL',
      projectName: p.project?.name || 'Studio Project',
      milestoneTitle: p.bankName || p.referenceNumber || `Milestone Release — ${p.project?.projectCode || 'General'}`,
      amount: Number(p.amount),
      paymentMode: p.paymentMode,
      referenceNumber: p.referenceNumber,
      bankName: p.bankName,
      status: p.status,
      discrepancyNote: p.discrepancyNote,
      recordedBy: p.recorder.fullName,
      createdAt: p.createdAt.toISOString().split('T')[0],
    }));
  });

  // Create Payment Entry (Admin Only)
  app.post('/api/payments', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can record payment transactions.' });
    }

    const schema = z.object({
      projectCode: z.string().min(1, 'Project code is required'),
      milestoneTitle: z.string().optional(),
      amount: z.number().positive('Payment amount must be greater than zero'),
      paymentMode: z.enum(['CHEQUE', 'UPI', 'NEFT_RTGS', 'CASH']),
      referenceNumber: z.string().optional(),
      bankName: z.string().optional(),
      status: z.enum(['PENDING_CLEARANCE', 'CONFIRMED']).optional().default('PENDING_CLEARANCE'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid payment parameters' });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: body.data.projectCode }, { projectCode: body.data.projectCode }],
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found' });
    }

    const title = body.data.milestoneTitle?.trim();
    const bankDesc = body.data.bankName?.trim();
    const storedBankName = title
      ? (bankDesc ? `${title} • ${bankDesc}` : title)
      : bankDesc;

    const payment = await prisma.payment.create({
      data: {
        projectId: project.id,
        amount: body.data.amount,
        paymentMode: body.data.paymentMode as PaymentMode,
        referenceNumber: body.data.referenceNumber,
        bankName: storedBankName,
        status: body.data.status as PaymentStatus,
        recordedBy: user.id,
      },
      include: {
        project: {
          select: { id: true, projectCode: true, name: true },
        },
        recorder: true,
      },
    });

    if (payment.status === 'CONFIRMED') {
      await prisma.project.update({
        where: { id: project.id },
        data: {
          advancePaymentReceived: {
            increment: body.data.amount,
          },
        },
      });
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'RECORD_PAYMENT',
      entityType: 'PAYMENT',
      entityId: payment.id,
      newData: {
        projectCode: project.projectCode,
        amount: Number(payment.amount),
        paymentMode: payment.paymentMode,
        status: payment.status,
      },
    });

    await notifyPaymentStakeholders({
      projectId: project.id,
      projectCode: project.projectCode,
      showPricingClientLeader: project.showPricingClientLeader,
      showPricingClientViewer: project.showPricingClientViewer,
      title: `Payment Update — ${project.projectCode}`,
      rawMessage: `Payment of Rs ${Number(payment.amount)} recorded via ${payment.paymentMode}`,
    });

    return {
      id: payment.id,
      projectId: payment.projectId,
      projectCode: payment.project?.projectCode || project.projectCode,
      projectName: payment.project?.name || project.name,
      milestoneTitle: title || storedBankName || `Milestone Payment (${project.projectCode})`,
      amount: Number(payment.amount),
      paymentMode: payment.paymentMode,
      referenceNumber: payment.referenceNumber,
      bankName: payment.bankName,
      status: payment.status,
      recordedBy: payment.recorder.fullName,
      createdAt: payment.createdAt.toISOString().split('T')[0],
    };
  });

  // Admin Payment Correction with Old/New Audit Diff + Privacy-Sanitized Notification
  app.patch('/api/payments/:id', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can modify payment records.' });
    }

    const schema = z.object({
      amount: z.number().positive('Payment amount must be greater than zero').optional(),
      paymentMode: z.enum(['CHEQUE', 'UPI', 'NEFT_RTGS', 'CASH']).optional(),
      referenceNumber: z.string().nullable().optional(),
      bankName: z.string().nullable().optional(),
      milestoneTitle: z.string().optional(),
      status: z.enum(['PENDING_CLEARANCE', 'CONFIRMED', 'REVISION_REQUESTED']).optional(),
      discrepancyNote: z.string().nullable().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid payment update payload' });
    }

    const existing = await prisma.payment.findUnique({
      where: { id: request.params.id },
      include: { project: true, recorder: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Payment record not found.' });
    }

    const oldAmount = Number(existing.amount);
    const nextAmount = body.data.amount !== undefined ? body.data.amount : oldAmount;
    const nextStatus = (body.data.status ?? existing.status) as PaymentStatus;

    const title = body.data.milestoneTitle?.trim();
    const nextBankName = title
      ? (body.data.bankName ? `${title} • ${body.data.bankName.trim()}` : title)
      : body.data.bankName !== undefined
      ? body.data.bankName
      : existing.bankName;

    const oldConfirmedAmount = existing.status === 'CONFIRMED' ? oldAmount : 0;
    const newConfirmedAmount = nextStatus === 'CONFIRMED' ? nextAmount : 0;
    const advanceDelta = newConfirmedAmount - oldConfirmedAmount;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: existing.id },
        data: {
          amount: nextAmount,
          paymentMode: (body.data.paymentMode ?? existing.paymentMode) as PaymentMode,
          referenceNumber: body.data.referenceNumber !== undefined ? body.data.referenceNumber : existing.referenceNumber,
          bankName: nextBankName,
          status: nextStatus,
          discrepancyNote: body.data.discrepancyNote !== undefined ? body.data.discrepancyNote : existing.discrepancyNote,
        },
        include: {
          project: { select: { id: true, projectCode: true, name: true } },
          recorder: { select: { id: true, fullName: true } },
        },
      });

      if (advanceDelta !== 0) {
        await tx.project.update({
          where: { id: existing.projectId },
          data: {
            advancePaymentReceived: {
              increment: advanceDelta,
            },
          },
        });
      }

      return updatedPayment;
    });

    const oldData = {
      amount: oldAmount,
      paymentMode: existing.paymentMode,
      referenceNumber: existing.referenceNumber,
      bankName: existing.bankName,
      status: existing.status,
      discrepancyNote: existing.discrepancyNote,
    };

    const newData = {
      amount: Number(updated.amount),
      paymentMode: updated.paymentMode,
      referenceNumber: updated.referenceNumber,
      bankName: updated.bankName,
      status: updated.status,
      discrepancyNote: updated.discrepancyNote,
    };

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CORRECT_PAYMENT',
      entityType: 'PAYMENT',
      entityId: updated.id,
      oldData,
      newData,
    });

    await notifyPaymentStakeholders({
      projectId: existing.projectId,
      projectCode: existing.project.projectCode,
      showPricingClientLeader: existing.project.showPricingClientLeader,
      showPricingClientViewer: existing.project.showPricingClientViewer,
      title: `Payment Ledger Updated — ${existing.project.projectCode}`,
      rawMessage: `Payment Rs ${Number(updated.amount)} status ${updated.status}`,
    });

    return {
      success: true,
      payment: {
        id: updated.id,
        projectId: updated.projectId,
        projectCode: updated.project.projectCode,
        projectName: updated.project.name,
        milestoneTitle: updated.bankName || updated.referenceNumber || `Milestone Release — ${updated.project.projectCode}`,
        amount: Number(updated.amount),
        paymentMode: updated.paymentMode,
        referenceNumber: updated.referenceNumber,
        bankName: updated.bankName,
        status: updated.status,
        discrepancyNote: updated.discrepancyNote,
        recordedBy: updated.recorder.fullName,
        createdAt: updated.createdAt.toISOString().split('T')[0],
      },
      auditDiff: {
        oldData,
        newData,
      },
    };
  });

  // Client Submits Discrepancy Note (Sets status to REVISION_REQUESTED without altering payment amount)
  app.post('/api/payments/:id/discrepancy', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role === 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Staff accounts cannot access payment operations.' });
    }

    const schema = z.object({
      discrepancyNote: z.string().min(1, 'Discrepancy note is required'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Discrepancy note is required' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: request.params.id },
      include: { project: true },
    });
    if (!payment) {
      return reply.status(404).send({ error: 'Payment record not found' });
    }

    if (!userHasProjectAccess(user, payment.projectId)) {
      return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
    }

    const updated = await prisma.payment.update({
      where: { id: request.params.id },
      data: {
        status: PaymentStatus.REVISION_REQUESTED,
        discrepancyNote: body.data.discrepancyNote,
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REQUEST_PAYMENT_DISCREPANCY',
      entityType: 'PAYMENT',
      entityId: updated.id,
      oldData: { status: payment.status },
      newData: { status: updated.status, discrepancyNote: updated.discrepancyNote },
    });

    // Notify Admins with privacy-sanitized text
    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN, status: 'ACTIVE' },
        select: { id: true },
      });
      if (admins.length > 0) {
        const safeMsg = sanitizePushText(
          `Payment discrepancy reported for Project ${payment.project.projectCode}: ${body.data.discrepancyNote}`,
          payment.project.projectCode
        );
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            recipientId: a.id,
            projectId: payment.projectId,
            category: 'PAYMENT',
            title: `Payment Discrepancy Flagged — ${payment.project.projectCode}`,
            message: safeMsg,
            deepLink: '/payments',
          })),
        });
      }
    } catch (err) {
      console.error('[Payments] Failed to notify admins on discrepancy:', err);
    }

    return {
      success: true,
      paymentId: updated.id,
      status: updated.status,
      discrepancyNote: updated.discrepancyNote,
      message: 'Discrepancy request submitted for Admin review.',
    };
  });
}
