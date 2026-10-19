import { describe, it, expect } from 'vitest';
import {
  MeetingReservationEngine,
  isValidSlot,
  isFutureDate,
} from '../src/modules/meetings/meetings.service';

describe('Meeting Management & Atomic Slot Concurrency', () => {
  it('validates the 3 fixed time slots and rejects invalid times', () => {
    expect(isValidSlot('SLOT_12_00_13_30')).toBe(true);
    expect(isValidSlot('SLOT_16_00_17_30')).toBe(true);
    expect(isValidSlot('SLOT_18_00_19_30')).toBe(true);
    expect(isValidSlot('SLOT_10_00_11_30')).toBe(false);
  });

  it('rejects booking past dates', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    expect(isFutureDate(yesterday)).toBe(false);
    expect(isFutureDate(tomorrow)).toBe(true);
  });

  it('ATOMIC COLLISION LOCK: allows first booking and strictly rejects overlapping booking for same date/slot', async () => {
    const engine = new MeetingReservationEngine();
    const date = '2026-11-15';
    const slot = 'SLOT_12_00_13_30';

    // First request
    const book1 = await engine.bookSlot({
      bookingDate: date,
      slot,
      type: 'OFFICE_MEETING',
      requestedBy: 'client-leader-1',
    });
    expect(book1.success).toBe(true);
    expect(book1.meeting?.status).toBe('REQUESTED');

    // Second concurrent request for same date and slot
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
    const originalDate = '2026-11-20';
    const newDate = '2026-11-21';
    const slot = 'SLOT_16_00_17_30';

    // 1. Initial approved meeting
    const initial = await engine.bookSlot({
      bookingDate: originalDate,
      slot,
      type: 'OFFICE_MEETING',
      requestedBy: 'client-leader-1',
    });
    engine.approveMeeting(initial.meeting!.id, 'admin-1');

    // 2. Client submits reschedule request
    const reschedule = await engine.requestReschedule(initial.meeting!.id, newDate, slot, 'client-leader-1');
    expect(reschedule.success).toBe(true);

    // 3. Old meeting is still CONFIRMED while reschedule is RESCHEDULE_PENDING
    const oldMeeting = engine.getMeeting(initial.meeting!.id);
    expect(oldMeeting?.status).toBe('CONFIRMED');

    // 4. Once admin approves replacement, old meeting is updated and new confirmed
    engine.approveMeeting(reschedule.replacementMeeting!.id, 'admin-1');
    const oldMeetingAfter = engine.getMeeting(initial.meeting!.id);
    expect(oldMeetingAfter?.status).toBe('CANCELLED');

    const newMeetingAfter = engine.getMeeting(reschedule.replacementMeeting!.id);
    expect(newMeetingAfter?.status).toBe('CONFIRMED');
  });
});
