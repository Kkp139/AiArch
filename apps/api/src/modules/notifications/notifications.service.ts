export type NotificationType =
  | 'DOCUMENT_UPLOADED'
  | 'REVISION_SUBMITTED'
  | 'DESIGN_APPROVED'
  | 'REVISION_REQUESTED'
  | 'MEETING_SCHEDULED'
  | 'MEETING_RESCHEDULED'
  | 'MEETING_REMINDER'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_DISCREPANCY'
  | 'ATTENDANCE_REMINDER'
  | 'CHAT_MESSAGE';

export interface InAppNotification {
  id: string;
  recipientId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

import { notificationQueueService } from '../../lib/queue.service';

export class NotificationsService {
  private notifications: InAppNotification[] = [];

  /**
   * Dispatches a notification:
   * 1. Creates an immediate In-App record (never duplicated).
   * 2. Returns push payload data for the BullMQ push worker queue and enqueues job.
   */
  public createNotification(params: {
    recipientId: string;
    projectId?: string;
    projectCode?: string;
    type: NotificationType;
    title: string;
    message: string;
  }): {
    inAppNotification: InAppNotification;
    pushJob: {
      recipientId: string;
      title: string;
      rawBody: string;
      projectCode: string;
      inAppNotificationId: string;
      attempt: number;
    };
  } {
    const { recipientId, projectId, projectCode = 'GENERAL', type, title, message } = params;

    const inAppNotification: InAppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      recipientId,
      projectId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date(),
    };

    this.notifications.push(inAppNotification);

    const pushJob = {
      recipientId,
      title,
      rawBody: message,
      projectCode,
      inAppNotificationId: inAppNotification.id,
      attempt: 0, // initial attempt
    };

    // Asynchronously dispatch to BullMQ push queue
    notificationQueueService.enqueuePushNotification(pushJob).catch((err) => {
      console.error('[NotificationsService] Failed to enqueue push job:', err);
    });

    return { inAppNotification, pushJob };
  }

  public getNotificationsForUser(recipientId: string): InAppNotification[] {
    return this.notifications
      .filter((n) => n.recipientId === recipientId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public markAsRead(notificationId: string): boolean {
    const notif = this.notifications.find((n) => n.id === notificationId);
    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }
}

export const notificationsService = new NotificationsService();
