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
  it('allows Admin to sign in with Universal OTP', async () => {
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
    // User Decision: Universal WhatsApp OTP applies to ALL roles including Admin
    expect(body.requireOtp).toBe(true);
    expect(body.tempToken).toBeDefined();

    // Verify OTP for Admin
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: {
        tempToken: body.tempToken,
        otp: '123456',
      },
    });
    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.user.role).toBe('ADMIN');
    expect(verifyBody.token).toBeDefined();
  }, 15000);

  it('allows Admin to create/invite new team members & clients who then log in via 2-Step OTP', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    // 1. Admin logs in with Universal OTP
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    const adminTempToken = JSON.parse(adminLogin.body).tempToken;
    const adminVerify = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: { tempToken: adminTempToken, otp: '123456' },
    });
    const adminToken = JSON.parse(adminVerify.body).token;

    // 2. Admin onboards a new staff member (No permanent password - single-use setup link issued)
    const testUsername = `priya_${Date.now()}`;
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/auth/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        username: testUsername,
        fullName: 'Ar. Priya Sharma',
        role: 'STAFF',
        mobile: '+919876543210',
      },
    });

    expect(createRes.statusCode).toBe(200);
    const createBody = JSON.parse(createRes.body);
    expect(createBody.success).toBe(true);
    expect(createBody.user.username).toBe(testUsername);
    expect(createBody.setupLink).toBeDefined();

    // 3. User completes password setup using single-use link
    const setupRes = await app.inject({
      method: 'POST',
      url: '/api/auth/setup-password',
      payload: {
        setupToken: createBody.setupToken,
        newPassword: 'SecureStaffPassword123!',
      },
    });
    expect(setupRes.statusCode).toBe(200);

    // 4. New staff member attempts Step 1 Login
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: testUsername,
        password: 'SecureStaffPassword123!',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.body);
    expect(loginBody.success).toBe(true);
    expect(loginBody.requireOtp).toBe(true);
    expect(loginBody.tempToken).toBeDefined();
    expect(loginBody.user.fullName).toBe('Ar. Priya Sharma');

    // 5. Step 2: Send OTP
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

    // 6. Step 3: Verify OTP
    const staffVerifyRes = await app.inject({
      method: 'POST',
      url: '/api/auth/verify-otp',
      payload: {
        tempToken: loginBody.tempToken,
        otp: '123456',
      },
    });

    expect(staffVerifyRes.statusCode).toBe(200);
    const staffVerifyBody = JSON.parse(staffVerifyRes.body);
    expect(staffVerifyBody.success).toBe(true);
    expect(staffVerifyBody.user.role).toBe('STAFF');
  });

  it('rejects non-admin from creating users', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/users',
      headers: { authorization: 'Bearer jwt_session_staff' },
      payload: {
        username: 'hacker',
        fullName: 'Hacker',
        role: 'STAFF',
        mobile: '+919999999999',
        password: 'password123',
      },
    });

    expect(response.statusCode).toBe(403);
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

  it('rejects unseeded/unknown username with 401', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: 'unknown_person',
        password: 'somepassword',
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('enforces RBAC on project reassignments (401 unauth, 403 non-admin)', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const unauthRes = await app.inject({
      method: 'PUT',
      url: '/api/auth/users/user-123/assignments',
      payload: { projectIds: ['proj-1'] },
    });
    expect(unauthRes.statusCode).toBe(401);

    const staffRes = await app.inject({
      method: 'PUT',
      url: '/api/auth/users/user-123/assignments',
      headers: { authorization: 'Bearer mock-staff-token' },
      payload: { projectIds: ['proj-1'] },
    });
    expect(staffRes.statusCode).toBe(403);
  });

  it('enforces RBAC on user role updates (401 unauth, 403 non-admin)', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const unauthRes = await app.inject({
      method: 'PATCH',
      url: '/api/auth/users/user-123/role',
      payload: { role: 'CLIENT_LEADER' },
    });
    expect(unauthRes.statusCode).toBe(401);

    const staffRes = await app.inject({
      method: 'PATCH',
      url: '/api/auth/users/user-123/role',
      headers: { authorization: 'Bearer mock-staff-token' },
      payload: { role: 'CLIENT_LEADER' },
    });
    expect(staffRes.statusCode).toBe(403);
  });
});

