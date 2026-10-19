import crypto from 'crypto';

interface OtpRecord {
  code: string;
  expiresAt: number;
}

// In-memory / Redis cache for OTP store (10 minute TTL)
const otpStore = new Map<string, OtpRecord>();

export function generateOtp(identifier: string, ttlSeconds: number = 600): string {
  // Generate cryptographically secure 6-digit numeric OTP
  const code = crypto.randomInt(100000, 999999).toString();
  const expiresAt = Date.now() + ttlSeconds * 1000;

  otpStore.set(identifier, { code, expiresAt });
  return code;
}

export function verifyOtp(identifier: string, code: string): boolean {
  const record = otpStore.get(identifier);
  if (!record) {
    return false;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(identifier);
    return false;
  }

  if (record.code !== code) {
    return false;
  }

  // Consume OTP to prevent replay attacks
  otpStore.delete(identifier);
  return true;
}

export function clearOtp(identifier: string): void {
  otpStore.delete(identifier);
}
