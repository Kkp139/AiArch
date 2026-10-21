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
    fullName: 'Farhaz Admin',
    role: 'ADMIN',
    mobile: '+91 98251 00001',
    passwordPlainText: 'admin123',
    showPricing: true,
    status: 'ACTIVE',
  },
};

export function createUser(userData: {
  username: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';
  mobile: string;
  passwordPlainText: string;
  showPricing?: boolean;
}): SeedUser {
  const normalizedUsername = userData.username.trim().toLowerCase();
  if (SEED_USERS[normalizedUsername]) {
    throw new Error('A user with this username already exists.');
  }

  const newUser: SeedUser = {
    id: `usr-${userData.role.toLowerCase()}-${Date.now()}`,
    username: normalizedUsername,
    fullName: userData.fullName.trim(),
    role: userData.role,
    mobile: userData.mobile.trim(),
    passwordPlainText: userData.passwordPlainText,
    showPricing: userData.showPricing ?? (userData.role !== 'CLIENT_VIEWER' && userData.role !== 'STAFF'),
    status: 'ACTIVE',
  };

  SEED_USERS[normalizedUsername] = newUser;
  return newUser;
}

export function listUsers(): SeedUser[] {
  return Object.values(SEED_USERS);
}
