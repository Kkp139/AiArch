export interface MeetingReminderJobData {
  meetingId: string;
  projectId: string;
  projectCode: string;
  slotTime: string;
  participantIds: string[];
}

export interface AttendanceReminderJobData {
  staffId: string;
  staffName: string;
  scheduledSlot: string;
}

/**
 * Generates meeting reminder notification (1 hour prior to scheduled slot)
 */
export function buildMeetingReminderPayload(data: MeetingReminderJobData): {
  title: string;
  body: string;
  inAppText: string;
} {
  return {
    title: `Upcoming Meeting - Project ${data.projectCode}`,
    body: `Your architectural consultation meeting for Project ${data.projectCode} is scheduled in 1 hour at ${data.slotTime}.`,
    inAppText: `Meeting starts in 1 hour for Project ${data.projectCode} (${data.slotTime}).`,
  };
}

/**
 * Generates daily work update reminder for staff
 */
export function buildAttendanceReminderPayload(data: AttendanceReminderJobData): {
  title: string;
  body: string;
  inAppText: string;
} {
  return {
    title: 'Daily Work Update Scheduled',
    body: `Hi ${data.staffName}, your scheduled work status update for ${data.scheduledSlot} is due now.`,
    inAppText: `Scheduled daily work update is due for ${data.scheduledSlot}.`,
  };
}
