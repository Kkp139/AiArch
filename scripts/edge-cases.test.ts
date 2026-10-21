import { describe, it, expect } from 'vitest';
import { calculateProgress, isMeaningfulProgressChange } from '../apps/api/src/modules/projects/progress.service';
import { parseFileName, isAllowedFileType, sanitizeOriginalDownloadUrl } from '../apps/api/src/modules/vault/naming.service';
import { canRoleViewPayments, correctPaymentEntry, submitDiscrepancyRequest, createPaymentEntry } from '../apps/api/src/modules/payments/payments.service';
import { validateClockOutWithWorkUpdatesGate, validateGpsCoordinates, validateClockIn, getScheduledSlotsForSession } from '../apps/api/src/modules/attendance/attendance.service';
import { sanitizePushPayload, calculateNextRetryDelay, MAX_PUSH_RETRIES } from '../apps/worker/src/processors/push.processor';
import { canUserAccessProjectChat, validateChatAttachment } from '../apps/api/src/modules/chat/chat.service';
import { isValidSlot, VALID_SLOTS, MeetingReservationEngine } from '../apps/api/src/modules/meetings/meetings.service';
import { validateAdminDeactivation, verifySetupToken, createSetupToken } from '../apps/api/src/modules/auth/auth.service';

describe('Comprehensive Architecture Edge-Cases, Boundary & Negative Tests', () => {
  // ============================================================================
  // 1. PROGRESS CALCULATION ENGINE EDGE CASES
  // ============================================================================
  describe('Progress Engine Boundary Conditions', () => {
    it('Positive: accurately calculates exact percentages for standard steps', () => {
      expect(calculateProgress(1, 16).percentage).toBe(6.25);
      expect(calculateProgress(4, 16).percentage).toBe(25);
      expect(calculateProgress(8, 16).percentage).toBe(50);
      expect(calculateProgress(12, 16).percentage).toBe(75);
      expect(calculateProgress(16, 16).percentage).toBe(100);
    });

    it('Edge Case: handles negative populated counts gracefully by bounding to 0', () => {
      const result = calculateProgress(-5, 16);
      expect(result.percentage).toBe(0);
      expect(result.populatedCategories).toBe(0);
    });

    it('Edge Case: handles overflow (more than 16 categories) by bounding to 100%', () => {
      const result = calculateProgress(25, 16);
      expect(result.percentage).toBe(100);
      expect(result.populatedCategories).toBe(16);
    });

    it('Edge Case: prevents division-by-zero if totalCategories is 0 or negative', () => {
      const result = calculateProgress(5, 0);
      expect(result.percentage).toBe(0);
      expect(result.totalCategories).toBe(0);
    });

    it('Edge Case: isMeaningfulProgressChange filters out micro-jitter < 0.01%', () => {
      expect(isMeaningfulProgressChange(50.00, 50.004)).toBe(false);
      expect(isMeaningfulProgressChange(50.00, 50.05)).toBe(true);
    });
  });

  // ============================================================================
  // 2. DOCUMENT NAMING REGEX, WHITELIST & SECURITY EDGE CASES
  // ============================================================================
  describe('Document Vault & Security Edge Cases', () => {
    it('Positive: correctly parses standard category abbreviations', () => {
      const site = parseFileName('AF_sitedrgs_MasterPlan_v2.pdf', 'AF');
      expect(site.matched).toBe(true);
      expect(site.categoryCode).toBe('01_SITE_DRGS');
      expect(site.fallbackToOther).toBe(false);

      const civil = parseFileName('AF_civildrgs_Foundation_v1.dwg', 'AF');
      expect(civil.matched).toBe(true);
      expect(civil.categoryCode).toBe('07_CIVIL_DRGS');
    });

    it('Negative: non-conforming file names fallback to 03_OTHER with warning', () => {
      const bad1 = parseFileName('WhatsApp_Image_2026.jpeg', 'AF');
      expect(bad1.matched).toBe(false);
      expect(bad1.fallbackToOther).toBe(true);
      expect(bad1.warningMessage).toContain('03_OTHER');

      const bad2 = parseFileName('elevation.dwg', 'AF');
      expect(bad2.matched).toBe(false);
      expect(bad2.fallbackToOther).toBe(true);
    });

    it('Negative: file extension whitelist strictly blocks executable/script files', () => {
      expect(isAllowedFileType('drawing.dwg')).toBe(true);
      expect(isAllowedFileType('plan.dxf')).toBe(true);
      expect(isAllowedFileType('doc.pdf')).toBe(true);
      expect(isAllowedFileType('photo.png')).toBe(true);

      // Dangerous extensions strictly blocked
      expect(isAllowedFileType('malware.exe')).toBe(false);
      expect(isAllowedFileType('script.sh')).toBe(false);
      expect(isAllowedFileType('hack.bat')).toBe(false);
      expect(isAllowedFileType('exploit.js')).toBe(false);
    });

    it('Security Edge Case: strips original download URL when user is VIEW_ONLY', () => {
      const signedUrl = 'https://r2.cloudflarestorage.com/vault/drawing.dwg?token=xyz';
      expect(sanitizeOriginalDownloadUrl(signedUrl, 'VIEW_ONLY')).toBe(null);
      expect(sanitizeOriginalDownloadUrl(signedUrl, 'VIEW_AND_DOWNLOAD')).toBe(signedUrl);
    });
  });

  // ============================================================================
  // 3. ATTENDANCE & CLOCK-OUT HARD GATE EDGE CASES
  // ============================================================================
  describe('Attendance Hard Gate Edge Cases', () => {
    it('Negative: rejects Clock-In with missing or invalid GPS coordinates', () => {
      const missingLat = validateGpsCoordinates(undefined as any, 72.5714);
      expect(missingLat.valid).toBe(false);

      const missingLng = validateGpsCoordinates(23.0225, undefined as any);
      expect(missingLng.valid).toBe(false);

      const outOfBounds = validateGpsCoordinates(100.5, 72.5714); // Lat must be -90 to +90
      expect(outOfBounds.valid).toBe(false);
    });

    it('Negative: strictly blocks Clock-Out if even ONE scheduled slot is unsubmitted', () => {
      const result = validateClockOutWithWorkUpdatesGate({
        scheduledSlots: ['Slot 12:00', 'Slot 15:00', 'Slot 18:00'],
        submittedSlots: ['Slot 12:00', 'Slot 15:00'], // Missing 18:00!
        lat: 23.0225,
        lng: 72.5714,
      });

      expect(result.allowed).toBe(false);
      expect(result.statusCode).toBe(422);
      expect(result.pendingSlots).toEqual(['Slot 18:00']);
      expect(result.error).toContain('Clock-Out blocked');
    });

    it('Positive: permits Clock-Out when submittedSlots supersedes or matches scheduled', () => {
      const result = validateClockOutWithWorkUpdatesGate({
        scheduledSlots: ['Slot 12:00', 'Slot 15:00'],
        submittedSlots: ['Slot 12:00', 'Slot 15:00', 'Bonus Adhoc Update'],
        lat: 23.0225,
        lng: 72.5714,
      });

      expect(result.allowed).toBe(true);
      expect(result.pendingSlots).toEqual([]);
    });
  });

  // ============================================================================
  // 4. PAYMENTS & ROLE ISOLATION EDGE CASES
  // ============================================================================
  describe('Payments Isolation & Discrepancy Flow Edge Cases', () => {
    it('Security Edge Case: Staff is 100% blocked from payments, even if project toggle is TRUE', () => {
      // Even if a bug set showPricing to true, STAFF role must NEVER see payments
      expect(canRoleViewPayments('STAFF', true)).toBe(false);
      expect(canRoleViewPayments('STAFF', false)).toBe(false);
    });

    it('Negative: Client roles blocked when showPricing is FALSE', () => {
      expect(canRoleViewPayments('CLIENT_LEADER', false)).toBe(false);
      expect(canRoleViewPayments('CLIENT_VIEWER', false)).toBe(false);
    });

    it('Positive: Client roles allowed when showPricing is TRUE', () => {
      expect(canRoleViewPayments('CLIENT_LEADER', true)).toBe(true);
      expect(canRoleViewPayments('CLIENT_VIEWER', true)).toBe(true);
    });

    it('Edge Case: Client discrepancy submission changes status to REVISION_REQUESTED without altering payment amount', () => {
      const entry = createPaymentEntry({
        projectId: 'proj-1',
        amount: 250000,
        paymentMode: 'NEFT_RTGS',
        recordedBy: 'admin-1',
      });

      const flagged = submitDiscrepancyRequest(entry, 'Receipt shows Rs 3,00,000 paid');
      expect(flagged.status).toBe('REVISION_REQUESTED');
      expect(flagged.amount).toBe(250000); // Amount unchanged until admin correction
      expect(flagged.discrepancyNote).toContain('Rs 3,00,000');

      // Admin corrects entry with audit diff
      const { updatedPayment, auditDiff } = correctPaymentEntry(
        flagged,
        { amount: 300000, status: 'CONFIRMED' },
        'admin-1'
      );
      expect(updatedPayment.amount).toBe(300000);
      expect(updatedPayment.status).toBe('CONFIRMED');
      expect(auditDiff.oldData.amount).toBe(250000);
      expect(auditDiff.newData.amount).toBe(300000);
    });
  });

  // ============================================================================
  // 5. MEETINGS FIXED SLOTS & ATOMIC CONCURRENCY EDGE CASES
  // ============================================================================
  describe('Meetings Atomic Collision Edge Cases', () => {
    it('Positive: validates all 3 fixed 90-minute slots', () => {
      expect(VALID_SLOTS).toEqual(['SLOT_12_00_13_30', 'SLOT_16_00_17_30', 'SLOT_18_00_19_30']);
      expect(isValidSlot('SLOT_12_00_13_30')).toBe(true);
      expect(isValidSlot('SLOT_16_00_17_30')).toBe(true);
      expect(isValidSlot('SLOT_18_00_19_30')).toBe(true);
      expect(isValidSlot('SLOT_14_00_15_00')).toBe(false);
    });

    it('Concurrency Edge Case: blocks double booking of an already reserved slot', async () => {
      const engine = new MeetingReservationEngine();
      const first = await engine.bookSlot({
        bookingDate: '2026-11-01',
        slot: 'SLOT_12_00_13_30',
        type: 'OFFICE_MEETING',
        requestedBy: 'client-1',
      });
      expect(first.success).toBe(true);

      // Second booking on the exact same date & slot is rejected atomically
      const second = await engine.bookSlot({
        bookingDate: '2026-11-01',
        slot: 'SLOT_12_00_13_30',
        type: 'SITE_VISIT',
        requestedBy: 'client-2',
      });
      expect(second.success).toBe(false);
      expect(second.error).toContain('Slot already booked');
    });
  });

  // ============================================================================
  // 6. CHAT ATTACHMENTS & PUSH PRIVACY SANITIZER EDGE CASES
  // ============================================================================
  describe('Chat Attachments & Push Privacy Edge Cases', () => {
    it('Boundary: Attachment of exactly 10MB is accepted; 10MB + 1 byte is rejected', () => {
      const exact10MB = 10 * 1024 * 1024;
      expect(validateChatAttachment({ fileName: 'pic.jpg', fileSize: exact10MB, mimeType: 'image/jpeg' }).isValid).toBe(true);

      const overLimit = exact10MB + 1;
      const reject = validateChatAttachment({ fileName: 'pic.jpg', fileSize: overLimit, mimeType: 'image/jpeg' });
      expect(reject.isValid).toBe(false);
      expect(reject.error).toContain('10MB');
    });

    it('Negative: Chat access rejected for Staff and Client Viewers', () => {
      expect(canUserAccessProjectChat('STAFF', ['proj-1'], 'proj-1')).toBe(false);
      expect(canUserAccessProjectChat('CLIENT_VIEWER', ['proj-1'], 'proj-1')).toBe(false);
      expect(canUserAccessProjectChat('CLIENT_LEADER', ['proj-2'], 'proj-1')).toBe(false); // Unassigned
      expect(canUserAccessProjectChat('CLIENT_LEADER', ['proj-1'], 'proj-1')).toBe(true); // Assigned
      expect(canUserAccessProjectChat('ADMIN', [], 'proj-1')).toBe(true); // Universal
    });

    it('Privacy Edge Cases: strips Indian currency variants, NEFT, UTR, and OTP from push alerts', () => {
      // Currency with commas and ₹ symbol
      expect(sanitizePushPayload('Advance payment of ₹5,50,000 confirmed for Project AF via NEFT', 'AF')).toBe(
        'A payment update has been recorded for Project AF. Log in to view details.'
      );

      // Currency with Rs format
      expect(sanitizePushPayload('Cheque cleared: Rs. 1250000 deposited for Project AF', 'AF')).toBe(
        'A payment update has been recorded for Project AF. Log in to view details.'
      );

      // OTP pattern
      const sanitizedOtp = sanitizePushPayload('Your secret login code is 882910 valid for 10 min', 'AF');
      expect(sanitizedOtp).not.toContain('882910');
      expect(sanitizedOtp).toContain('Log in to view details');

      // Harmless message is NOT altered
      const normalMsg = 'Site inspection scheduled tomorrow at 10:00 AM with client.';
      expect(sanitizePushPayload(normalMsg, 'AF')).toBe(normalMsg);
    });

    it('Retry Delay Edge Case: exact 1+3 exponential backoff sequence (+1m, +5m, +15m)', () => {
      expect(calculateNextRetryDelay(1)).toBe(60000);
      expect(calculateNextRetryDelay(2)).toBe(300000);
      expect(calculateNextRetryDelay(3)).toBe(900000);
      expect(calculateNextRetryDelay(4)).toBe(null); // Stop retrying
      expect(MAX_PUSH_RETRIES).toBe(3);
    });
  });

  // ============================================================================
  // 7. AUTHENTICATION & SECURITY EDGE CASES
  // ============================================================================
  describe('Authentication Admin Deactivation Guard & Setup Tokens', () => {
    it('Edge Case: prevents deactivating the last active Admin account in the studio', () => {
      // When only 1 admin remains, deactivation is blocked
      expect(validateAdminDeactivation(1).allowed).toBe(false);
      expect(validateAdminDeactivation(1).error).toContain('last active Admin');

      // When 2 or more admins exist, deactivation is allowed
      expect(validateAdminDeactivation(2).allowed).toBe(true);
      expect(validateAdminDeactivation(5).allowed).toBe(true);
    });

    it('Edge Case: verifies single-use setup tokens expire properly', () => {
      const { token, expiresAt } = createSetupToken(48);
      expect(token.length).toBe(64);
      expect(verifySetupToken(token, expiresAt)).toBe(true);

      // Expired token (past time)
      const expiredDate = new Date(Date.now() - 1000);
      expect(verifySetupToken(token, expiredDate)).toBe(false);

      // Invalid short token
      expect(verifySetupToken('short_token', expiresAt)).toBe(false);
    });
  });
});
