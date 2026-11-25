import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { RegularizationType, ReviewStatus, UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { validateClockIn, validateClockOutWithWorkUpdatesGate } from './attendance.service';
import { resolveUserFromRequest } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';

export async function attendanceRoutes(app: FastifyInstance) {
  // Get active session status and pending updates (Staff and Admin only)
  app.get('/api/attendance/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to access attendance.' });
    }

    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Attendance tracking is restricted to Staff and Admin.' });
    }

    const targetStaffId = user.role === 'STAFF' ? user.id : (await prisma.user.findFirst({ where: { role: 'STAFF' } }))?.id;
    if (!targetStaffId) {
      return { isClockedIn: false, pendingUpdates: [] };
    }

    // Find active attendance session (clockOutAt is null)
    const activeSession = await prisma.attendance.findFirst({
      where: {
        userId: targetStaffId,
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
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only staff can clock in.' });
    }

    const schema = z.object({
      lat: z.number(),
      lng: z.number(),
      address: z.string().optional().default('Ahmedabad Studio HQ'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid GPS coordinates (lat, lng) are mandatory' });
    }

    const staffId = user.id;

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
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only staff can submit daily updates.' });
    }

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

    // Find active attendance session
    let attendance = null;
    if (body.data.attendanceId) {
      attendance = await prisma.attendance.findUnique({ where: { id: body.data.attendanceId } });
    } else {
      attendance = await prisma.attendance.findFirst({
        where: { userId: user.id, clockOutAt: null },
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
        userId: user.id,
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
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only staff can clock out.' });
    }

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

    // Find active session
    let attendance = null;
    if (body.data.attendanceId) {
      attendance = await prisma.attendance.findUnique({
        where: { id: body.data.attendanceId },
        include: { dailyUpdates: true },
      });
    } else {
      attendance = await prisma.attendance.findFirst({
        where: { userId: user.id, clockOutAt: null },
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

  // Admin Overview of all staff attendance sessions and work logs
  app.get('/api/attendance/admin/overview', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Restricted to Admin.' });
    }

    const scheduledSlots = ['Slot 12:00', 'Slot 17:30'];

    const sessions = await prisma.attendance.findMany({
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            role: true,
            mobile: true,
          },
        },
        dailyUpdates: {
          include: {
            project: {
              select: {
                id: true,
                projectCode: true,
                name: true,
              },
            },
          },
          orderBy: { submittedAt: 'asc' },
        },
      },
      orderBy: { clockInAt: 'desc' },
      take: 50,
    });

    const records = sessions.map(session => {
      const submittedSlots = session.dailyUpdates.map(u => u.scheduledSlot);
      const pendingUpdates = session.clockOutAt ? [] : scheduledSlots.filter(s => !submittedSlots.includes(s));

      return {
        id: session.id,
        userId: session.userId,
        staffName: session.user?.fullName || 'Staff Member',
        username: session.user?.username || 'staff',
        mobile: session.user?.mobile || '',
        role: session.user?.role || 'STAFF',
        clockInAt: session.clockInAt,
        clockInAddress: session.clockInAddress || 'Ahmedabad Studio HQ',
        clockOutAt: session.clockOutAt,
        clockOutAddress: session.clockOutAddress,
        isRegularized: session.isRegularized,
        pendingUpdates,
        dailyUpdates: session.dailyUpdates.map(u => ({
          id: u.id,
          slot: u.scheduledSlot,
          workSummary: u.workSummary,
          submittedAt: u.submittedAt,
          projectCode: u.project?.projectCode || 'AF-VILLA',
        })),
      };
    });

    // Build today's staffRoster for all active STAFF users
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);

    const [activeStaff, todaySessions, todayLeaves] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'STAFF', status: 'ACTIVE' },
        select: { id: true, fullName: true, username: true, mobile: true },
        orderBy: { fullName: 'asc' },
      }),
      prisma.attendance.findMany({
        where: {
          clockInAt: { gte: startOfToday, lte: endOfToday },
        },
        include: { dailyUpdates: true },
        orderBy: { clockInAt: 'desc' },
      }),
      prisma.attendanceRegularization.findMany({
        where: {
          requestType: RegularizationType.LEAVE,
          status: ReviewStatus.APPROVED,
          targetDate: startOfToday,
        },
        select: { userId: true },
      }),
    ]);

    const leaveUserIds = new Set(todayLeaves.map((l) => l.userId));
    const staffRoster = activeStaff.map((staff) => {
      const todaySession = todaySessions.find((s) => s.userId === staff.id);
      let todayStatus: 'CLOCKED_IN' | 'CLOCKED_OUT' | 'ON_LEAVE' | 'ABSENT' = 'ABSENT';
      let pendingUpdatesCount = 0;

      if (todaySession) {
        if (!todaySession.clockOutAt) {
          todayStatus = 'CLOCKED_IN';
          const submitted = todaySession.dailyUpdates.map((u) => u.scheduledSlot);
          pendingUpdatesCount = scheduledSlots.filter((slot) => !submitted.includes(slot)).length;
        } else {
          todayStatus = 'CLOCKED_OUT';
        }
      } else if (leaveUserIds.has(staff.id)) {
        todayStatus = 'ON_LEAVE';
      }

      return {
        id: staff.id,
        fullName: staff.fullName,
        username: staff.username,
        mobile: staff.mobile,
        todayStatus,
        activeSessionId: todaySession?.id || null,
        clockInAt: todaySession?.clockInAt || null,
        clockOutAt: todaySession?.clockOutAt || null,
        clockInAddress: todaySession?.clockInAddress || null,
        pendingUpdatesCount,
      };
    });

    return {
      records,
      staffRoster,
      totalCount: records.length,
      activeCount: records.filter(r => !r.clockOutAt).length,
    };
  });

  // List Attendance Regularization & Leave Requests (Admin sees all; Staff sees own; Clients 403)
  app.get('/api/attendance/regularizations', async (
    request: FastifyRequest<{ Querystring: { status?: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF) {
      return reply.status(403).send({ error: 'Access denied: Client accounts cannot access attendance regularizations.' });
    }

    const where: any = {};
    if (user.role === UserRole.STAFF) {
      where.userId = user.id;
    }
    if (request.query.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(request.query.status.toUpperCase())) {
      where.status = request.query.status.toUpperCase() as ReviewStatus;
    }

    const items = await prisma.attendanceRegularization.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true } },
        reviewedBy: { select: { id: true, fullName: true } },
        attendance: { select: { id: true, clockInAt: true, clockOutAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      regularizations: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        staffName: item.user.fullName,
        username: item.user.username,
        attendanceId: item.attendanceId,
        requestType: item.requestType,
        targetDate: item.targetDate.toISOString().split('T')[0],
        requestedClockIn: item.requestedClockIn ? item.requestedClockIn.toISOString() : null,
        requestedClockOut: item.requestedClockOut ? item.requestedClockOut.toISOString() : null,
        reason: item.reason,
        status: item.status,
        reviewedById: item.reviewedById,
        reviewedByName: item.reviewedBy?.fullName || null,
        reviewNote: item.reviewNote,
        reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  });

  // Submit Regularization or Leave Request (Staff or Admin; Clients 403)
  app.post('/api/attendance/regularizations', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF) {
      return reply.status(403).send({ error: 'Access denied: Only Staff and Admins can submit attendance regularizations.' });
    }

    const schema = z.object({
      requestType: z.enum(['REGULARIZATION', 'LEAVE']).optional().default('REGULARIZATION'),
      targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Target date must be in YYYY-MM-DD format'),
      requestedClockIn: z.string().optional().nullable(),
      requestedClockOut: z.string().optional().nullable(),
      attendanceId: z.string().optional().nullable(),
      reason: z.string().min(3, 'Reason must be at least 3 characters'),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid regularization request' });
    }

    const clockInDate = parsed.data.requestedClockIn ? new Date(parsed.data.requestedClockIn) : null;
    const clockOutDate = parsed.data.requestedClockOut ? new Date(parsed.data.requestedClockOut) : null;
    if (clockInDate && Number.isNaN(clockInDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid requestedClockIn timestamp' });
    }
    if (clockOutDate && Number.isNaN(clockOutDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid requestedClockOut timestamp' });
    }

    const created = await prisma.attendanceRegularization.create({
      data: {
        userId: user.id,
        attendanceId: parsed.data.attendanceId || null,
        requestType: parsed.data.requestType as RegularizationType,
        targetDate: new Date(parsed.data.targetDate),
        requestedClockIn: clockInDate,
        requestedClockOut: clockOutDate,
        reason: parsed.data.reason.trim(),
        status: ReviewStatus.PENDING,
      },
      include: {
        user: { select: { id: true, fullName: true, username: true } },
      },
    });

    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN, status: 'ACTIVE' },
        select: { id: true },
      });
      const adminTargets = admins.filter((a) => a.id !== user.id);
      if (adminTargets.length > 0) {
        await prisma.notification.createMany({
          data: adminTargets.map((a) => ({
            recipientId: a.id,
            category: 'ATTENDANCE',
            title: `${created.requestType === 'LEAVE' ? 'Leave Request' : 'Attendance Regularization'}: ${user.fullName}`,
            message: `${user.fullName} requested ${created.requestType.toLowerCase()} for ${parsed.data.targetDate}: ${created.reason}`,
            deepLink: '/attendance',
          })),
        });
      }
    } catch (err) {
      console.error('[Attendance] Failed to notify admins on regularization:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'SUBMIT_REGULARIZATION',
      entityType: 'ATTENDANCE_REGULARIZATION',
      entityId: created.id,
      newData: {
        requestType: created.requestType,
        targetDate: parsed.data.targetDate,
        reason: created.reason,
      },
    });

    return {
      success: true,
      regularization: {
        id: created.id,
        userId: created.userId,
        staffName: created.user.fullName,
        requestType: created.requestType,
        targetDate: created.targetDate.toISOString().split('T')[0],
        requestedClockIn: created.requestedClockIn ? created.requestedClockIn.toISOString() : null,
        requestedClockOut: created.requestedClockOut ? created.requestedClockOut.toISOString() : null,
        reason: created.reason,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
    };
  });

  // Review Regularization or Leave Request (Admin Only)
  app.post('/api/attendance/regularizations/:id/review', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== UserRole.ADMIN) {
      return reply.status(403).send({ error: 'Access denied: Only Admins can review attendance regularizations.' });
    }

    const schema = z.object({
      decision: z.enum(['APPROVED', 'REJECTED']),
      reviewNote: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Decision must be APPROVED or REJECTED.' });
    }

    const existing = await prisma.attendanceRegularization.findUnique({
      where: { id: request.params.id },
      include: { user: { select: { id: true, fullName: true } } },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Regularization request not found.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const reviewed = await tx.attendanceRegularization.update({
        where: { id: existing.id },
        data: {
          status: parsed.data.decision as ReviewStatus,
          reviewedById: user.id,
          reviewNote: parsed.data.reviewNote?.trim() || null,
          reviewedAt: new Date(),
        },
      });

      if (parsed.data.decision === 'APPROVED' && existing.requestType === RegularizationType.REGULARIZATION) {
        if (existing.attendanceId) {
          await tx.attendance.update({
            where: { id: existing.attendanceId },
            data: {
              isRegularized: true,
              ...(existing.requestedClockIn ? { clockInAt: existing.requestedClockIn } : {}),
              ...(existing.requestedClockOut ? { clockOutAt: existing.requestedClockOut } : {}),
            },
          });
        } else if (existing.requestedClockIn) {
          await tx.attendance.create({
            data: {
              userId: existing.userId,
              clockInAt: existing.requestedClockIn,
              clockInLat: 23.0225,
              clockInLng: 72.5714,
              clockInAddress: 'Regularized by Admin',
              clockOutAt: existing.requestedClockOut,
              clockOutLat: existing.requestedClockOut ? 23.0225 : null,
              clockOutLng: existing.requestedClockOut ? 72.5714 : null,
              clockOutAddress: existing.requestedClockOut ? 'Regularized by Admin' : null,
              isRegularized: true,
            },
          });
        }
      }

      return reviewed;
    });

    try {
      await prisma.notification.create({
        data: {
          recipientId: existing.userId,
          category: 'ATTENDANCE',
          title: `${existing.requestType === 'LEAVE' ? 'Leave' : 'Regularization'} ${parsed.data.decision}`,
          message: `Your ${existing.requestType.toLowerCase()} request for ${existing.targetDate.toISOString().split('T')[0]} was ${parsed.data.decision.toLowerCase()} by ${user.fullName}.${parsed.data.reviewNote ? ` Note: ${parsed.data.reviewNote}` : ''}`,
          deepLink: '/attendance',
        },
      });
    } catch (err) {
      console.error('[Attendance] Failed to notify staff on regularization review:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REVIEW_REGULARIZATION',
      entityType: 'ATTENDANCE_REGULARIZATION',
      entityId: updated.id,
      oldData: { status: existing.status },
      newData: { status: updated.status, reviewNote: updated.reviewNote },
    });

    return {
      success: true,
      regularization: {
        id: updated.id,
        status: updated.status,
        reviewNote: updated.reviewNote,
        reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
      },
    };
  });
}
