import { describe, it, expect } from 'vitest';
import { generateOtp, verifyOtp } from '../src/modules/auth/otp.service';
import { validateAdminDeactivation, createSetupToken, verifySetupToken } from '../src/modules/auth/auth.service';
import { checkRoleAccess } from '../src/middleware/rbac.middleware';

describe('Auth, RBAC & OTP Security Rules', () => {
  it('strictly blocks deactivating the last active Admin account', () => {
    // When only 1 active admin exists
    const canDeactivate = validateAdminDeactivation(1);
    expect(canDeactivate.allowed).toBe(false);
    expect(canDeactivate.error).toBe('Cannot deactivate the last active Admin account');

    // When 2 or more active admins exist
    const canDeactivateMultiple = validateAdminDeactivation(2);
    expect(canDeactivateMultiple.allowed).toBe(true);
  });

  it('generates a 6-digit OTP and verifies it with 1-time consumption', () => {
    const mobile = '+919876543210';
    const otp = generateOtp(mobile);
    expect(otp).toHaveLength(6);
    expect(/^\d{6}$/.test(otp)).toBe(true);

    // Correct verification
    const isValid = verifyOtp(mobile, otp);
    expect(isValid).toBe(true);

    // Second attempt fails (consumed / single-use)
    const isReused = verifyOtp(mobile, otp);
    expect(isReused).toBe(false);
  });

  it('rejects incorrect OTPs', () => {
    const mobile = '+919999988888';
    generateOtp(mobile);
    const isValid = verifyOtp(mobile, '000000');
    expect(isValid).toBe(false);
  });

  it('creates single-use time-limited setup token for secure credential onboarding', () => {
    const { token, expiresAt } = createSetupToken();
    expect(token).toHaveLength(64);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const verified = verifySetupToken(token, expiresAt);
    expect(verified).toBe(true);

    // Expired token check
    const pastDate = new Date(Date.now() - 1000);
    const expired = verifySetupToken(token, pastDate);
    expect(expired).toBe(false);
  });

  it('enforces RBAC role restrictions correctly', () => {
    // Admin has access to all
    expect(checkRoleAccess('ADMIN', ['ADMIN', 'STAFF'])).toBe(true);
    expect(checkRoleAccess('ADMIN', ['CLIENT_LEADER'])).toBe(true);

    // Staff cannot access Admin-only routes
    expect(checkRoleAccess('STAFF', ['ADMIN'])).toBe(false);

    // Client Viewer cannot access Client Leader routes
    expect(checkRoleAccess('CLIENT_VIEWER', ['CLIENT_LEADER'])).toBe(false);

    // Client Leader can access Client Leader routes
    expect(checkRoleAccess('CLIENT_LEADER', ['CLIENT_LEADER'])).toBe(true);
  });
});
