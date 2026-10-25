import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { TimeSlot, MeetingType, MeetingStatus } from '@prisma/client';
import { sendMeetingConfirmationEmail } from '../../lib/email.service';

export const VALID_SLOT_STRINGS = ['12:00–13:30', '16:00–17:30', '18:00–19:30'] as const;

export const SLOT_MAP: Record<string, TimeSlot> = {
  '12:00–13:30': TimeSlot.SLOT_12_00_13_30,
  '16:00–17:30': TimeSlot.SLOT_16_00_17_30,
  '18:00–19:30': TimeSlot.SLOT_18_00_19_30,
  'SLOT_12_00_13_30': TimeSlot.SLOT_12_00_13_30,
  'SLOT_16_00_17_30': TimeSlot.SLOT_16_00_17_30,
  'SLOT_18_00_19_30': TimeSlot.SLOT_18_00_19_30,
};

export const REVERSE_SLOT_MAP: Record<TimeSlot, string> = {
  [TimeSlot.SLOT_12_00_13_30]: '12:00–13:30',
  [TimeSlot.SLOT_16_00_17_30]: '16:00–17:30',
  [TimeSlot.SLOT_18_00_19_30]: '18:00–19:30',
};

import { resolveUserFromRequest, userHasProjectAccess } from '../../lib/auth-guard';

export async function meetingRoutes(app: FastifyInstance) {
  // Get all meetings (Requires authentication; non-admin users only see meetings for assigned projects or requested by them)
  app.get('/api/meetings', async (request: FastifyRequest<{ Querystring: { projectCode?: string; date?: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to access consultations.' });
    }

    const { projectCode, date } = request.query;

    const where: any = {};
    if (projectCode) {
      const proj = await prisma.project.findFirst({ where: { projectCode } });
      if (proj) {
        if (!userHasProjectAccess(user, proj.id)) {
          return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
        }
        where.projectId = proj.id;
      }
    } else if (user.role !== 'ADMIN') {
      const assignedIds = user.assignedProjects.map(ap => ap.projectId);
      where.OR = [
        { requesterId: user.id },
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
          select: { id: true, projectCode: true, name: true, allowClientMeetings: true },
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

    return meetings.map(m => ({
      id: m.id,
      projectId: m.projectId,
      projectCode: m.project?.projectCode || 'GENERAL',
      bookingDate: m.bookingDate.toISOString().split('T')[0],
      slot: m.slot,
      slotTime: REVERSE_SLOT_MAP[m.slot],
      type: m.type,
      status: m.status,
      notes: m.notes,
      requestedBy: m.requester.fullName,
      approvedBy: m.approver?.fullName,
      createdAt: m.createdAt,
    }));
  });

  // Request a Meeting Slot (Client Leader, Client Viewer, or Admin)
  app.post('/api/meetings/request', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please sign in to request a consultation.' });
    }

    if (user.role === 'STAFF') {
      return reply.status(403).send({ error: 'Access denied: Staff accounts cannot request client consultation slots.' });
    }

    const schema = z.object({
      projectCode: z.string().optional(),
      bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
      slot: z.string(),
      type: z.enum(['OFFICE_MEETING', 'SITE_VISIT']).optional().default('OFFICE_MEETING'),
      notes: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid meeting parameters' });
    }

    const { projectCode, bookingDate, slot, type, notes } = body.data;
    const enumSlot = SLOT_MAP[slot];
    if (!enumSlot) {
      return reply.status(400).send({ error: 'Invalid slot. Must be 12:00–13:30, 16:00–17:30, or 18:00–19:30' });
    }

    // Resolve project and check dynamic meetings toggle
    let project = null;
    if (projectCode) {
      project = await prisma.project.findFirst({ where: { projectCode } });
      if (project) {
        if (!userHasProjectAccess(user, project.id)) {
          return reply.status(403).send({ error: 'Access denied: You are not assigned to this project.' });
        }
        if (user.role !== 'ADMIN' && !project.allowClientMeetings) {
          return reply.status(403).send({ error: 'Consultation bookings are disabled for this project by the studio administrator.' });
        }
      }
    }

    const parsedDate = new Date(bookingDate);

    // Concurrency safeguard: check if slot is already reserved for this date
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

    const meeting = await prisma.meeting.create({
      data: {
        projectId: project?.id,
        bookingDate: parsedDate,
        slot: enumSlot,
        type: type as MeetingType,
        status: MeetingStatus.REQUESTED,
        notes,
        requestedBy: user.id,
      },
      include: {
        project: true,
        requester: true,
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
        notes: meeting.notes,
        projectCode: meeting.project?.projectCode || 'GENERAL',
        requestedBy: meeting.requester.fullName,
      },
    };
  });

  // Approve Meeting Slot (Admin only)
  app.post('/api/meetings/:id/approve', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only studio Admins can confirm consultations.' });
    }

    const updated = await prisma.meeting.update({
      where: { id: request.params.id },
      data: {
        status: MeetingStatus.CONFIRMED,
        approvedBy: user.id,
      },
      include: {
        project: true,
        requester: true,
      },
    });

    if (updated.requester.email) {
      sendMeetingConfirmationEmail(updated.requester.email, {
        fullName: updated.requester.fullName,
        projectCode: updated.project?.projectCode || 'A&F Design',
        date: updated.bookingDate.toISOString().split('T')[0],
        slot: REVERSE_SLOT_MAP[updated.slot],
        agenda: updated.notes || 'Architectural Review',
      }).catch(err => console.error('Failed to send meeting confirmation email:', err));
    }

    return {
      success: true,
      meeting: {
        id: updated.id,
        bookingDate: updated.bookingDate.toISOString().split('T')[0],
        slotTime: REVERSE_SLOT_MAP[updated.slot],
        status: updated.status,
        approvedBy: user.fullName,
      },
    };
  });
}
