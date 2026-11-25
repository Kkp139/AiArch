import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { TimeSlot, MeetingType, MeetingStatus, UserRole } from '@prisma/client';
import { sendMeetingConfirmationEmail } from '../../lib/email.service';
import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';
import { isFutureDate, isRoleAllowedToRequestMeeting } from './meetings.service';

export const VALID_SLOT_STRINGS = ['12:00–13:30', '16:00–17:30', '18:00–19:30'] as const;

export const SLOT_MAP: Record<string, TimeSlot> = {
  '12:00–13:30': TimeSlot.SLOT_12_00_13_30,
  '12:00-13:30': TimeSlot.SLOT_12_00_13_30,
  '16:00–17:30': TimeSlot.SLOT_16_00_17_30,
  '16:00-17:30': TimeSlot.SLOT_16_00_17_30,
  '18:00–19:30': TimeSlot.SLOT_18_00_19_30,
  '18:00-19:30': TimeSlot.SLOT_18_00_19_30,
  'SLOT_12_00_13_30': TimeSlot.SLOT_12_00_13_30,
  'SLOT_16_00_17_30': TimeSlot.SLOT_16_00_17_30,
  'SLOT_18_00_19_30': TimeSlot.SLOT_18_00_19_30,
};

export const REVERSE_SLOT_MAP: Record<TimeSlot, string> = {
  [TimeSlot.SLOT_12_00_13_30]: '12:00–13:30',
  [TimeSlot.SLOT_16_00_17_30]: '16:00–17:30',
  [TimeSlot.SLOT_18_00_19_30]: '18:00–19:30',
};

