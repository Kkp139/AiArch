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

// In-memory temp token store for 2-step OTP flows
const tempTokenStore = new Map<string, { data: any; expiresAt: number }>();

export function createTempToken(data: any, ttlMinutes: number = 10): string {
  const token = 'temp_' + crypto.randomBytes(24).toString('hex');
  const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
  tempTokenStore.set(token, { data, expiresAt });
  return token;
}

export function verifyTempToken(token: string): any | null {
  const record = tempTokenStore.get(token);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    tempTokenStore.delete(token);
    return null;
  }
  return record.data;
}

export function consumeTempToken(token: string): any | null {
  const data = verifyTempToken(token);
  if (data) {
    tempTokenStore.delete(token);
  }
  return data;
}

export interface SeedUser {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';
  mobile: string;
  passwordPlainText: string;
  showPricing: boolean;
  status: 'ACTIVE' | 'DEACTIVATED';
}

export const SEED_USERS: Record<string, SeedUser> = {
  admin: {
    id: 'usr-admin-1',
    username: 'admin',
    fullName: 'Kamal Patel',
    role: 'ADMIN',
    mobile: '+91 98251 00001',
    passwordPlainText: 'admin123',
    showPricing: true,
    status: 'ACTIVE',
  },
  staff: {
    id: 'usr-staff-1',
    username: 'staff',
    fullName: 'Raj Patel',
    role: 'STAFF',
    mobile: '+91 98251 99887',
    passwordPlainText: 'staff123',
    showPricing: false,
    status: 'ACTIVE',
  },
  client_leader: {
    id: 'usr-client-1',
    username: 'client_leader',
    fullName: 'Rajesh Mehta',
    role: 'CLIENT_LEADER',
    mobile: '+91 98765 43210',
    passwordPlainText: 'client123',
    showPricing: true,
    status: 'ACTIVE',
  },
  client_viewer: {
    id: 'usr-viewer-1',
    username: 'client_viewer',
    fullName: 'Pooja Mehta',
    role: 'CLIENT_VIEWER',
    mobile: '+91 98765 11223',
    passwordPlainText: 'viewer123',
    showPricing: false,
    status: 'ACTIVE',
  },
};
