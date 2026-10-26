import { Queue } from 'bullmq';

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushNotificationJob {
  recipientId: string;
  subscription?: PushSubscriptionData;
  title: string;
  rawBody: string;
  projectCode: string;
  inAppNotificationId?: string;
  attempt?: number;
}

/**
 * Privacy Sanitizer (Section 15.3):
 * Strips monetary figures, bank accounts, and OTP secrets before push notification dispatch.
 */
export function sanitizePushText(rawText: string, projectCode: string): string {
  const isPaymentSensitive =
    /(?:Rs\.?|₹|INR|\bpayment\b|\bneft\b|\brtgs\b|\bcheque\b|\butr\b|\bbank\b)/i.test(rawText) &&
    /[\d,]+/.test(rawText);

  if (isPaymentSensitive) {
    return `A payment update has been recorded for Project ${projectCode}. Log in to view details.`;
  }

  const isOtpSensitive = /(?:otp|password|credential|code)/i.test(rawText) && /\d{4,8}/.test(rawText);
  if (isOtpSensitive) {
    return `A security verification request has occurred for Project ${projectCode}. Log in to view details.`;
  }

  return rawText;
}

export class NotificationQueueService {
  private bullQueue: Queue | null = null;
  private inMemoryQueue: PushNotificationJob[] = [];
  private dispatchedJobs: PushNotificationJob[] = [];
  private isRedisEnabled: boolean = false;

  constructor() {
    this.initQueue();
  }

  private initQueue() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl && redisUrl.startsWith('redis') && process.env.NODE_ENV !== 'test') {
      try {
        this.bullQueue = new Queue('push-retry-queue', {
          connection: { url: redisUrl },
          defaultJobOptions: {
            attempts: 4, // 1 initial + 3 retries
            backoff: {
              type: 'exponential',
              delay: 60 * 1000, // +1m, +5m, +15m handled by worker
            },
            removeOnComplete: true,
          },
        });
        this.isRedisEnabled = true;
      } catch (err) {
        console.warn('[QueueService] Redis connection initialization failed, falling back to in-memory queue:', err);
        this.bullQueue = null;
        this.isRedisEnabled = false;
      }
    }
  }

  /**
   * Enqueues a single push notification job
   */
  async enqueuePushNotification(job: PushNotificationJob): Promise<{ success: boolean; enqueued: boolean; inMemory: boolean }> {
    const sanitizedBody = sanitizePushText(job.rawBody, job.projectCode);
    const sanitizedJob: PushNotificationJob = {
      ...job,
      rawBody: sanitizedBody,
      attempt: job.attempt ?? 0,
    };

    this.dispatchedJobs.push(sanitizedJob);

    if (this.bullQueue && this.isRedisEnabled) {
      try {
        await this.bullQueue.add('send-push', sanitizedJob);
        return { success: true, enqueued: true, inMemory: false };
      } catch (err) {
        console.error('[QueueService] Failed to enqueue into BullMQ, storing in fallback in-memory queue:', err);
        this.inMemoryQueue.push(sanitizedJob);
        return { success: true, enqueued: false, inMemory: true };
      }
    } else {
      this.inMemoryQueue.push(sanitizedJob);
      return { success: true, enqueued: true, inMemory: true };
    }
  }

  /**
   * Enqueues a batch of push notifications (e.g. for studio announcements or circulars)
   */
  async enqueueBatchPushNotifications(jobs: PushNotificationJob[]): Promise<{ count: number; success: boolean }> {
    for (const job of jobs) {
      await this.enqueuePushNotification(job);
    }
    return { count: jobs.length, success: true };
  }

  /**
   * Inspection helper for unit tests and local telemetry
   */
  getEnqueuedPushJobs(): PushNotificationJob[] {
    return [...this.dispatchedJobs];
  }

  /**
   * Reset helper for test cleanup
   */
  clearEnqueuedPushJobs(): void {
    this.inMemoryQueue = [];
    this.dispatchedJobs = [];
  }

  /**
   * Cleanly closes BullMQ connection if active
   */
  async close(): Promise<void> {
    if (this.bullQueue) {
      await this.bullQueue.close();
      this.bullQueue = null;
      this.isRedisEnabled = false;
    }
  }
}

export const notificationQueueService = new NotificationQueueService();
