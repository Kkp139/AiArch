import { describe, it, expect } from 'vitest';
import {
  computeEffectiveTargetStatus,
  validateTargetStatusTransition,
} from '../src/modules/targets/targets.service';
import { TargetStatus, UserRole } from '@prisma/client';

describe('Staff Targets & Productivity Management (Master Spec Section 10.2)', () => {
  describe('Status Computation & Overdue Enforcement', () => {
    it('accurately computes target as OVERDUE if due date is in the past and status is not COMPLETED', () => {
      const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      expect(computeEffectiveTargetStatus(TargetStatus.PENDING, pastDate)).toBe(TargetStatus.OVERDUE);
      expect(computeEffectiveTargetStatus(TargetStatus.IN_PROGRESS, pastDate)).toBe(TargetStatus.OVERDUE);
      expect(computeEffectiveTargetStatus(TargetStatus.SUBMITTED, pastDate)).toBe(TargetStatus.OVERDUE);
    });

    it('preserves COMPLETED status even if due date is in the past', () => {
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      expect(computeEffectiveTargetStatus(TargetStatus.COMPLETED, pastDate)).toBe(TargetStatus.COMPLETED);
    });

    it('preserves active statuses when due date is in the future', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
      expect(computeEffectiveTargetStatus(TargetStatus.PENDING, futureDate)).toBe(TargetStatus.PENDING);
      expect(computeEffectiveTargetStatus(TargetStatus.IN_PROGRESS, futureDate)).toBe(TargetStatus.IN_PROGRESS);
      expect(computeEffectiveTargetStatus(TargetStatus.SUBMITTED, futureDate)).toBe(TargetStatus.SUBMITTED);
    });
  });

  describe('RBAC & State Machine Transitions', () => {
    it('strictly forbids Client Leader and Client Viewer from modifying targets', () => {
      const clientLeaderRes = validateTargetStatusTransition(
        UserRole.CLIENT_LEADER,
        TargetStatus.PENDING,
        TargetStatus.IN_PROGRESS
      );
      expect(clientLeaderRes.allowed).toBe(false);
      expect(clientLeaderRes.error).toContain('Clients cannot access');

      const clientViewerRes = validateTargetStatusTransition(
        UserRole.CLIENT_VIEWER,
        TargetStatus.IN_PROGRESS,
        TargetStatus.SUBMITTED
      );
      expect(clientViewerRes.allowed).toBe(false);
      expect(clientViewerRes.error).toContain('Clients cannot access');
    });

    it('allows Staff to start target (PENDING -> IN_PROGRESS)', () => {
      const res = validateTargetStatusTransition(
        UserRole.STAFF,
        TargetStatus.PENDING,
        TargetStatus.IN_PROGRESS
      );
      expect(res.allowed).toBe(true);
    });

    it('allows Staff to submit target for review (IN_PROGRESS -> SUBMITTED)', () => {
      const res = validateTargetStatusTransition(
        UserRole.STAFF,
        TargetStatus.IN_PROGRESS,
        TargetStatus.SUBMITTED
      );
      expect(res.allowed).toBe(true);
    });

    it('allows Staff to submit overdue target for review (OVERDUE -> SUBMITTED)', () => {
      const res = validateTargetStatusTransition(
        UserRole.STAFF,
        TargetStatus.OVERDUE,
        TargetStatus.SUBMITTED
      );
      expect(res.allowed).toBe(true);
    });

    it('CRITICAL RBAC RULE: Staff cannot approve their own completed targets (cannot transition to COMPLETED)', () => {
      const res = validateTargetStatusTransition(
        UserRole.STAFF,
        TargetStatus.IN_PROGRESS,
        TargetStatus.COMPLETED
      );
      expect(res.allowed).toBe(false);
      expect(res.error).toContain('Staff members cannot approve their own completed targets');

      const resFromSubmitted = validateTargetStatusTransition(
        UserRole.STAFF,
        TargetStatus.SUBMITTED,
        TargetStatus.COMPLETED
      );
      expect(resFromSubmitted.allowed).toBe(false);
      expect(resFromSubmitted.error).toContain('Staff members cannot approve their own completed targets');
    });

    it('allows Admin to approve submission and mark as COMPLETED', () => {
      const res = validateTargetStatusTransition(
        UserRole.ADMIN,
        TargetStatus.SUBMITTED,
        TargetStatus.COMPLETED
      );
      expect(res.allowed).toBe(true);
    });
  });

  describe('HTTP Fastify Route Security & RBAC', () => {
    it('HTTP 401: rejects unauthenticated requests to targets', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const res = await app.inject({ method: 'GET', url: '/api/targets' });
      expect(res.statusCode).toBe(401);

      await app.close();
    });

    it('HTTP 403 FORBIDDEN: strictly blocks Client Viewer and Client Leader from targets', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const resViewer = await app.inject({
        method: 'GET',
        url: '/api/targets',
        headers: { authorization: 'Bearer mock-viewer-token' },
      });
      expect(resViewer.statusCode).toBe(403);
      expect(JSON.parse(resViewer.body).error).toContain('Client accounts cannot access staff targets');

      const resLeader = await app.inject({
        method: 'GET',
        url: '/api/targets',
        headers: { authorization: 'Bearer mock-leader-token' },
      });
      expect(resLeader.statusCode).toBe(403);
      expect(JSON.parse(resLeader.body).error).toContain('Client accounts cannot access staff targets');

      await app.close();
    });

    it('HTTP 403 FORBIDDEN: strictly blocks Staff from creating targets', async () => {
      const { buildApp } = await import('../src/server');
      const app = await buildApp();

      const res = await app.inject({
        method: 'POST',
        url: '/api/targets',
        headers: { authorization: 'Bearer mock-staff-token' },
        payload: {
          title: 'Unauthorized Target',
          dueDate: '2026-11-30',
          staffIds: ['mock-staff-id'],
        },
      });
      expect(res.statusCode).toBe(403);
      expect(JSON.parse(res.body).error).toContain('Only studio Admins can create targets');

      await app.close();
    });
  });
});
