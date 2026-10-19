import { describe, it, expect } from 'vitest';
import {
  validateGpsCoordinates,
  validateClockIn,
  validateClockOutWithWorkUpdatesGate,
  getScheduledSlotsForSession,
} from '../src/modules/attendance/attendance.service';

describe('Staff Attendance & Daily Work Updates Clock-Out Hard Gate', () => {
  it('strictly mandates GPS coordinates for punching (lat, lng)', () => {
    // Valid GPS coordinates
    const valid = validateGpsCoordinates(23.0225, 72.5714);
    expect(valid.valid).toBe(true);

    // Missing GPS coordinates
    const missing = validateGpsCoordinates(undefined as any, undefined as any);
    expect(missing.valid).toBe(false);
    expect(missing.error).toContain('GPS location is mandatory');
  });

  it('prevents duplicate Clock-In when an active work session already exists', () => {
    const hasActiveSession = true;
    const punchCheck = validateClockIn(hasActiveSession, 23.0225, 72.5714);
    expect(punchCheck.allowed).toBe(false);
    expect(punchCheck.error).toContain('Active work session already exists');
  });

  it('calculates scheduled daily work update slots for interval or fixed mode', () => {
    // Interval mode: clock-in at 9:00 AM, current time 18:00 (9 hours elapsed), interval = 3 hours
    // Expected slots at: +3h (12:00), +6h (15:00), +9h (18:00)
    const clockInAt = new Date('2026-10-19T09:00:00Z');
    const currentTime = new Date('2026-10-19T18:00:00Z');

    const slots = getScheduledSlotsForSession({
      mode: 'INTERVAL',
      intervalHours: 3,
      clockInAt,
      currentTime,
    });

    expect(slots.length).toBe(3);
    expect(slots).toEqual(['Slot +3h (12:00)', 'Slot +6h (15:00)', 'Slot +9h (18:00)']);
  });

  it('CLOCK-OUT HARD GATE: strictly blocks Clock-Out if any required daily work update is missing', () => {
    const scheduledSlots = ['Slot 13:00', 'Slot 17:30'];
    const submittedSlots = ['Slot 13:00']; // Only 1 submitted, 1 missing!

    const gateResult = validateClockOutWithWorkUpdatesGate({
      scheduledSlots,
      submittedSlots,
      lat: 23.0225,
      lng: 72.5714,
    });

    expect(gateResult.allowed).toBe(false);
    expect(gateResult.statusCode).toBe(422);
    expect(gateResult.error).toContain('Clock-Out blocked');
    expect(gateResult.pendingSlots).toEqual(['Slot 17:30']);
  });

  it('CLOCK-OUT HARD GATE: allows Clock-Out when all scheduled daily work updates are submitted', () => {
    const scheduledSlots = ['Slot 13:00', 'Slot 17:30'];
    const submittedSlots = ['Slot 13:00', 'Slot 17:30']; // All submitted!

    const gateResult = validateClockOutWithWorkUpdatesGate({
      scheduledSlots,
      submittedSlots,
      lat: 23.0225,
      lng: 72.5714,
    });

    expect(gateResult.allowed).toBe(true);
    expect(gateResult.pendingSlots).toEqual([]);
  });
});
