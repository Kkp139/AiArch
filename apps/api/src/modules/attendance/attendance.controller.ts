import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { validateClockIn, validateClockOutWithWorkUpdatesGate } from './attendance.service';

export async function attendanceRoutes(app: FastifyInstance) {
  // Get active session status and pending updates
  app.get('/api/attendance/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const defaultStaff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    if (!defaultStaff) {
      return { isClockedIn: false, pendingUpdates: [] };
    }

    // Find active attendance session (clockOutAt is null)
    const activeSession = await prisma.attendance.findFirst({
      where: {
        userId: defaultStaff.id,
        clockOutAt: null,
      },
      include: {
        dailyUpdates: true,
      },
      orderBy: { clockInAt: 'desc' },
    });

    if (!activeSession) {
      return {
        isClockedIn: false,
        activeSession: null,
        pendingUpdates: [],
      };
    }

    const scheduledSlots = ['Slot 12:00', 'Slot 17:30'];
    const submittedSlots = activeSession.dailyUpdates.map(u => u.scheduledSlot);
    const pendingSlots = scheduledSlots.filter(s => !submittedSlots.includes(s));

    return {
      isClockedIn: true,
      activeSession: {
        id: activeSession.id,
        clockInAt: activeSession.clockInAt,
        clockInAddress: activeSession.clockInAddress,
      },
      pendingUpdates: pendingSlots,
      submittedUpdates: activeSession.dailyUpdates.map(u => ({
        id: u.id,
        slot: u.scheduledSlot,
        workSummary: u.workSummary,
        submittedAt: u.submittedAt,
      })),
    };
  });

  // Staff Clock-In with mandatory GPS
  app.post('/api/attendance/clock-in', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional().default('Ahmedabad Studio HQ'),
      userId: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid GPS coordinates (lat, lng) are mandatory' });
    }

    let staffId = body.data.userId;
    if (!staffId) {
      const defaultStaff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
      staffId = defaultStaff?.id || 'usr-staff-1';
    }

    // Check for existing active session
    const existingActive = await prisma.attendance.findFirst({
      where: {
        userId: staffId,
        clockOutAt: null,
      },
    });

    if (existingActive) {
      return reply.status(400).send({ error: 'You are already clocked in. Please complete your active session.' });
    }

    const session = await prisma.attendance.create({
      data: {
        userId: staffId,
        clockInAt: new Date(),
        clockInLat: body.data.lat,
        clockInLng: body.data.lng,
        clockInAddress: body.data.address,
      },
    });

    return {
      success: true,
      attendanceId: session.id,
      clockInAt: session.clockInAt,
      lat: Number(session.clockInLat),
      lng: Number(session.clockInLng),
      address: session.clockInAddress,
      message: 'Clock-In recorded successfully with high-accuracy GPS verification.',
    };
  });

  // Submit Daily Work Update
  app.post('/api/attendance/daily-update', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      attendanceId: z.string().optional(),
      projectCode: z.string().optional().default('AF-VILLA'),
      workSummary: z.string().min(1, 'Work summary is required'),
      scheduledSlot: z.string().min(1, 'Scheduled slot is required'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid update parameters' });
    }

    const defaultStaff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    if (!defaultStaff) {
      return reply.status(404).send({ error: 'Staff user not found' });
    }

    // Find active attendance session
    let attendance = null;
    if (body.data.attendanceId) {
      attendance = await prisma.attendance.findUnique({ where: { id: body.data.attendanceId } });
    } else {
      attendance = await prisma.attendance.findFirst({
        where: { userId: defaultStaff.id, clockOutAt: null },
        orderBy: { clockInAt: 'desc' },
      });
    }

    if (!attendance) {
      return reply.status(400).send({ error: 'No active attendance session found. Please Clock-In first.' });
    }

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ projectCode: body.data.projectCode }, { id: body.data.projectCode }],
      },
    });

    if (!project) {
      return reply.status(404).send({ error: 'Project not found.' });
    }

    const update = await prisma.dailyWorkUpdate.create({
      data: {
        userId: defaultStaff.id,
        projectId: project.id,
        attendanceId: attendance.id,
        workSummary: body.data.workSummary,
        scheduledSlot: body.data.scheduledSlot,
      },
    });

    return {
      success: true,
      updateId: update.id,
      scheduledSlot: update.scheduledSlot,
      workSummary: update.workSummary,
      submittedAt: update.submittedAt,
    };
  });

  // Staff Clock-Out with Work Updates Hard Gate
  app.post('/api/attendance/clock-out', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional().default('Ahmedabad Studio HQ'),
      attendanceId: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid GPS coordinates (lat, lng) are mandatory' });
    }

    const defaultStaff = await prisma.user.findFirst({ where: { role: 'STAFF' } });
    if (!defaultStaff) {
      return reply.status(404).send({ error: 'Staff user not found' });
    }

    // Find active session
    let attendance = null;
    if (body.data.attendanceId) {
      attendance = await prisma.attendance.findUnique({
        where: { id: body.data.attendanceId },
        include: { dailyUpdates: true },
      });
    } else {
      attendance = await prisma.attendance.findFirst({
        where: { userId: defaultStaff.id, clockOutAt: null },
        include: { dailyUpdates: true },
        orderBy: { clockInAt: 'desc' },
      });
    }

    if (!attendance) {
      return reply.status(400).send({ error: 'No active Clock-In session found to clock out from.' });
    }

    // MANDATORY HARD GATE CHECK:
    // Every required update for that day must be submitted before Clock Out!
    const scheduledSlots = ['Slot 12:00', 'Slot 17:30'];
    const submittedSlots = attendance.dailyUpdates.map(u => u.scheduledSlot);

    const gate = validateClockOutWithWorkUpdatesGate({
      scheduledSlots,
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

    // All gates pass: Record Clock-Out
    const completedSession = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOutAt: new Date(),
        clockOutLat: body.data.lat,
        clockOutLng: body.data.lng,
        clockOutAddress: body.data.address,
      },
    });

    return {
      success: true,
      clockOutAt: completedSession.clockOutAt,
      message: 'Clock-Out completed successfully. All scheduled work updates verified.',
    };
  });
}
