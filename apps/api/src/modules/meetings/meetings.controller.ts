import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { meetingEngine, VALID_SLOTS, TimeSlot, MeetingType } from './meetings.service';

export async function meetingRoutes(app: FastifyInstance) {
  // Request a Meeting Slot (Client Leader or Admin)
  app.post('/api/meetings/request', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user || { id: 'client-1', role: 'CLIENT_LEADER' };
    if (user.role !== 'ADMIN' && user.role !== 'CLIENT_LEADER') {
      return reply.status(403).send({ error: 'Only Client Leaders and Admins can book meetings' });
    }

    const schema = z.object({
      bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      slot: z.enum(['SLOT_12_00_13_30', 'SLOT_16_00_17_30', 'SLOT_18_00_19_30']),
      type: z.enum(['OFFICE_MEETING', 'SITE_VISIT']),
      notes: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid meeting parameters' });
    }

    const result = await meetingEngine.bookSlot({
      bookingDate: body.data.bookingDate,
      slot: body.data.slot as TimeSlot,
      type: body.data.type as MeetingType,
      requestedBy: user.id,
      notes: body.data.notes,
    });

    if (!result.success) {
      return reply.status(409).send({ error: result.error });
    }

    return result.meeting;
  });

  // Approve Meeting Slot (Admin only)
  app.post('/api/meetings/:id/approve', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = (request as any).user || { id: 'admin-1', role: 'ADMIN' };
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Only Admins can approve meetings' });
    }

    const approved = meetingEngine.approveMeeting(request.params.id, user.id);
    if (!approved) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    return approved;
  });
}