function parseMeetingNotes(raw: string | null | undefined) {
  if (!raw) return null;
  if (!raw.trim().startsWith('{')) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function meetingRoutes(app: FastifyInstance) {
  // Get all meetings (Strictly reserved for Admin and Client Leader; Staff & Client Viewer get 403)
  app.get('/api/meetings', async (
    request: FastifyRequest<{ Querystring: { projectCode?: string; date?: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to access consultations.' });
    }

    if (!isRoleAllowedToRequestMeeting(user.role)) {
      return reply.status(403).send({ error: 'Access denied: Client Viewer and Staff accounts are not authorized to access consultation meetings.' });
    }

    const { projectCode, date } = request.query;

    const where: any = {};
    if (projectCode) {
      const proj = await prisma.project.findFirst({
        where: { OR: [{ id: projectCode }, { projectCode }] },
      });
      if (proj) {
        if (!userHasProjectAccess(user, proj.id)) {
          return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
        }
        if (user.role !== 'ADMIN' && proj.status === 'INACTIVE') {
          return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
        }
        where.projectId = proj.id;
      }
    } else if (user.role !== 'ADMIN') {
      const assignedIds = (user.assignedProjects || []).map((ap) => ap.projectId);
      where.OR = [
        { requestedBy: user.id },
        { projectId: { in: assignedIds } },
      ];
    }

    if (date) {
      where.bookingDate = new Date(date);
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        project: {
          select: { id: true, projectCode: true, name: true, status: true, allowClientMeetings: true },
        },
        requester: {
          select: { id: true, fullName: true, role: true },
        },
        approver: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { bookingDate: 'asc' },
    });

    const visibleMeetings = user.role === 'ADMIN'
      ? meetings
      : meetings.filter((m) => !m.project || m.project.status === 'ACTIVE');

    return visibleMeetings.map((m) => {
      const parsedNotes = parseMeetingNotes(m.notes);

      return {
        id: m.id,
        projectId: m.projectId,
        projectCode: m.project?.projectCode || 'GENERAL',
        projectName: m.project?.name || 'Studio General',
        projectCodes: parsedNotes?.projectCodes || (m.project?.projectCode ? [m.project.projectCode] : []),
        bookingDate: m.bookingDate.toISOString().split('T')[0],
        slot: m.slot,
        slotTime: REVERSE_SLOT_MAP[m.slot] || m.slot,
        type: m.type,
        status: m.status,
        notes: m.notes,
        agenda: parsedNotes?.agenda || (m.notes && !m.notes.startsWith('{') ? m.notes : 'Architectural Design Review'),
        attendees: parsedNotes?.attendees || [m.requester.fullName],
        location: parsedNotes?.location || (m.type === 'SITE_VISIT' ? 'On Site' : 'Studio HQ'),
        taskDetails: parsedNotes?.taskDetails || '',
        replacesMeetingId: m.replacesMeetingId,
        requestedBy: m.requester.fullName,
        requestedById: m.requestedBy,
        approvedBy: m.approver?.fullName || null,
        rsvp: parsedNotes?.rsvp || {},
        createdAt: m.createdAt,
      };
    });
  });

  // Request or Schedule a Meeting Slot (Admin -> CONFIRMED; Client Leader -> REQUESTED; Staff & Client Viewer -> 403)
  app.post('/api/meetings/request', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to request a consultation.' });
    }

    if (!isRoleAllowedToRequestMeeting(user.role)) {
      return reply.status(403).send({
        error: 'Access denied: Client Viewer and Staff accounts are not authorized to request consultation slots.',
      });
    }

    const schema = z.object({
      projectCode: z.string().optional(),
      projectCodes: z.array(z.string()).optional(),
      bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
      slot: z.string(),
      type: z.enum(['OFFICE_MEETING', 'SITE_VISIT']).optional().default('OFFICE_MEETING'),
      agenda: z.string().optional(),
      attendees: z.array(z.string()).optional(),
      location: z.string().optional(),
      notes: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid meeting parameters' });
    }

    const { projectCode, projectCodes = [], bookingDate, slot, type, agenda, attendees = [], location, notes } = body.data;
    const enumSlot = SLOT_MAP[slot];
    if (!enumSlot) {
      return reply.status(400).send({ error: 'Invalid slot. Must be 12:00–13:30, 16:00–17:30, or 18:00–19:30' });
    }

    if (!isFutureDate(bookingDate)) {
      return reply.status(400).send({ error: 'Cannot book meetings on a past calendar date.' });
    }

    const effectiveCodes = projectCodes.length > 0 ? projectCodes : projectCode ? [projectCode] : [];
    const resolvedProjects = [];
    for (const code of effectiveCodes) {
      const proj = await prisma.project.findFirst({
        where: { OR: [{ id: code }, { projectCode: code }] },
      });
      if (!proj) {
        return reply.status(404).send({ error: `Project '${code}' not found.` });
      }
      if (!userHasProjectAccess(user, proj.id)) {
        return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
      }
      if (user.role !== 'ADMIN') {
        if (proj.status === 'INACTIVE') {
          return reply.status(403).send({ error: 'Access denied: Inactive projects are not accessible to client accounts.' });
        }
        if (!proj.allowClientMeetings) {
          return reply.status(403).send({ error: 'Consultation bookings are disabled for this project by the studio administrator.' });
        }
      }
      resolvedProjects.push(proj);
    }

    const primaryProject = resolvedProjects[0] || null;
    const parsedDate = new Date(bookingDate);

    // Atomic slot check for active reservations
    const existing = await prisma.meeting.findFirst({
      where: {
        bookingDate: parsedDate,
        slot: enumSlot,
        status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULE_PENDING'] },
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: `Slot ${REVERSE_SLOT_MAP[enumSlot]} on ${bookingDate} is already reserved by another consultation booking.`,
      });
    }

    const isAdmin = user.role === 'ADMIN';
    const finalAttendees = attendees.length > 0 ? attendees : [user.fullName];
    const meetingAgenda = agenda || notes || 'Architectural Review';

    const structuredNotes = JSON.stringify({
      agenda: meetingAgenda,
      attendees: finalAttendees,
      location: location || (type === 'SITE_VISIT' ? 'On Site' : 'Studio HQ Boardroom'),
      taskDetails: notes || '',
      projectCodes: resolvedProjects.map((p) => p.projectCode),
    });

    let meeting;
    try {
      meeting = await prisma.meeting.create({
        data: {
          projectId: primaryProject?.id,
          bookingDate: parsedDate,
          slot: enumSlot,
          type: type as MeetingType,
          status: isAdmin ? MeetingStatus.CONFIRMED : MeetingStatus.REQUESTED,
          approvedBy: isAdmin ? user.id : null,
          notes: structuredNotes,
          requestedBy: user.id,
        },
        include: {
          project: true,
          requester: true,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return reply.status(409).send({
          error: `Slot ${REVERSE_SLOT_MAP[enumSlot]} on ${bookingDate} is already reserved by another consultation booking.`,
        });
      }
      throw err;
    }

    // Notifications
    try {
      const notifiedIds = new Set<string>([user.id]);
      if (isAdmin) {
        // Notify explicitly listed attendees
        for (const attendeeName of finalAttendees) {
          const attendeeUser = await prisma.user.findFirst({
            where: {
              OR: [
                { fullName: { contains: attendeeName, mode: 'insensitive' } },
                { username: { equals: attendeeName.toLowerCase() } },
                { id: attendeeName },
              ],
            },
          });
          if (attendeeUser && !notifiedIds.has(attendeeUser.id)) {
            notifiedIds.add(attendeeUser.id);
            await prisma.notification.create({
              data: {
                recipientId: attendeeUser.id,
                projectId: primaryProject?.id,
                category: 'MEETING',
                title: `Meeting Scheduled: ${meetingAgenda}`,
                message: `${user.fullName} scheduled a ${type === 'SITE_VISIT' ? 'Site Visit' : 'Meeting'} on ${bookingDate} (${REVERSE_SLOT_MAP[enumSlot]}).`,
                deepLink: '/meetings',
              },
            });
          }
        }

        // Notify assigned Client Leaders of involved projects
        if (resolvedProjects.length > 0) {
          const leaderAssignments = await prisma.projectAssignment.findMany({
            where: {
              projectId: { in: resolvedProjects.map((p) => p.id) },
              user: { role: 'CLIENT_LEADER', status: 'ACTIVE' },
            },
            select: { userId: true },
          });
          for (const la of leaderAssignments) {
            if (!notifiedIds.has(la.userId)) {
              notifiedIds.add(la.userId);
              await prisma.notification.create({
                data: {
                  recipientId: la.userId,
                  projectId: primaryProject?.id,
                  category: 'MEETING',
                  title: `Meeting Confirmed: ${meetingAgenda}`,
                  message: `Studio scheduled a ${type === 'SITE_VISIT' ? 'Site Visit' : 'Meeting'} on ${bookingDate} (${REVERSE_SLOT_MAP[enumSlot]}).`,
                  deepLink: '/meetings',
                },
              });
            }
          }
        }
      } else {
        // CLIENT_LEADER requested -> notify all active Admins
        const admins = await prisma.user.findMany({
          where: { role: UserRole.ADMIN, status: 'ACTIVE' },
          select: { id: true },
        });
        const adminTargets = admins.filter((a) => !notifiedIds.has(a.id));
        if (adminTargets.length > 0) {
          await prisma.notification.createMany({
            data: adminTargets.map((a) => ({
              recipientId: a.id,
              projectId: primaryProject?.id,
              category: 'MEETING',
              title: `New Meeting Request: ${meetingAgenda}`,
              message: `${user.fullName} requested a ${type === 'SITE_VISIT' ? 'Site Visit' : 'Meeting'} on ${bookingDate} (${REVERSE_SLOT_MAP[enumSlot]}).`,
              deepLink: '/meetings',
            })),
          });
        }
      }
    } catch (e) {
      console.error('[Meetings] Notification dispatch failed:', e);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: isAdmin ? 'SCHEDULE_MEETING' : 'REQUEST_MEETING',
      entityType: 'MEETING',
      entityId: meeting.id,
      newData: {
        bookingDate,
        slot: enumSlot,
        type: meeting.type,
        status: meeting.status,
        projectCode: meeting.project?.projectCode || 'GENERAL',
      },
    });

    return {
      success: true,
      meeting: {
        id: meeting.id,
        bookingDate,
        slotTime: REVERSE_SLOT_MAP[meeting.slot],
        status: meeting.status,
        type: meeting.type,
        agenda: meetingAgenda,
        attendees: finalAttendees,
        location: location || (type === 'SITE_VISIT' ? 'On Site' : 'Studio HQ Boardroom'),
        notes: meeting.notes,
        projectCode: meeting.project?.projectCode || 'GENERAL',
        projectCodes: resolvedProjects.map((p) => p.projectCode),
        requestedBy: meeting.requester.fullName,
      },
    };
  });

  // Approve Meeting Slot (Admin only - rechecks slot availability and cancels replacesMeetingId atomically)
  app.post('/api/meetings/:id/approve', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can confirm consultations.' });
    }

    const existing = await prisma.meeting.findUnique({
      where: { id: request.params.id },
      include: { project: true, requester: true },
    });

    if (!existing) {
      return reply.status(404).send({ error: 'Meeting not found.' });
    }

    if (existing.status === 'CANCELLED' || existing.status === 'REJECTED') {
      return reply.status(400).send({ error: `Cannot approve a meeting that is ${existing.status.toLowerCase()}.` });
    }

    // Recheck slot availability before confirmation
    const conflictingConfirmed = await prisma.meeting.findFirst({
      where: {
        id: { not: existing.id },
        bookingDate: existing.bookingDate,
        slot: existing.slot,
        status: 'CONFIRMED',
      },
    });

    if (conflictingConfirmed) {
      return reply.status(409).send({
        error: `Slot ${REVERSE_SLOT_MAP[existing.slot]} on ${existing.bookingDate.toISOString().split('T')[0]} is already confirmed for another meeting.`,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const confirmed = await tx.meeting.update({
        where: { id: existing.id },
        data: {
          status: MeetingStatus.CONFIRMED,
          approvedBy: user.id,
        },
        include: {
          project: true,
          requester: true,
        },
      });

      if (confirmed.replacesMeetingId) {
        await tx.meeting.update({
          where: { id: confirmed.replacesMeetingId },
          data: { status: MeetingStatus.CANCELLED },
        });
      }

      return confirmed;
    });

    try {
      await prisma.notification.create({
        data: {
          recipientId: updated.requestedBy,
          projectId: updated.projectId,
          category: 'MEETING',
          title: 'Meeting Request Confirmed',
          message: `Your consultation on ${updated.bookingDate.toISOString().split('T')[0]} (${REVERSE_SLOT_MAP[updated.slot]}) has been confirmed by ${user.fullName}.`,
          deepLink: '/meetings',
        },
      });
    } catch (err) {
      console.error('[Meetings] Notification failed:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'APPROVE_MEETING',
      entityType: 'MEETING',
      entityId: updated.id,
      oldData: { status: existing.status },
      newData: { status: updated.status, approvedBy: user.id, replacesMeetingId: updated.replacesMeetingId },
    });

    if (updated.requester.email) {
      sendMeetingConfirmationEmail(updated.requester.email, {
        fullName: updated.requester.fullName,
        projectCode: updated.project?.projectCode || 'A&F Design',
        date: updated.bookingDate.toISOString().split('T')[0],
        slot: REVERSE_SLOT_MAP[updated.slot],
        agenda: updated.notes || 'Architectural Review',
      }).catch((err) => console.error('Failed to send meeting confirmation email:', err));
    }

    return {
      success: true,
      meeting: {
        id: updated.id,
        bookingDate: updated.bookingDate.toISOString().split('T')[0],
        slotTime: REVERSE_SLOT_MAP[updated.slot],
        status: updated.status,
        replacesMeetingId: updated.replacesMeetingId,
        approvedBy: user.fullName,
      },
    };
  });

  // Reject Meeting or Reschedule Request (Admin only)
  app.post('/api/meetings/:id/reject', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can reject consultations.' });
    }

    const schema = z.object({
      reason: z.string().optional(),
      note: z.string().optional(),
    });
    const parsed = schema.safeParse(request.body || {});
    const reason = parsed.success ? (parsed.data.reason || parsed.data.note || '') : '';

    const existing = await prisma.meeting.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Meeting not found.' });
    }

    const updated = await prisma.meeting.update({
      where: { id: existing.id },
      data: {
        status: MeetingStatus.REJECTED,
        approvedBy: user.id,
      },
    });

    try {
      await prisma.notification.create({
        data: {
          recipientId: updated.requestedBy,
          projectId: updated.projectId,
          category: 'MEETING',
          title: 'Meeting Request Declined',
          message: `Your consultation request for ${updated.bookingDate.toISOString().split('T')[0]} (${REVERSE_SLOT_MAP[updated.slot]}) was declined.${reason ? ` Reason: ${reason}` : ''}`,
          deepLink: '/meetings',
        },
      });
    } catch (err) {
      console.error('[Meetings] Reject notification failed:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REJECT_MEETING',
      entityType: 'MEETING',
      entityId: updated.id,
      oldData: { status: existing.status },
      newData: { status: updated.status, reason: reason || null },
    });

    return {
      success: true,
      status: updated.status,
      meetingId: updated.id,
    };
  });

  // Request Meeting Reschedule (Admin or Client Leader only; keeps original CONFIRMED until replacement approved)
  app.post('/api/meetings/:id/reschedule', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (!isRoleAllowedToRequestMeeting(user.role)) {
      return reply.status(403).send({
        error: 'Access denied: Client Viewer and Staff accounts are not authorized to reschedule consultations.',
      });
    }

    const original = await prisma.meeting.findUnique({
      where: { id: request.params.id },
      include: { project: true, requester: true },
    });

    if (!original) {
      return reply.status(404).send({ error: 'Original meeting not found' });
    }

    if (user.role === 'CLIENT_LEADER' && original.requestedBy !== user.id) {
      if (!original.projectId || !userHasProjectAccess(user, original.projectId)) {
        return reply.status(403).send({ error: 'Access denied: You can only reschedule meetings for your assigned projects.' });
      }
    }

    if (original.status === 'CANCELLED' || original.status === 'REJECTED') {
      return reply.status(400).send({ error: `Cannot reschedule a meeting that is already ${original.status.toLowerCase()}.` });
    }

    const schema = z.object({
      bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
      slot: z.string(),
      notes: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid parameters' });
    }

    const { bookingDate, slot, notes } = body.data;
    const enumSlot = SLOT_MAP[slot];
    if (!enumSlot) {
      return reply.status(400).send({ error: 'Invalid slot. Must be 12:00–13:30, 16:00–17:30, or 18:00–19:30' });
    }

    if (!isFutureDate(bookingDate)) {
      return reply.status(400).send({ error: 'Cannot reschedule meetings to a past calendar date.' });
    }

    const parsedDate = new Date(bookingDate);

    const existing = await prisma.meeting.findFirst({
      where: {
        bookingDate: parsedDate,
        slot: enumSlot,
        status: { in: ['REQUESTED', 'CONFIRMED', 'RESCHEDULE_PENDING'] },
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: `Slot ${REVERSE_SLOT_MAP[enumSlot]} on ${bookingDate} is already reserved by another consultation booking.`,
      });
    }

    let replacement;
    try {
      replacement = await prisma.meeting.create({
        data: {
          projectId: original.projectId,
          bookingDate: parsedDate,
          slot: enumSlot,
          type: original.type,
          status: MeetingStatus.RESCHEDULE_PENDING,
          notes: notes || `Reschedule of meeting ${original.id}`,
          requestedBy: user.id,
          replacesMeetingId: original.id,
        },
        include: {
          project: true,
          requester: true,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        return reply.status(409).send({
          error: `Slot ${REVERSE_SLOT_MAP[enumSlot]} on ${bookingDate} is already reserved by another consultation booking.`,
        });
      }
      throw err;
    }

    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN, status: 'ACTIVE' },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins
            .filter((a) => a.id !== user.id)
            .map((a) => ({
              recipientId: a.id,
              projectId: original.projectId,
              category: 'MEETING',
              title: 'Meeting Reschedule Requested',
              message: `${user.fullName} requested to reschedule to ${bookingDate} (${REVERSE_SLOT_MAP[enumSlot]}).`,
              deepLink: '/meetings',
            })),
        });
      }
    } catch (err) {
      console.error('[Meetings] Reschedule notification failed:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REQUEST_MEETING_RESCHEDULE',
      entityType: 'MEETING',
      entityId: replacement.id,
      oldData: {
        originalMeetingId: original.id,
        originalDate: original.bookingDate.toISOString().split('T')[0],
        originalSlot: original.slot,
      },
      newData: {
        replacementMeetingId: replacement.id,
        newBookingDate: bookingDate,
        newSlot: enumSlot,
      },
    });

    return {
      success: true,
      meeting: {
        id: replacement.id,
        bookingDate,
        slotTime: REVERSE_SLOT_MAP[replacement.slot],
        status: replacement.status,
        type: replacement.type,
        replacesMeetingId: original.id,
      },
      message: 'Reschedule request submitted. Original booking remains active until studio confirmation.',
    };
  });

  // Cancel Meeting (Admin or requesting Client Leader; Staff & Client Viewer -> 403)
  app.post('/api/meetings/:id/cancel', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (!isRoleAllowedToRequestMeeting(user.role)) {
      return reply.status(403).send({
        error: 'Access denied: Client Viewer and Staff accounts are not authorized to cancel consultations.',
      });
    }

    const meeting = await prisma.meeting.findUnique({ where: { id: request.params.id } });
    if (!meeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    if (user.role !== 'ADMIN' && meeting.requestedBy !== user.id) {
      return reply.status(403).send({ error: 'Access denied: You can only cancel meetings booked by your account.' });
    }

    const updated = await prisma.meeting.update({
      where: { id: meeting.id },
      data: { status: MeetingStatus.CANCELLED },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CANCEL_MEETING',
      entityType: 'MEETING',
      entityId: updated.id,
      oldData: { status: meeting.status },
      newData: { status: updated.status },
    });

    return {
      success: true,
      message: 'Meeting has been successfully cancelled.',
      meetingId: updated.id,
      status: updated.status,
    };
  });

  // Invitee RSVP: Confirm / IN vs Decline / OUT (Admin and Client Leader only)
  app.post('/api/meetings/:id/rsvp', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    if (!isRoleAllowedToRequestMeeting(user.role)) {
      return reply.status(403).send({
        error: 'Access denied: Client Viewer and Staff accounts are not authorized to RSVP for consultation meetings.',
      });
    }

    const schema = z.object({
      rsvp: z.enum(['IN', 'OUT']),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid RSVP value. Must be IN or OUT.' });
    }

    const { rsvp } = body.data;
    const meeting = await prisma.meeting.findUnique({ where: { id: request.params.id } });
    if (!meeting) {
      return reply.status(404).send({ error: 'Meeting not found' });
    }

    let parsedNotes: any = {};
    if (meeting.notes && typeof meeting.notes === 'string') {
      try {
        parsedNotes = JSON.parse(meeting.notes);
      } catch {
        parsedNotes = { notes: meeting.notes };
      }
    }

    const currentRsvp = parsedNotes.rsvp || {};
    currentRsvp[user.fullName] = rsvp;
    currentRsvp[user.id] = rsvp;
    parsedNotes.rsvp = currentRsvp;

    const updated = await prisma.meeting.update({
      where: { id: request.params.id },
      data: {
        notes: JSON.stringify(parsedNotes),
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'MEETING_RSVP',
      entityType: 'MEETING',
      entityId: updated.id,
      newData: { rsvp, attendee: user.fullName },
    });

    return {
      success: true,
      rsvp,
      meetingId: updated.id,
      attendee: user.fullName,
      allRsvp: currentRsvp,
    };
  });
}
