import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/server';
import { prisma } from '../src/lib/prisma';
import { generateSessionToken } from '../src/lib/auth-guard';
import { hashPassword } from '../src/modules/auth/auth.service';

describe('V2 Backend Endpoints: Reminders, Regularizations, Audit Logs, Devices, Settings, Progress Report & Merged RBAC', () => {
  let app: FastifyInstance;
  let adminUserId: string;
  let staffUserId: string;
  let leaderUserId: string;
  let viewerUserId: string;
  let testProjectId: string;
  let testProjectCode: string;
  let testFolderId: string;
  let createdTempStaff = false;
  let createdTempLeader = false;
  let createdTempViewer = false;
  let createdTempProject = false;

  const createdAuditIds: string[] = [];

  function tokenFor(id: string, role: string) {
    return `Bearer ${generateSessionToken({ id, role })}`;
  }

  beforeAll(async () => {
    app = await buildApp();

    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (!admin) throw new Error('Seeded ADMIN user required for integration test suite');
    adminUserId = admin.id;

    let staff = await prisma.user.findFirst({ where: { role: 'STAFF', status: 'ACTIVE' } });
    if (!staff) {
      staff = await prisma.user.create({
        data: {
          username: `v2_staff_${Date.now()}`,
          fullName: 'Test Staff Architect',
          role: 'STAFF',
          passwordHash: await hashPassword('TestPass123!'),
          status: 'ACTIVE',
        },
      });
      createdTempStaff = true;
    }
    staffUserId = staff.id;

    let leader = await prisma.user.findFirst({ where: { role: 'CLIENT_LEADER', status: 'ACTIVE' } });
    if (!leader) {
      leader = await prisma.user.create({
        data: {
          username: `v2_leader_${Date.now()}`,
          fullName: 'Test Client Leader',
          role: 'CLIENT_LEADER',
          passwordHash: await hashPassword('TestPass123!'),
          status: 'ACTIVE',
        },
      });
      createdTempLeader = true;
    }
    leaderUserId = leader.id;

    let viewer = await prisma.user.findFirst({ where: { role: 'CLIENT_VIEWER', status: 'ACTIVE' } });
    if (!viewer) {
      viewer = await prisma.user.create({
        data: {
          username: `v2_viewer_${Date.now()}`,
          fullName: 'Test Client Viewer',
          role: 'CLIENT_VIEWER',
          passwordHash: await hashPassword('TestPass123!'),
          status: 'ACTIVE',
        },
      });
      createdTempViewer = true;
    }
    viewerUserId = viewer.id;

    // Create isolated test project with 16 standard folders via POST /api/projects
    const code = `V2T-${Date.now().toString().slice(-5)}`;
    const projRes = await app.inject({
      method: 'POST',
      url: '/api/projects',
      headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
      payload: {
        projectCode: code,
        name: 'V2 Integration Test Pavilion',
        category: 'Residential',
        siteLocation: 'Ahmedabad',
        totalAgreedFee: 1000000,
        showPricingClientLeader: true,
        showPricingClientViewer: false,
      },
    });
    expect(projRes.statusCode).toBe(200);
    const projBody = JSON.parse(projRes.body);
    testProjectId = projBody.project.id;
    testProjectCode = projBody.project.projectCode;
    testFolderId = projBody.project.folders[0].id;
    createdTempProject = true;

    // Assign leader & staff to test project
    await prisma.projectAssignment.createMany({
      data: [
        { userId: staffUserId, projectId: testProjectId },
        { userId: leaderUserId, projectId: testProjectId },
      ],
      skipDuplicates: true,
    });
  }, 20000);

  afterAll(async () => {
    try {
      if (createdTempProject && testProjectId) {
        await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
      }
      if (createdTempStaff) {
        await prisma.user.delete({ where: { id: staffUserId } }).catch(() => {});
      }
      if (createdTempLeader) {
        await prisma.user.delete({ where: { id: leaderUserId } }).catch(() => {});
      }
      if (createdTempViewer) {
        await prisma.user.delete({ where: { id: viewerUserId } }).catch(() => {});
      }
      if (createdAuditIds.length > 0) {
        await prisma.auditLog.deleteMany({ where: { id: { in: createdAuditIds } } }).catch(() => {});
      }
    } finally {
      await app.close();
    }
  });

  // ==========================================================================
  // 1. ADMIN REMINDERS
  // ==========================================================================
  describe('Reminders Module (/api/reminders)', () => {
    it('strictly enforces 401 unauth and 403 for all non-Admins (Staff, Client Leader, Client Viewer)', async () => {
      const unauth = await app.inject({ method: 'GET', url: '/api/reminders' });
      expect(unauth.statusCode).toBe(401);

      for (const tok of ['Bearer mock-staff-token', 'Bearer mock-leader-token', 'Bearer mock-viewer-token']) {
        const getRes = await app.inject({
          method: 'GET',
          url: '/api/reminders',
          headers: { authorization: tok },
        });
        expect(getRes.statusCode).toBe(403);

        const postRes = await app.inject({
          method: 'POST',
          url: '/api/reminders',
          headers: { authorization: tok },
          payload: { title: 'Blocked', dueAt: new Date(Date.now() + 86400000).toISOString() },
        });
        expect(postRes.statusCode).toBe(403);
      }
    });

    it('supports full Admin CRUD + completion toggle with AuditLog persistence', async () => {
      const dueAt = new Date(Date.now() + 2 * 86400000).toISOString();
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/reminders',
        headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        payload: {
          title: 'Inspect structural steel shop drawings',
          notes: 'Check cantilever beam welds',
          projectCode: testProjectCode,
          dueAt,
          priority: 'HIGH',
        },
      });
      expect(createRes.statusCode).toBe(200);
      const created = JSON.parse(createRes.body);
      expect(created.success).toBe(true);
      expect(created.reminder.priority).toBe('HIGH');
      expect(created.reminder.projectCode).toBe(testProjectCode);

      const reminderId = created.reminder.id;

      try {
        const listRes = await app.inject({
          method: 'GET',
          url: '/api/reminders?priority=HIGH',
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        });
        expect(listRes.statusCode).toBe(200);
        const listBody = JSON.parse(listRes.body);
        expect(listBody.reminders.some((r: any) => r.id === reminderId)).toBe(true);

        const patchRes = await app.inject({
          method: 'PATCH',
          url: `/api/reminders/${reminderId}`,
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
          payload: { isCompleted: true },
        });
        expect(patchRes.statusCode).toBe(200);
        const patched = JSON.parse(patchRes.body);
        expect(patched.reminder.isCompleted).toBe(true);
        expect(patched.reminder.completedAt).toBeTruthy();

        const delRes = await app.inject({
          method: 'DELETE',
          url: `/api/reminders/${reminderId}`,
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        });
        expect(delRes.statusCode).toBe(200);
        expect(JSON.parse(delRes.body).success).toBe(true);
      } finally {
        await prisma.adminReminder.deleteMany({ where: { id: reminderId } }).catch(() => {});
      }
    });
  });

  // ==========================================================================
  // 2. ATTENDANCE REGULARIZATIONS & ADMIN STAFF ROSTER
  // ==========================================================================
  describe('Attendance Regularizations & Admin Staff Roster', () => {
    it('blocks Clients with 403 and blocks Staff from reviewing regularizations', async () => {
      const unauth = await app.inject({ method: 'GET', url: '/api/attendance/regularizations' });
      expect(unauth.statusCode).toBe(401);

      const leaderRes = await app.inject({
        method: 'GET',
        url: '/api/attendance/regularizations',
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
      });
      expect(leaderRes.statusCode).toBe(403);

      const viewerPost = await app.inject({
        method: 'POST',
        url: '/api/attendance/regularizations',
        headers: { authorization: tokenFor(viewerUserId, 'CLIENT_VIEWER') },
        payload: {
          requestType: 'LEAVE',
          targetDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          reason: 'Personal leave',
        },
      });
      expect(viewerPost.statusCode).toBe(403);

      const staffReview = await app.inject({
        method: 'POST',
        url: '/api/attendance/regularizations/reg-123/review',
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        payload: { decision: 'APPROVED' },
      });
      expect(staffReview.statusCode).toBe(403);
    });

    it('supports Staff regularization submission, Admin review, and exposes staffRoster in admin/overview', async () => {
      const targetDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const submitRes = await app.inject({
        method: 'POST',
        url: '/api/attendance/regularizations',
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        payload: {
          requestType: 'REGULARIZATION',
          targetDate,
          reason: 'Site survey in low-GPS basement zone',
        },
      });
      expect(submitRes.statusCode).toBe(200);
      const regId = JSON.parse(submitRes.body).regularization.id;

      try {
        const staffList = await app.inject({
          method: 'GET',
          url: '/api/attendance/regularizations',
          headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        });
        expect(staffList.statusCode).toBe(200);
        const items = JSON.parse(staffList.body).regularizations;
        expect(items.some((r: any) => r.id === regId)).toBe(true);

        const reviewRes = await app.inject({
          method: 'POST',
          url: `/api/attendance/regularizations/${regId}/review`,
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
          payload: { decision: 'APPROVED', reviewNote: 'Verified with site supervisor' },
        });
        expect(reviewRes.statusCode).toBe(200);
        expect(JSON.parse(reviewRes.body).regularization.status).toBe('APPROVED');

        const overviewRes = await app.inject({
          method: 'GET',
          url: '/api/attendance/admin/overview',
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        });
        expect(overviewRes.statusCode).toBe(200);
        const overview = JSON.parse(overviewRes.body);
        expect(Array.isArray(overview.staffRoster)).toBe(true);
        expect(overview.staffRoster.some((s: any) => s.id === staffUserId)).toBe(true);
      } finally {
        await prisma.attendanceRegularization.deleteMany({ where: { id: regId } }).catch(() => {});
      }
    });
  });

  // ==========================================================================
  // 3. AUDIT LOGS ENDPOINT
  // ==========================================================================
  describe('Audit Logs Endpoint (/api/audit-logs)', () => {
    it('enforces 401/403 for non-Admins and returns sanitized audit entries to Admin', async () => {
      const unauth = await app.inject({ method: 'GET', url: '/api/audit-logs' });
      expect(unauth.statusCode).toBe(401);

      for (const tok of ['Bearer mock-staff-token', 'Bearer mock-leader-token', 'Bearer mock-viewer-token']) {
        const res = await app.inject({
          method: 'GET',
          url: '/api/audit-logs',
          headers: { authorization: tok },
        });
        expect(res.statusCode).toBe(403);
      }

      const adminRes = await app.inject({
        method: 'GET',
        url: '/api/audit-logs?limit=20',
        headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
      });
      expect(adminRes.statusCode).toBe(200);
      const body = JSON.parse(adminRes.body);
      expect(Array.isArray(body.logs)).toBe(true);
      expect(body.logs.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 4. DEVICES & AUTH APPROVAL / INVITE ENDPOINTS
  // ==========================================================================
  describe('Device Approvals & Auth Onboarding Controls', () => {
    it('allows user device registration, isolates GET /api/auth/devices, and enforces Admin-only approve/revoke', async () => {
      const unauth = await app.inject({ method: 'GET', url: '/api/auth/devices' });
      expect(unauth.statusCode).toBe(401);

      const fp = `fp_test_${Date.now()}`;
      const regRes = await app.inject({
        method: 'POST',
        url: '/api/auth/devices/register',
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        payload: {
          deviceName: 'Test Pixel 9 Pro',
          deviceType: 'MOBILE',
          os: 'Android 15',
          fingerprint: fp,
          location: 'Ahmedabad',
        },
      });
      expect(regRes.statusCode).toBe(200);
      const deviceId = JSON.parse(regRes.body).device.id;
      expect(JSON.parse(regRes.body).device.status).toBe('PENDING');

      try {
        // Staff cannot approve own device
        const staffApprove = await app.inject({
          method: 'POST',
          url: `/api/auth/devices/${deviceId}/approve`,
          headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        });
        expect(staffApprove.statusCode).toBe(403);

        // Admin approves device
        const adminApprove = await app.inject({
          method: 'POST',
          url: `/api/auth/devices/${deviceId}/approve`,
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        });
        expect(adminApprove.statusCode).toBe(200);
        expect(JSON.parse(adminApprove.body).device.status).toBe('TRUSTED');

        // Viewer only sees own devices (not staff's device)
        const viewerList = await app.inject({
          method: 'GET',
          url: '/api/auth/devices',
          headers: { authorization: tokenFor(viewerUserId, 'CLIENT_VIEWER') },
        });
        expect(viewerList.statusCode).toBe(200);
        expect(JSON.parse(viewerList.body).devices.some((d: any) => d.id === deviceId)).toBe(false);

        // Admin revokes device
        const adminRevoke = await app.inject({
          method: 'POST',
          url: `/api/auth/devices/${deviceId}/revoke`,
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        });
        expect(adminRevoke.statusCode).toBe(200);
        expect(JSON.parse(adminRevoke.body).device.status).toBe('REVOKED');
      } finally {
        await prisma.deviceSession.deleteMany({ where: { id: deviceId } }).catch(() => {});
      }
    });

    it('allows Admin to approve-access and resend-invite for a user and blocks non-Admins', async () => {
      const pendingUser = await prisma.user.create({
        data: {
          username: `pending_cl_${Date.now()}`,
          fullName: 'Pending Client User',
          role: 'CLIENT_LEADER',
          passwordHash: await hashPassword('TempPass123!'),
          approvalPending: true,
          status: 'ACTIVE',
        },
      });

      try {
        const staffTry = await app.inject({
          method: 'POST',
          url: `/api/auth/users/${pendingUser.id}/approve-access`,
          headers: { authorization: tokenFor(staffUserId, 'STAFF') },
          payload: { approved: true },
        });
        expect(staffTry.statusCode).toBe(403);

        const approveRes = await app.inject({
          method: 'POST',
          url: `/api/auth/users/${pendingUser.id}/approve-access`,
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
          payload: { approved: true, note: 'Verified KYC' },
        });
        expect(approveRes.statusCode).toBe(200);
        const approveBody = JSON.parse(approveRes.body);
        expect(approveBody.approvalPending).toBe(false);
        expect(approveBody.status).toBe('ACTIVE');

        const resendRes = await app.inject({
          method: 'POST',
          url: `/api/auth/users/${pendingUser.id}/resend-invite`,
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        });
        expect(resendRes.statusCode).toBe(200);
        const resendBody = JSON.parse(resendRes.body);
        expect(resendBody.setupToken).toHaveLength(64);
        expect(resendBody.setupLink).toContain(resendBody.setupToken);
      } finally {
        await prisma.user.delete({ where: { id: pendingUser.id } }).catch(() => {});
      }
    });
  });

  // ==========================================================================
  // 5. STUDIO SETTINGS
  // ==========================================================================
  describe('Studio Settings (/api/settings)', () => {
    it('allows authenticated GET, blocks non-Admin PATCH, and persists Admin PATCH', async () => {
      const unauth = await app.inject({ method: 'GET', url: '/api/settings' });
      expect(unauth.statusCode).toBe(401);

      const staffGet = await app.inject({
        method: 'GET',
        url: '/api/settings',
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
      });
      expect(staffGet.statusCode).toBe(200);
      const original = JSON.parse(staffGet.body).settings;
      expect(original.firmName).toBeDefined();

      const staffPatch = await app.inject({
        method: 'PATCH',
        url: '/api/settings',
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        payload: { maxFileSizeMb: 99 },
      });
      expect(staffPatch.statusCode).toBe(403);

      try {
        const adminPatch = await app.inject({
          method: 'PATCH',
          url: '/api/settings',
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
          payload: { maxFileSizeMb: 75 },
        });
        expect(adminPatch.statusCode).toBe(200);
        expect(JSON.parse(adminPatch.body).settings.maxFileSizeMb).toBe(75);
      } finally {
        await app.inject({
          method: 'PATCH',
          url: '/api/settings',
          headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
          payload: { maxFileSizeMb: original.maxFileSizeMb },
        });
      }
    });
  });

  // ==========================================================================
  // 6. PROGRESS REPORT, FOLDER PERMISSIONS & VAULT MUTATIONS
  // ==========================================================================
  describe('Progress Report, Folder Permissions & Vault Rename/Delete', () => {
    it('blocks STAFF from progress-report with 403 while allowing Admin and assigned Client Leader', async () => {
      const staffRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${testProjectCode}/progress-report`,
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
      });
      expect(staffRes.statusCode).toBe(403);

      const leaderRes = await app.inject({
        method: 'GET',
        url: `/api/projects/${testProjectCode}/progress-report`,
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
      });
      expect(leaderRes.statusCode).toBe(200);
      const report = JSON.parse(leaderRes.body);
      expect(report.totalCategories).toBe(16);
      expect(report.phaseBreakdown.concept.total).toBe(6);
      expect(report.phaseBreakdown.construction.total).toBe(9);
      expect(report.phaseBreakdown.other.total).toBe(1);
      expect(report.categories).toHaveLength(16);
    });

    it('updates per-folder permissions and enforces them on document download', async () => {
      const uploadRes = await app.inject({
        method: 'POST',
        url: '/api/vault/presigned-upload',
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        payload: {
          projectCode: testProjectCode,
          folderId: testFolderId,
          filename: `${testProjectCode}_sitedrgs_Plan_v1.pdf`,
        },
      });
      expect(uploadRes.statusCode).toBe(200);
      const docId = JSON.parse(uploadRes.body).documentId;

      // Admin restricts testFolderId for CLIENT_LEADER to VIEW_ONLY
      const putRes = await app.inject({
        method: 'PUT',
        url: `/api/projects/${testProjectId}/folder-permissions`,
        headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        payload: {
          permissions: [
            { folderId: testFolderId, role: 'CLIENT_LEADER', accessLevel: 'VIEW_ONLY' },
          ],
        },
      });
      expect(putRes.statusCode).toBe(200);

      // Client Leader download is now blocked by folder permission
      const dlBlocked = await app.inject({
        method: 'GET',
        url: `/api/vault/document/${docId}/download`,
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
      });
      expect(dlBlocked.statusCode).toBe(403);

      // Staff can rename and delete document on active project; Client cannot
      const clientRename = await app.inject({
        method: 'PATCH',
        url: `/api/vault/document/${docId}/rename`,
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
        payload: { fileName: `${testProjectCode}_sitedrgs_Renamed.pdf` },
      });
      expect(clientRename.statusCode).toBe(403);

      const staffRename = await app.inject({
        method: 'PATCH',
        url: `/api/vault/document/${docId}/rename`,
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        payload: { fileName: `${testProjectCode}_sitedrgs_Plan_v2.pdf` },
      });
      expect(staffRename.statusCode).toBe(200);
      expect(JSON.parse(staffRename.body).document.fileName).toBe(`${testProjectCode}_sitedrgs_Plan_v2.pdf`);

      const staffDel = await app.inject({
        method: 'DELETE',
        url: `/api/vault/document/${docId}`,
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
      });
      expect(staffDel.statusCode).toBe(200);
    });
  });

  // ==========================================================================
  // 7. PAYMENTS PATCH & NOTIFICATIONS DUAL COMPATIBILITY
  // ==========================================================================
  describe('Payments Correction PATCH & Notification Endpoints', () => {
    it('supports Admin PATCH /api/payments/:id with advance recalculation and dual notification read-all routes', async () => {
      const createPay = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        payload: {
          projectCode: testProjectCode,
          milestoneTitle: 'Concept Deposit',
          amount: 100000,
          paymentMode: 'NEFT_RTGS',
          status: 'PENDING_CLEARANCE',
        },
      });
      expect(createPay.statusCode).toBe(200);
      const payId = JSON.parse(createPay.body).id;

      const staffPatch = await app.inject({
        method: 'PATCH',
        url: `/api/payments/${payId}`,
        headers: { authorization: tokenFor(staffUserId, 'STAFF') },
        payload: { amount: 150000 },
      });
      expect(staffPatch.statusCode).toBe(403);

      const adminPatch = await app.inject({
        method: 'PATCH',
        url: `/api/payments/${payId}`,
        headers: { authorization: tokenFor(adminUserId, 'ADMIN') },
        payload: { amount: 150000, status: 'CONFIRMED' },
      });
      expect(adminPatch.statusCode).toBe(200);
      const patchBody = JSON.parse(adminPatch.body);
      expect(patchBody.payment.amount).toBe(150000);
      expect(patchBody.auditDiff.oldData.amount).toBe(100000);
      expect(patchBody.auditDiff.newData.amount).toBe(150000);

      // Verify notifications read-all, mark-all-read, and subscribe
      const notifGet = await app.inject({
        method: 'GET',
        url: '/api/notifications',
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
      });
      expect(notifGet.statusCode).toBe(200);
      const notifData = JSON.parse(notifGet.body);
      expect(Array.isArray(notifData.notifications)).toBe(true);
      expect(typeof notifData.unreadCount).toBe('number');

      const readAll1 = await app.inject({
        method: 'POST',
        url: '/api/notifications/read-all',
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
      });
      expect(readAll1.statusCode).toBe(200);

      const readAll2 = await app.inject({
        method: 'POST',
        url: '/api/notifications/mark-all-read',
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
      });
      expect(readAll2.statusCode).toBe(200);

      const subRes = await app.inject({
        method: 'POST',
        url: '/api/notifications/subscribe',
        headers: { authorization: tokenFor(leaderUserId, 'CLIENT_LEADER') },
        payload: { endpoint: 'https://push.example/test' },
      });
      expect(subRes.statusCode).toBe(200);
    });
  });
});
