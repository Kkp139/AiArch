export type MeetingType = 'OFFICE_MEETING' | 'SITE_VISIT';
export type MeetingStatus = 'REQUESTED' | 'CONFIRMED' | 'REJECTED' | 'RESCHEDULE_PENDING' | 'CANCELLED';
export type TimeSlot = 'SLOT_12_00_13_30' | 'SLOT_16_00_17_30' | 'SLOT_18_00_19_30';

export const VALID_SLOTS: TimeSlot[] = [
  'SLOT_12_00_13_30',
  'SLOT_16_00_17_30',
  'SLOT_18_00_19_30',
];

export interface MeetingItem {
  id: string;
  bookingDate: string; // YYYY-MM-DD
  slot: TimeSlot;
  type: MeetingType;
  status: MeetingStatus;
  requestedBy: string;
  approvedBy?: string;
  replacesMeetingId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function isValidSlot(slot: string): slot is TimeSlot {
  return VALID_SLOTS.includes(slot as TimeSlot);
}

export function isFutureDate(dateStr: string): boolean {
  const target = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return target.getTime() >= today.getTime();
}

/**
 * Enforces meeting request RBAC (Master Spec Section 14 + PO Directive)
 * Only ADMIN and CLIENT_LEADER are authorized to request consultation meetings.
 * STAFF and CLIENT_VIEWER are strictly prohibited.
 */
export function isRoleAllowedToRequestMeeting(role: string): boolean {
  return role === 'ADMIN' || role === 'CLIENT_LEADER';
}

/**
 * In-memory / transactional slot collision engine
 * Guarantees that only one meeting booking can occupy a given date & slot globally
 */
export class MeetingReservationEngine {
  private meetings = new Map<string, MeetingItem>();
  // Active slot index: "YYYY-MM-DD#SLOT_XX" -> meetingId
  private activeSlots = new Map<string, string>();

  private getSlotKey(date: string, slot: TimeSlot): string {
    return `${date}#${slot}`;
  }

  async bookSlot(params: {
    bookingDate: string;
    slot: TimeSlot;
    type: MeetingType;
    requestedBy: string;
    notes?: string;
  }): Promise<{ success: boolean; meeting?: MeetingItem; error?: string }> {
    if (!isValidSlot(params.slot)) {
      return { success: false, error: 'Invalid meeting slot' };
    }

    if (!isFutureDate(params.bookingDate)) {
      return { success: false, error: 'Cannot book meetings in the past' };
    }

    const slotKey = this.getSlotKey(params.bookingDate, params.slot);
    if (this.activeSlots.has(slotKey)) {
      return {
        success: false,
        error: `Slot already booked or reserved for date ${params.bookingDate}`,
      };
    }

    const id = `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const meeting: MeetingItem = {
      id,
      bookingDate: params.bookingDate,
      slot: params.slot,
      type: params.type,
      status: 'REQUESTED',
      requestedBy: params.requestedBy,
      notes: params.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.meetings.set(id, meeting);
    this.activeSlots.set(slotKey, id);

    return { success: true, meeting };
  }

  approveMeeting(meetingId: string, approvedBy: string): MeetingItem | null {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return null;

    meeting.status = 'CONFIRMED';
    meeting.approvedBy = approvedBy;
    meeting.updatedAt = new Date();

    // If this meeting was replacing an old meeting, cancel the old meeting now
    if (meeting.replacesMeetingId) {
      const oldMeeting = this.meetings.get(meeting.replacesMeetingId);
      if (oldMeeting) {
        oldMeeting.status = 'CANCELLED';
        oldMeeting.updatedAt = new Date();
        const oldKey = this.getSlotKey(oldMeeting.bookingDate, oldMeeting.slot);
        this.activeSlots.delete(oldKey);
      }
    }

    return meeting;
  }

  async requestReschedule(
    originalMeetingId: string,
    newDate: string,
    newSlot: TimeSlot,
    requestedBy: string
  ): Promise<{ success: boolean; replacementMeeting?: MeetingItem; error?: string }> {
    const original = this.meetings.get(originalMeetingId);
    if (!original) {
      return { success: false, error: 'Original meeting not found' };
    }

    // Book new slot
    const bookResult = await this.bookSlot({
      bookingDate: newDate,
      slot: newSlot,
      type: original.type,
      requestedBy,
      notes: `Reschedule of meeting ${originalMeetingId}`,
    });

    if (!bookResult.success || !bookResult.meeting) {
      return { success: false, error: bookResult.error };
    }

    // Link replacement to original
    bookResult.meeting.replacesMeetingId = originalMeetingId;
    bookResult.meeting.status = 'RESCHEDULE_PENDING';

    // Original meeting remains CONFIRMED until replacement is explicitly approved
    return { success: true, replacementMeeting: bookResult.meeting };
  }

  getMeeting(meetingId: string): MeetingItem | undefined {
    return this.meetings.get(meetingId);
  }
}

export const meetingEngine = new MeetingReservationEngine();
