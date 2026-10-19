import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { canRoleViewPayments, createPaymentEntry, submitDiscrepancyRequest, correctPaymentEntry, PaymentMode } from './payments.service';

export async function paymentRoutes(app: FastifyInstance) {
  // Get Payments for Project (Strict Staff Block + Client Toggle Check)
  app.get('/api/payments/project/:projectId', async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
    const user = (request as any).user || { role: 'STAFF' };

    // Staff is strictly blocked from the entire payments module
    if (user.role === 'STAFF') {
      return reply.status(403).send({ error: 'Access Denied: Staff accounts cannot access payment records or pricing metadata' });
    }

    const mockProjectPricingEnabled = false;
    if (!canRoleViewPayments(user.role, mockProjectPricingEnabled)) {
      return reply.status(403).send({ error: 'Pricing visibility is disabled for this project' });
    }

    return [];
  });

  // Create Payment Entry (Admin Only)
  app.post('/api/payments', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user || { id: 'admin-1', role: 'ADMIN' };
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Only Admins can record payment ledger entries' });
    }

    const schema = z.object({
      projectId: z.string().min(1),
      amount: z.number().positive(),
      paymentMode: z.enum(['CHEQUE', 'UPI', 'NEFT_RTGS', 'CASH']),
      referenceNumber: z.string().optional(),
      bankName: z.string().optional(),
      receiptKey: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid payment parameters' });
    }

    const payment = createPaymentEntry({
      ...body.data,
      paymentMode: body.data.paymentMode as PaymentMode,
      recordedBy: user.id,
    });

    return payment;
  });

  // Client Submits Discrepancy Note
  app.post('/api/payments/:id/discrepancy', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = (request as any).user || { role: 'CLIENT_LEADER' };
    if (user.role === 'STAFF') {
      return reply.status(403).send({ error: 'Staff cannot access payment features' });
    }

    const schema = z.object({
      discrepancyNote: z.string().min(1),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Discrepancy note is required' });
    }

    return {
      success: true,
      message: 'Discrepancy request submitted for Admin review.',
    };
  });
}
