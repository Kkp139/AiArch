import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { PaymentMode, PaymentStatus } from '@prisma/client';
import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';

export async function paymentRoutes(app: FastifyInstance) {
  // Get Payments for Project (Strict Staff Block + Client Project Toggle Check)
  app.get('/api/payments/project/:projectIdentifier', async (request: FastifyRequest<{ Params: { projectIdentifier: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to view payment records.' });
    }

    // STRICT STAFF ISOLATION RULE: Staff role is unconditionally forbidden from payments
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

    // Client pricing permission check
    if (user.role === 'CLIENT_LEADER' && !project.showPricingClientLeader) {
      return reply.status(403).send({ error: 'Pricing visibility is disabled for Client Leaders on this project.' });
    }
    if (user.role === 'CLIENT_VIEWER' && !project.showPricingClientViewer) {
      return reply.status(403).send({ error: 'Pricing visibility is disabled for Client Viewers on this project.' });
    }

    const payments = await prisma.payment.findMany({
      where: { projectId: project.id },
      include: {
        recorder: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map(p => ({
      id: p.id,
      projectId: p.projectId,
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
      projectCode: z.string().min(1),
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

    const payment = await prisma.payment.create({
      data: {
        projectId: project.id,
        amount: body.data.amount,
        paymentMode: body.data.paymentMode as PaymentMode,
        referenceNumber: body.data.referenceNumber,
        bankName: body.data.bankName,
        status: body.data.status as PaymentStatus,
        recordedBy: user.id,
      },
      include: {
        recorder: true,
      },
    });

    // If confirmed, update project advance payment
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

    return {
      id: payment.id,
      amount: Number(payment.amount),
      paymentMode: payment.paymentMode,
      referenceNumber: payment.referenceNumber,
      bankName: payment.bankName,
      status: payment.status,
      recordedBy: payment.recorder.fullName,
      createdAt: payment.createdAt.toISOString().split('T')[0],
    };
  });

  // Client Submits Discrepancy Note (Sets status to REVISION_REQUESTED without altering payment amount)
  app.post('/api/payments/:id/discrepancy', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
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

    return {
      success: true,
      paymentId: updated.id,
      status: updated.status,
      discrepancyNote: updated.discrepancyNote,
      message: 'Discrepancy request submitted for Admin review.',
    };
  });
}
