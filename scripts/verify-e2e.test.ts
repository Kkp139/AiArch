import { describe, it, expect } from 'vitest';
import { buildApp } from '../apps/api/src/server';
import { parseFileName, isAllowedFileType } from '../apps/api/src/modules/vault/naming.service';
import { calculateProgress } from '../apps/api/src/modules/projects/progress.service';
import { canRoleViewPayments } from '../apps/api/src/modules/payments/payments.service';
import { validateClockOutWithWorkUpdatesGate } from '../apps/api/src/modules/attendance/attendance.service';
import { sanitizePushPayload } from '../apps/worker/src/processors/push.processor';
import { canUserAccessProjectChat } from '../apps/api/src/modules/chat/chat.service';

describe('ProNex-ArchAI Turnkey End-to-End Baseline Suite', () => {
  it('E2E Baseline 1: verifies Fastify API health endpoint returns status ok', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.service).toContain('ProNex-ArchAI');
  });

  it('E2E Baseline 2: verifies 16-Category Progress Calculation across project lifecycle', () => {
    expect(calculateProgress(0, 16).percentage).toBe(0);
    expect(calculateProgress(8, 16).percentage).toBe(50);
    expect(calculateProgress(16, 16).percentage).toBe(100);
  });

  it('E2E Baseline 3: verifies auto-routing regex and catch-all 03_OTHER fallback', () => {
    // Valid format: routes to designated folder
    const valid = parseFileName('LAP_sitedrgs_GroundFloor_v1.dwg', 'LAP');
    expect(valid.matched).toBe(true);
    expect(valid.categoryCode).toBe('01_SITE_DRGS');
    expect(valid.fallbackToOther).toBe(false);

    // Invalid format: automatically catches all into 03_OTHER (16_OTHER)
    const invalid = parseFileName('random_sketch_file.dwg', 'LAP');
    expect(invalid.matched).toBe(false);
    expect(invalid.fallbackToOther).toBe(true);
    expect(invalid.warningMessage).toContain('03_OTHER');
  });

  it('E2E Baseline 4: verifies Strict Staff Isolation from payments', () => {
    expect(canRoleViewPayments('STAFF', true)).toBe(false);
    expect(canRoleViewPayments('STAFF', false)).toBe(false);
    expect(canRoleViewPayments('ADMIN', false)).toBe(true);
  });

  it('E2E Baseline 5: verifies Staff Clock-Out Hard Gate rejects missing daily updates', () => {
    const gateResult = validateClockOutWithWorkUpdatesGate({
      scheduledSlots: ['Slot 13:00', 'Slot 17:30'],
      submittedSlots: ['Slot 13:00'],
      lat: 23.0225,
      lng: 72.5714,
    });
    expect(gateResult.allowed).toBe(false);
    expect(gateResult.statusCode).toBe(422);
    expect(gateResult.pendingSlots).toEqual(['Slot 17:30']);
  });

  it('E2E Baseline 6: verifies Push Privacy Sanitizer strips monetary & OTP data', () => {
    const paymentPush = sanitizePushPayload('Payment of Rs 10,00,000 confirmed for Project LAP via NEFT', 'LAP');
    expect(paymentPush).toBe('A payment update has been recorded for Project LAP. Log in to view details.');

    const otpPush = sanitizePushPayload('Your secret login code is 882910 valid for 10 min', 'LAP');
    expect(otpPush).not.toContain('882910');
  });

  it('E2E Baseline 7: verifies Project Chat Access strictly restricted to Admin and Client Leader', () => {
    expect(canUserAccessProjectChat('ADMIN', [], 'LAP')).toBe(true);
    expect(canUserAccessProjectChat('CLIENT_LEADER', ['LAP'], 'LAP')).toBe(true);
    expect(canUserAccessProjectChat('STAFF', ['LAP'], 'LAP')).toBe(false);
    expect(canUserAccessProjectChat('CLIENT_VIEWER', ['LAP'], 'LAP')).toBe(false);
  });
});
