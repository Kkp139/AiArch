export interface DailyWorkUpdateDto {
  userId: string;
  projectId: string;
  attendanceId: string;
  workSummary: string;
  scheduledSlot: string;
}

export class WorkUpdatesService {
  private updates: DailyWorkUpdateDto[] = [];

  submitUpdate(update: DailyWorkUpdateDto) {
    this.updates.push(update);
    return {
      success: true,
      message: 'Daily work update submitted successfully.',
      update,
    };
  }

  getSubmittedSlotsForSession(attendanceId: string): string[] {
    return this.updates
      .filter(u => u.attendanceId === attendanceId)
      .map(u => u.scheduledSlot);
  }
}

export const workUpdatesService = new WorkUpdatesService();
