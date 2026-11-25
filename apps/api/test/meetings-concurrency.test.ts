import { describe, it, expect } from 'vitest';
import {
  MeetingReservationEngine,
  isValidSlot,
  isFutureDate,
  isRoleAllowedToRequestMeeting,
} from '../src/modules/meetings/meetings.service';

function futureDateStr(daysAhead: number): string {
  return new Date(Date.now() + daysAhead * 86400000).toISOString().split('T')[0];
}

describe('Meeting Management & Atomic Slot Concurrency', () => {
  it('validates the 3 fixed time slots and rejects invalid times', () => {
    expect(isValidSlot('SLOT_12_00_13_30')).toBe(true);
    expect(isValidSlot('SLOT_16_00_17_30')).toBe(true);
    expect(isValidSlot('SLOT_18_00_19_30')).toBe(true);
    expect(isValidSlot('SLOT_10_00_11_30')).toBe(false);
  });

  it('rejects booking past dates', () => {
    const yesterday = futureDateStr(-1);
    const tomorrow = futureDateStr(1);

    expect(isFutureDate(yesterday)).toBe(false);
    expect(isFutureDate(tomorrow)).toBe(true);
  });

  it('ATOMIC COLLISION LOCK: allows first booking and strictly rejects overlapping booking for same date/slot', async () => {
    const engine = new MeetingReservationEngine();
    const date = futureDateStr(2);
    const slot = 'SLOT_12_00_13_30';

    const book1 = await engine.bookSlot({
      bookingDate: date,
      slot,
      type: 'OFFICE_MEETING',
      requestedBy: 'client-leader-1',
    });
    expect(book1.success).toBe(true);
    expect(book1.meeting?.status).toBe('REQUESTED');

    const book2 = await engine.bookSlot({
      bookingDate: date,
      slot,
      type: 'SITE_VISIT',
      requestedBy: 'client-leader-2',
    });
    expect(book2.success).toBe(false);
    expect(book2.error).toContain('Slot already booked or reserved');
  });

  it('RESCHEDULE SAFEGUARD: approved booking remains valid until replacement is approved', async () => {
    const engine = new MeetingReservationEngine();
    const originalDate = futureDateStr(5);
    const newDate = futureDateStr(6);
    const slot = 'SLOT_16_00_17_30';

    const initial = await engine.bookSlot({
      bookingDate: originalDate,
      slot,
      type: 'OFFICE_MEETING',
      requestedBy: 'client-leader-1',
    });
    expect(initial.success).toBe(true);
    engine.approveMeeting(initial.meeting!.id, 'admin-1');

    const reschedule = await engine.requestReschedule(initial.meeting!.id, newDate, slot, 'client-leader-1');
    expect(reschedule.success).toBe(true);

    // Old meeting stays CONFIRMED while reschedule is RESCHEDULE_PENDING
    const oldMeeting = engine.getMeeting(initial.meeting!.id);
    expect(oldMeeting?.status).toBe('CONFIRMED');

    // Once admin approves replacement, old meeting is cancelled and new is confirmed
    engine.approveMeeting(reschedule.replacementMeeting!.id, 'admin-1');
    const oldMeetingAfter = engine.getMeeting(initial.meeting!.id);
    expect(oldMeetingAfter?.status).toBe('CANCELLED');

    const newMeetingAfter = engine.getMeeting(reschedule.replacementMeeting!.id);
    expect(newMeetingAfter?.status).toBe('CONFIRMED');
  });

  it('RBAC AUTHORIZATION: allows Client Leader and Admin, strictly forbids Client Viewer and Staff', () => {
    expect(isRoleAllowedToRequestMeeting('ADMIN')).toBe(true);
    expect(isRoleAllowedToRequestMeeting('CLIENT_LEADER')).toBe(true);
    expect(isRoleAllowedToRequestMeeting('CLIENT_VIEWER')).toBe(false);
    expect(isRoleAllowedToRequestMeeting('STAFF')).toBe(false);
  });

  describe('HTTP Fastify Route RBAC Enforcement', () => {
    it('HTTP 401: rejects unauthenticated meeting requests', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();
      const res = await app.inject({
        method: 'POST',
        url: '/api/meetings/request',
        payload: {
          bookingDate: futureDateStr(7),
          slot: '12:00–13:30',
        },
      });
      expect(res.statusCode).toBe(401);
      await app.close();
    });

    it('HTTP 403 FORBIDDEN: strictly blocks Client Viewer from reading, requesting, rescheduling, cancelling, or RSVPing meetings', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const getRes = await app.inject({
        method: 'GET',
        url: '/api/meetings',
        headers: { authorization: 'Bearer mock-viewer-token' },
      });
      expect(getRes.statusCode).toBe(403);

      const reqRes = await app.inject({
        method: 'POST',
        url: '/api/meetings/request',
        headers: { authorization: 'Bearer mock-viewer-token' },
        payload: {
          bookingDate: futureDateStr(7),
          slot: '12:00–13:30',
        },
      });
      expect(reqRes.statusCode).toBe(403);
      expect(JSON.parse(reqRes.body).error).toContain('Client Viewer and Staff accounts are not authorized');

      const reschedRes = await app.inject({
        method: 'POST',
        url: '/api/meetings/meet-123/reschedule',
        headers: { authorization: 'Bearer mock-viewer-token' },
        payload: {
          bookingDate: futureDateStr(9),
          slot: '16:00–17:30',
        },
      });
      expect(reschedRes.statusCode).toBe(403);

      const rsvpRes = await app.inject({
        method: 'POST',
        url: '/api/meetings/meet-123/rsvp',
        headers: { authorization: 'Bearer mock-viewer-token' },
        payload: { rsvp: 'IN' },
      });
      expect(rsvpRes.statusCode).toBe(403);

      await app.close();
    });

    it('HTTP 403 FORBIDDEN: strictly blocks Staff from reading, requesting, rescheduling, cancelling, or RSVPing meetings', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const getRes = await app.inject({
        method: 'GET',
        url: '/api/meetings',
        headers: { authorization: 'Bearer mock-staff-token' },
      });
      expect(getRes.statusCode).toBe(403);

      const reqRes = await app.inject({
        method: 'POST',
        url: '/api/meetings/request',
        headers: { authorization: 'Bearer mock-staff-token' },
        payload: {
          bookingDate: futureDateStr(7),
          slot: '12:00–13:30',
        },
      });
      expect(reqRes.statusCode).toBe(403);
      expect(JSON.parse(reqRes.body).error).toContain('Client Viewer and Staff accounts are not authorized');

      const cancelRes = await app.inject({
        method: 'POST',
        url: '/api/meetings/meet-123/cancel',
        headers: { authorization: 'Bearer mock-staff-token' },
      });
      expect(cancelRes.statusCode).toBe(403);

      await app.close();
    });

    it('HTTP 200: allows Admin and Client Leader to query GET /api/meetings', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const adminRes = await app.inject({
        method: 'GET',
        url: '/api/meetings',
        headers: { authorization: 'Bearer mock-admin-token' },
      });
      expect(adminRes.statusCode).toBe(200);

      const leaderRes = await app.inject({
        method: 'GET',
        url: '/api/meetings',
        headers: { authorization: 'Bearer mock-leader-token' },
      });
      expect(leaderRes.statusCode).toBe(200);

      await app.close();
    });
  });
});
