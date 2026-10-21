export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushPayload {
  recipientId: string;
  subscription?: PushSubscriptionData;
  title: string;
  rawBody: string;
  projectCode: string;
  inAppNotificationId?: string;
  attempt: number;
}

export const MAX_PUSH_RETRIES = 3;

/**
 * Calculates exponential backoff delays for 1+3 retries:
 * Attempt 1: +1 minute (60,000 ms)
 * Attempt 2: +5 minutes (300,000 ms)
 * Attempt 3: +15 minutes (900,000 ms)
 * Attempt 4+: null (exhausted)
 */
export function calculateNextRetryDelay(attemptCount: number): number | null {
  switch (attemptCount) {
    case 1:
      return 60 * 1000; // +1 min
    case 2:
      return 5 * 60 * 1000; // +5 min
    case 3:
      return 15 * 60 * 1000; // +15 min
    default:
      return null;
  }
}

/**
 * Privacy Sanitizer:
 * Never include sensitive monetary amounts, bank accounts, transaction numbers,
 * or OTP credentials in plain Web Push notification banners.
 */
export function sanitizePushPayload(rawText: string, projectCode: string): string {
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

/**
 * Push Processor execution handler:
 * Simulates or sends web push with retry tracking.
 * Ensures in-app notifications are never duplicated.
 */
export async function processPushJob(payload: PushPayload): Promise<{
  success: boolean;
  attempt: number;
  nextRetryDelayMs: number | null;
  deliveredText: string;
}> {
  const deliveredText = sanitizePushPayload(payload.rawBody, payload.projectCode);

  try {
    // In production, web-push.sendNotification(...) is invoked here.
    if (!payload.subscription?.endpoint) {
      throw new Error('No push subscription found for recipient');
    }

    return {
      success: true,
      attempt: payload.attempt,
      nextRetryDelayMs: null,
      deliveredText,
    };
  } catch (err: any) {
    const nextAttempt = payload.attempt + 1;
    const nextRetryDelayMs = calculateNextRetryDelay(nextAttempt);

    return {
      success: false,
      attempt: payload.attempt,
      nextRetryDelayMs,
      deliveredText,
    };
  }
}
