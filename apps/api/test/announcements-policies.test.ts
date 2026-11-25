import { describe, it, expect } from 'vitest';
import { canUserReadAnnouncement, getAudiencesForRole } from '../src/modules/announcements/announcements.service';
import { AnnouncementAudience, UserRole } from '@prisma/client';

describe('Announcements & Studio Policies System (Master Spec Section 9)', () => {
  describe('Audience-based Access Control', () => {
    it('allows ALL authenticated roles to read announcements with audience=ALL', () => {
      expect(canUserReadAnnouncement(UserRole.ADMIN, AnnouncementAudience.ALL)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.STAFF, AnnouncementAudience.ALL)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.CLIENT_LEADER, AnnouncementAudience.ALL)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.CLIENT_VIEWER, AnnouncementAudience.ALL)).toBe(true);
    });

    it('restricts STAFF-audience announcements to Staff and Admin only', () => {
      expect(canUserReadAnnouncement(UserRole.STAFF, AnnouncementAudience.STAFF)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.ADMIN, AnnouncementAudience.STAFF)).toBe(true);

      // Clients cannot see internal staff announcements
      expect(canUserReadAnnouncement(UserRole.CLIENT_LEADER, AnnouncementAudience.STAFF)).toBe(false);
      expect(canUserReadAnnouncement(UserRole.CLIENT_VIEWER, AnnouncementAudience.STAFF)).toBe(false);
    });

    it('restricts CLIENT_LEADERS-audience announcements to Client Leaders and Admin only', () => {
      expect(canUserReadAnnouncement(UserRole.CLIENT_LEADER, AnnouncementAudience.CLIENT_LEADERS)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.ADMIN, AnnouncementAudience.CLIENT_LEADERS)).toBe(true);

      expect(canUserReadAnnouncement(UserRole.STAFF, AnnouncementAudience.CLIENT_LEADERS)).toBe(false);
      expect(canUserReadAnnouncement(UserRole.CLIENT_VIEWER, AnnouncementAudience.CLIENT_LEADERS)).toBe(false);
    });

    it('restricts CLIENT_VIEWERS-audience announcements to Client Viewers and Admin only', () => {
      expect(canUserReadAnnouncement(UserRole.CLIENT_VIEWER, AnnouncementAudience.CLIENT_VIEWERS)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.ADMIN, AnnouncementAudience.CLIENT_VIEWERS)).toBe(true);

      expect(canUserReadAnnouncement(UserRole.STAFF, AnnouncementAudience.CLIENT_VIEWERS)).toBe(false);
      expect(canUserReadAnnouncement(UserRole.CLIENT_LEADER, AnnouncementAudience.CLIENT_VIEWERS)).toBe(false);
    });

    it('returns correct audience query filters per user role', () => {
      const adminFilters = getAudiencesForRole(UserRole.ADMIN);
      expect(adminFilters).toHaveLength(4);

      const staffFilters = getAudiencesForRole(UserRole.STAFF);
      expect(staffFilters).toContain(AnnouncementAudience.ALL);
      expect(staffFilters).toContain(AnnouncementAudience.STAFF);
      expect(staffFilters).not.toContain(AnnouncementAudience.CLIENT_LEADERS);

      const clientLeaderFilters = getAudiencesForRole(UserRole.CLIENT_LEADER);
      expect(clientLeaderFilters).toContain(AnnouncementAudience.ALL);
      expect(clientLeaderFilters).toContain(AnnouncementAudience.CLIENT_LEADERS);
      expect(clientLeaderFilters).not.toContain(AnnouncementAudience.STAFF);

      const clientViewerFilters = getAudiencesForRole(UserRole.CLIENT_VIEWER);
      expect(clientViewerFilters).toContain(AnnouncementAudience.ALL);
      expect(clientViewerFilters).toContain(AnnouncementAudience.CLIENT_VIEWERS);
    });
  });

  describe('HTTP Fastify Route Security & RBAC', () => {
    it('HTTP 401: rejects unauthenticated requests to announcements and policies', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const resAnn = await app.inject({ method: 'GET', url: '/api/announcements' });
      expect(resAnn.statusCode).toBe(401);

      const resPol = await app.inject({ method: 'GET', url: '/api/policies' });
      expect(resPol.statusCode).toBe(401);

      await app.close();
    });

    it('HTTP 403 FORBIDDEN: strictly blocks non-Admin from publishing announcements', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/announcements',
        headers: { authorization: 'Bearer mock-staff-token' },
        payload: {
          title: 'Unauthorized Circular',
          body: 'Staff should not be able to publish studio circulars.',
        },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toContain('Only studio Admins can publish announcements');

      await app.close();
    });

    it('HTTP 403 FORBIDDEN: strictly blocks non-Admin from publishing studio policies', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/policies',
        headers: { authorization: 'Bearer mock-leader-token' },
        payload: {
          title: 'Unauthorized Policy',
          content: 'Clients cannot publish studio policies.',
        },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toContain('Only studio Admins can publish studio policies');

      await app.close();
    });
  });

  describe('Web Push Notification Queue Integration (BullMQ & Resilient Fallback)', () => {
    it('enqueues push notification jobs with privacy sanitization', async () => {
      const { notificationQueueService, sanitizePushText } = await import('../src/lib/queue.service');
      notificationQueueService.clearEnqueuedPushJobs();

      // Test privacy sanitizer directly
      const paymentMsg = 'Payment of Rs 1,50,000 received for Project A';
      expect(sanitizePushText(paymentMsg, 'PROJ-A')).toBe('A payment update has been recorded for Project PROJ-A. Log in to view details.');

      const normalMsg = 'Studio meeting scheduled at 4:00 PM';
      expect(sanitizePushText(normalMsg, 'PROJ-A')).toBe(normalMsg);

      // Enqueue push notification
      const result = await notificationQueueService.enqueuePushNotification({
        recipientId: 'user-staff-1',
        title: 'New Studio Policy Published',
        rawBody: 'Payment of Rs 25,000 allowance policy update',
        projectCode: 'STUDIO',
      });

      expect(result.success).toBe(true);
      const enqueued = notificationQueueService.getEnqueuedPushJobs();
      expect(enqueued.length).toBeGreaterThan(0);
      expect(enqueued[0].recipientId).toBe('user-staff-1');
      expect(enqueued[0].rawBody).toBe('A payment update has been recorded for Project STUDIO. Log in to view details.');
    });

    it('enqueues batch push notifications for multiple recipients', async () => {
      const { notificationQueueService } = await import('../src/lib/queue.service');
      notificationQueueService.clearEnqueuedPushJobs();

      const batchResult = await notificationQueueService.enqueueBatchPushNotifications([
        {
          recipientId: 'user-1',
          title: 'Office Circular',
          rawBody: 'Diwali studio holiday schedule announced',
          projectCode: 'GENERAL',
        },
        {
          recipientId: 'user-2',
          title: 'Office Circular',
          rawBody: 'Diwali studio holiday schedule announced',
          projectCode: 'GENERAL',
        },
      ]);

      expect(batchResult.success).toBe(true);
      expect(batchResult.count).toBe(2);
      expect(notificationQueueService.getEnqueuedPushJobs()).toHaveLength(2);
    });
  });
});

