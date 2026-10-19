import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function validateAdminDeactivation(activeAdminCount: number): { allowed: boolean; error?: string } {
  if (activeAdminCount <= 1) {
    return {
      allowed: false,
      error: 'Cannot deactivate the last active Admin account',
    };
  }
  return { allowed: true };
}

export function createSetupToken(ttlHours: number = 48): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex'); // 64 hex characters
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  return { token, expiresAt };
}

export function verifySetupToken(token: string, expiresAt: Date): boolean {
  if (!token || token.length < 32) {
    return false;
  }
  return expiresAt.getTime() > Date.now();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
