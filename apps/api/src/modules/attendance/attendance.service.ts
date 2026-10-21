export interface GpsValidationResult {
  valid: boolean;
  error?: string;
}

export function validateGpsCoordinates(lat?: number, lng?: number): GpsValidationResult {
  if (lat === undefined || lng === undefined || typeof lat !== 'number' || typeof lng !== 'number') {
    return {
      valid: false,
      error: 'GPS location is mandatory. Please grant location permissions to record attendance.',
    };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return {
      valid: false,
      error: 'Invalid GPS coordinates format',
    };
  }

  return { valid: true };
}

export function validateClockIn(hasActiveSession: boolean, lat?: number, lng?: number): { allowed: boolean; error?: string } {
  if (hasActiveSession) {
    return {
      allowed: false,
      error: 'Active work session already exists. Clock-Out before starting a new session.',
    };
  }

  const gps = validateGpsCoordinates(lat, lng);
  if (!gps.valid) {
    return { allowed: false, error: gps.error };
  }

  return { allowed: true };
}

export function getScheduledSlotsForSession(params: {
  mode: 'INTERVAL' | 'FIXED_SLOTS';
  intervalHours?: number;
  fixedSlots?: string[];
  clockInAt: Date;
  currentTime: Date;
}): string[] {
  if (params.mode === 'FIXED_SLOTS' && params.fixedSlots) {
    return params.fixedSlots;
  }

  const interval = params.intervalHours || 3;
  const elapsedMs = params.currentTime.getTime() - params.clockInAt.getTime();
  const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));

  const slots: string[] = [];
  for (let h = interval; h <= elapsedHours; h += interval) {
    const slotTime = new Date(params.clockInAt.getTime() + h * 60 * 60 * 1000);
    const timeStr = slotTime.toISOString().substring(11, 16);
    slots.push(`Slot +${h}h (${timeStr})`);
  }

  return slots;
}

export interface ClockOutGateResult {
  allowed: boolean;
  statusCode?: number;
  error?: string;
  pendingSlots: string[];
}

/**
 * Hard Gate: Clock-Out is strictly blocked if any required daily work update for that day is pending
 */
export function validateClockOutWithWorkUpdatesGate(params: {
  scheduledSlots: string[];
  submittedSlots: string[];
  lat?: number;
  lng?: number;
}): ClockOutGateResult {
  const gps = validateGpsCoordinates(params.lat, params.lng);
  if (!gps.valid) {
    return {
      allowed: false,
      statusCode: 400,
      error: gps.error,
      pendingSlots: [],
    };
  }

  const submittedSet = new Set(params.submittedSlots);
  const pendingSlots = params.scheduledSlots.filter(s => !submittedSet.has(s));

  if (pendingSlots.length > 0) {
    return {
      allowed: false,
      statusCode: 422,
      error: `Clock-Out blocked: ${pendingSlots.length} scheduled daily work update(s) are pending. Submitting all scheduled updates is mandatory before end-of-day Clock-Out.`,
      pendingSlots,
    };
  }

  return {
    allowed: true,
    pendingSlots: [],
  };
}
