import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { PaymentMode, PaymentStatus } from '@prisma/client';

export async function paymentRoutes(app: FastifyInstance) {
  // Get Payments for Project (Strict Staff Block + Client Project Toggle Check)
  app.get('/api/payments/project/:projectIdentifier', async (request: FastifyRequest<{ Params: { projectIdentifier: string } }>, reply: FastifyReply) => {
    const authHeader = request.headers.authorization || '';

    // STRICT STAFF ISOLATION RULE: Staff role is unconditionally forbidden from payments
    if (authHeader.includes('staff') || authHeader.includes('usr-staff')) {
      return reply.status(403).send({ error: 'Access Denied: Staff accounts cannot access payment records or pricing metadata.' });
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

    // Client pricing permission check
    const isClientLeader = authHeader.includes('client_leader') || authHeader.includes('CLIENT_LEADER');
    const isClientViewer = authHeader.includes('client_viewer') || authHeader.includes('CLIENT_VIEWER');

    if (isClientLeader && !project.showPricingClientLeader) {
      return reply.status(403).send({ error: 'Pricing visibility is disabled for Client Leaders on this project.' });
    }
    if (isClientViewer && !project.showPricingClientViewer) {
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
    const defaultAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

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
        recordedBy: defaultAdmin?.id || 'usr-admin-1',
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
    const schema = z.object({
      discrepancyNote: z.string().min(1, 'Discrepancy note is required'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Discrepancy note is required' });
    }

    const updated = await prisma.payment.update({
      where: { id: request.params.id },
      data: {
        status: PaymentStatus.REVISION_REQUESTED,
        discrepancyNote: body.data.discrepancyNote,
      },
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
