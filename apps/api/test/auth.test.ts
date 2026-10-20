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

describe('Full-Stack Auth Controller API Routes', () => {
  it('allows Admin to sign in directly without OTP', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'admin',
        password: 'admin123',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.requireOtp).toBe(false);
    expect(body.user.role).toBe('ADMIN');
    expect(body.token).toBeDefined();
  });

  it('routes Staff through 2-Step OTP flow', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    // Step 1: Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'staff',
        password: 'staff123',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.body);
    expect(loginBody.success).toBe(true);
    expect(loginBody.requireOtp).toBe(true);
    expect(loginBody.tempToken).toBeDefined();
    expect(loginBody.user.role).toBe('STAFF');

    // Step 2: Send OTP
    const otpRes = await app.inject({
      method: 'POST',
      url: '/api/auth/send-otp',
      payload: {
        tempToken: loginBody.tempToken,
        fullName: loginBody.user.fullName,
        mobile: loginBody.user.mobile,
      },
    });

    expect(otpRes.statusCode).toBe(200);
    const otpBody = JSON.parse(otpRes.body);
    expect(otpBody.success).toBe(true);
    expect(otpBody.debugOtp).toBe('123456');

    // Step 3: Verify OTP with fixed test OTP 123456
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: {
        tempToken: loginBody.tempToken,
        otp: '123456',
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.token).toBeDefined();
    expect(verifyBody.user.role).toBe('STAFF');
  });

  it('rejects incorrect passwords with 401', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'admin',
        password: 'wrongpassword',
      },
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body);
    expect(body.error).toContain('Invalid username or password');
  });

  it('rejects incorrect OTPs with 401', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'client_leader',
        password: 'client123',
      },
    });
    const { tempToken } = JSON.parse(loginRes.body);

    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: {
        tempToken,
        otp: '000000',
      },
    });

    expect(verifyRes.statusCode).toBe(401);
    const body = JSON.parse(verifyRes.body);
    expect(body.error).toContain('Invalid or expired verification code');
  });
});
