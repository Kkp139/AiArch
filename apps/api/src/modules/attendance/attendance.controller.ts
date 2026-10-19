import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  validateClockIn,
  validateClockOutWithWorkUpdatesGate,
  getScheduledSlotsForSession,
} from './attendance.service';
import { workUpdatesService } from './work-updates.service';

export async function attendanceRoutes(app: FastifyInstance) {
  // Staff Clock-In with mandatory GPS
  app.post('/api/attendance/clock-in', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user || { id: 'staff-1', role: 'STAFF' };
    if (user.role !== 'STAFF') {
      return reply.status(403).send({ error: 'Only Staff members punch attendance' });
    }

    const schema = z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid GPS coordinates (lat, lng) are mandatory' });
    }

    const check = validateClockIn(false, body.data.lat, body.data.lng);
    if (!check.allowed) {
      return reply.status(400).send({ error: check.error });
    }

    return {
      success: true,
      attendanceId: 'att-session-123',
      clockInAt: new Date().toISOString(),
      lat: body.data.lat,
      lng: body.data.lng,
      message: 'Clock-In recorded successfully with GPS location.',
    };
  });

  // Submit Daily Work Update
  app.post('/api/attendance/daily-update', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user || { id: 'staff-1', role: 'STAFF' };

    const schema = z.object({
      projectId: z.string().min(1),
      attendanceId: z.string().min(1),
      workSummary: z.string().min(1),
      scheduledSlot: z.string().min(1),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid update parameters' });
    }

    const result = workUpdatesService.submitUpdate({
      userId: user.id,
      ...body.data,
    });

    return result;
  });

  // Staff Clock-Out with Work Updates Gate
  app.post('/api/attendance/clock-out', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user || { id: 'staff-1', role: 'STAFF' };

    const schema = z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional(),
      attendanceId: z.string().optional().default('att-session-123'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid GPS coordinates (lat, lng) are mandatory' });
    }

    const submittedSlots = workUpdatesService.getSubmittedSlotsForSession(body.data.attendanceId);
    const mockScheduledSlots = ['Slot 13:00', 'Slot 17:30'];

    const gate = validateClockOutWithWorkUpdatesGate({
      scheduledSlots: mockScheduledSlots,
      submittedSlots,
      lat: body.data.lat,
      lng: body.data.lng,
    });

    if (!gate.allowed) {
      return reply.status(gate.statusCode || 422).send({
        error: gate.error,
        pendingSlots: gate.pendingSlots,
      });
    }

    return {
      success: true,
      clockOutAt: new Date().toISOString(),
      message: 'Clock-Out completed successfully. All scheduled work updates verified.',
    };
  });
}
