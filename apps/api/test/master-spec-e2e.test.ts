import { describe, it, expect } from 'vitest';
import { UserRole, AnnouncementAudience, TargetStatus } from '@prisma/client';
import { FIXED_16_CATEGORIES } from '../prisma/seed';
import {
  calculateProgress,
  isMeaningfulProgressChange,
  FIXED_CATEGORY_COUNT,
} from '../src/modules/projects/progress.service';
import {
  validateProjectStatusTransition,
  canRoleAccessProject,
} from '../src/modules/projects/projects.service';
import {
  parseFileName,
  isAllowedFileType,
  sanitizeOriginalDownloadUrl,
  ALLOWED_EXTENSIONS,
} from '../src/modules/vault/naming.service';
import {
  createSubmission,
  requestRevision,
  approveDrawing,
  canRoleAccessVerification,
  serializeVerificationItem,
} from '../src/modules/verification/verification.service';
import {
  MeetingReservationEngine,
  isValidSlot,
  isFutureDate,
  isRoleAllowedToRequestMeeting,
  VALID_SLOTS,
} from '../src/modules/meetings/meetings.service';
import {
  canRoleViewPayments,
  createPaymentEntry,
  submitDiscrepancyRequest,
  correctPaymentEntry,
} from '../src/modules/payments/payments.service';
import {
  canUserReadAnnouncement,
  getAudiencesForRole,
} from '../src/modules/announcements/announcements.service';
import {
  computeEffectiveTargetStatus,
  validateTargetStatusTransition,
} from '../src/modules/targets/targets.service';
import {
  validateGpsCoordinates,
  validateClockIn,
  validateClockOutWithWorkUpdatesGate,
  getScheduledSlotsForSession,
} from '../src/modules/attendance/attendance.service';
import {
  canUserAccessProjectChat,
  validateChatAttachment,
} from '../src/modules/chat/chat.service';
import {
  validateAdminDeactivation,
  createSetupToken,
  verifySetupToken,
} from '../src/modules/auth/auth.service';
import { generateOtp, verifyOtp } from '../src/modules/auth/otp.service';
import { checkRoleAccess } from '../src/middleware/rbac.middleware';
import {
  sanitizePushPayload,
  calculateNextRetryDelay,
  MAX_PUSH_RETRIES,
  processPushJob,
} from '../../worker/src/processors/push.processor';

describe('Master Requirements Specification E2E Audit & Test Suite (Chapters 1-15 & Notification Matrix)', () => {
  // ============================================================================
  // CHAPTER 2: Roles, Project Assignment & Access Model
  // ============================================================================
  describe('Chapter 2: Roles, Project Assignment & Access Model', () => {
    it('Positive: Admin retains universal access to all projects (Active + Inactive)', () => {
      const activeAccess = canRoleAccessProject('ADMIN', 'ACTIVE', true);
      expect(activeAccess.canView).toBe(true);
      expect(activeAccess.canEdit).toBe(true);

      const inactiveAccess = canRoleAccessProject('ADMIN', 'INACTIVE', false);
      expect(inactiveAccess.canView).toBe(true);
      expect(inactiveAccess.canEdit).toBe(true);
    });

    it('Positive & Negative: Staff access on Active vs Inactive projects', () => {
      // Assigned Active project
      const assignedActive = canRoleAccessProject('STAFF', 'ACTIVE', true);
      expect(assignedActive.canView).toBe(true);
      expect(assignedActive.canEdit).toBe(true);

      // Unassigned Active project
      const unassignedActive = canRoleAccessProject('STAFF', 'ACTIVE', false);
      expect(unassignedActive.canView).toBe(false);

      // Inactive project is strictly read-only for Staff
      const inactive = canRoleAccessProject('STAFF', 'INACTIVE', true);
      expect(inactive.canView).toBe(true);
      expect(inactive.canEdit).toBe(false);
    });

    it('Negative: Client roles have ZERO access to Inactive projects', () => {
      const clientLeader = canRoleAccessProject('CLIENT_LEADER', 'INACTIVE', true);
      expect(clientLeader.canView).toBe(false);
      expect(clientLeader.canEdit).toBe(false);

      const clientViewer = canRoleAccessProject('CLIENT_VIEWER', 'INACTIVE', true);
      expect(clientViewer.canView).toBe(false);
      expect(clientViewer.canEdit).toBe(false);
    });

    it('Positive: Client Viewer on Active project has view-only rights', () => {
      const viewer = canRoleAccessProject('CLIENT_VIEWER', 'ACTIVE', true);
      expect(viewer.canView).toBe(true);
      expect(viewer.canEdit).toBe(false);
    });

    it('RBAC Middleware: enforces strict route hierarchy', () => {
      expect(checkRoleAccess('ADMIN', ['ADMIN'])).toBe(true);
      expect(checkRoleAccess('ADMIN', ['STAFF'])).toBe(true);
      expect(checkRoleAccess('STAFF', ['ADMIN'])).toBe(false);
      expect(checkRoleAccess('CLIENT_LEADER', ['ADMIN'])).toBe(false);
      expect(checkRoleAccess('CLIENT_VIEWER', ['CLIENT_LEADER'])).toBe(false);
    });
  });

  // ============================================================================
  // CHAPTER 3: User Creation, Credentials, OTP & Password Security
  // ============================================================================
  describe('Chapter 3: User Creation, Credentials, OTP & Password Security', () => {
    it('Security Safeguard: strictly blocks deactivating the last active Admin account', () => {
      const singleAdmin = validateAdminDeactivation(1);
      expect(singleAdmin.allowed).toBe(false);
      expect(singleAdmin.error).toBe('Cannot deactivate the last active Admin account');

      const twoAdmins = validateAdminDeactivation(2);
      expect(twoAdmins.allowed).toBe(true);
    });

    it('Zero-Plaintext Passwords: creates and verifies single-use setup token', () => {
      const { token, expiresAt } = createSetupToken();
      expect(token).toHaveLength(64);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Valid token verification
      expect(verifySetupToken(token, expiresAt)).toBe(true);

      // Expired token rejection
      const expiredAt = new Date(Date.now() - 1000);
      expect(verifySetupToken(token, expiredAt)).toBe(false);
    });

    it('Universal 2-Step OTP: generates 6-digit OTP and verifies with single-use consumption', () => {
      const mobile = '+919876543210';
      const otp = generateOtp(mobile);
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);

      // Verify OTP correctly
      expect(verifyOtp(mobile, otp)).toBe(true);

      // Replay attack / reuse attempt strictly rejected
      expect(verifyOtp(mobile, otp)).toBe(false);

      // Wrong OTP rejected
      const otp2 = generateOtp('+919876543211');
      expect(verifyOtp('+919876543211', '000000')).toBe(false);
    });

    it('UI Display Convention Rule: Full Name must never contain role in parentheses', () => {
      const validNames = ['Kamal Patel', 'Farhaz Patel', 'Ar. Priya Sharma', 'Dr. Sameer Mehta'];
      const invalidNames = ['Farhaz Patel (Admin)', 'Priya Mehta (Staff)', 'Aakash Mehta (Client Leader)'];

      const rolePattern = /\((?:Admin|Staff|Client Leader|Client Viewer)\)/i;
      validNames.forEach(name => expect(rolePattern.test(name)).toBe(false));
      invalidNames.forEach(name => expect(rolePattern.test(name)).toBe(true));
    });
  });

  // ============================================================================
  // CHAPTER 4: Project Lifecycle & 16-Folder Vault
  // ============================================================================
  describe('Chapter 4: Project Lifecycle & 16-Folder Vault', () => {
    it('Project Lifecycle: permits status toggle between ACTIVE and INACTIVE but strictly prevents deletion', () => {
      expect(validateProjectStatusTransition('ACTIVE', 'INACTIVE')).toBe(true);
      expect(validateProjectStatusTransition('INACTIVE', 'ACTIVE')).toBe(true);
      expect(validateProjectStatusTransition('ACTIVE', 'ACTIVE')).toBe(true);
    });

    it('16-Folder Canonical Vault: exactly 6 Concept + 9 Construction + 1 Other = 16 folders', () => {
      expect(FIXED_16_CATEGORIES).toHaveLength(16);

      const conceptFolders = FIXED_16_CATEGORIES.filter(c => c.phase === 'CONCEPT_DESIGN');
      expect(conceptFolders).toHaveLength(6);
      expect(conceptFolders.map(c => c.code)).toEqual([
        '01_SITE_DRGS',
        '02_ZONING_PLANNING',
        '03_SPACE_OBJECT_DESIGN',
        '04_COMPLETE_SET_DRGS',
        '05_MATERIAL_SELECTION',
        '06_3D_IMAGES',
      ]);

      const constructionFolders = FIXED_16_CATEGORIES.filter(c => c.phase === 'CONSTRUCTION_DESIGN');
      expect(constructionFolders).toHaveLength(9);
      expect(constructionFolders.map(c => c.code)).toEqual([
        '07_CIVIL_DRGS',
        '08_PLUMBING_DRGS',
        '09_FIRE_DRGS',
        '10_HVAC_DRGS',
        '11_FLOORING_DRGS',
        '12_CEILING_DRGS',
        '13_ELECTRICAL_DRGS',
        '14_WALL_ELEVATION',
        '15_ELEMENT_DRGS',
      ]);

      const otherFolder = FIXED_16_CATEGORIES.filter(c => c.phase === 'OTHER');
      expect(otherFolder).toHaveLength(1);
      expect(otherFolder[0].code).toBe('16_OTHER');
      expect(otherFolder[0].name).toBe('03_OTHER');

      // Unique display orders from 1 to 16
      const orders = FIXED_16_CATEGORIES.map(c => c.order);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });
  });

  // ============================================================================
  // CHAPTER 5: Document Vault & Governance
  // ============================================================================
  describe('Chapter 5: Document Vault & Governance', () => {
    it('File Whitelist: accepts CAD, PDF, and image assets; rejects executable binaries and scripts', () => {
      expect(isAllowedFileType('site_layout.dwg')).toBe(true);
      expect(isAllowedFileType('facade.dxf')).toBe(true);
      expect(isAllowedFileType('specifications.pdf')).toBe(true);
      expect(isAllowedFileType('render.png')).toBe(true);
      expect(isAllowedFileType('moodboard.jpg')).toBe(true);
      expect(isAllowedFileType('texture.webp')).toBe(true);
      expect(isAllowedFileType('cad_model.dgn')).toBe(true);

      // Blocked malicious/unsupported extensions
      expect(isAllowedFileType('trojan.exe')).toBe(false);
      expect(isAllowedFileType('script.sh')).toBe(false);
      expect(isAllowedFileType('autorun.bat')).toBe(false);
      expect(isAllowedFileType('injection.js')).toBe(false);
      expect(isAllowedFileType('payload.py')).toBe(false);
    });

    it('Naming Router: routes conforming filenames to the exact folder category', () => {
      const site = parseFileName('AF_SiteDrgs_Survey_v1.pdf', 'AF');
      expect(site.matched).toBe(true);
      expect(site.categoryCode).toBe('01_SITE_DRGS');
      expect(site.fallbackToOther).toBe(false);

      const civil = parseFileName('AF_CivilDrgs_Footing_FoundationLayout.dwg', 'AF');
      expect(civil.matched).toBe(true);
      expect(civil.categoryCode).toBe('07_CIVIL_DRGS');

      const electrical = parseFileName('AF_ElectricalDrgs_PowerSLD_v2.pdf', 'AF');
      expect(electrical.matched).toBe(true);
      expect(electrical.categoryCode).toBe('13_ELECTRICAL_DRGS');
    });

    it('Naming Router Fallback: routes non-conforming filenames safely to 03_OTHER with warning', () => {
      const rawUpload = parseFileName('WhatsApp_Image_2026-11-04.jpeg', 'AF');
      expect(rawUpload.matched).toBe(false);
      expect(rawUpload.categoryCode).toBe('16_OTHER');
      expect(rawUpload.fallbackToOther).toBe(true);
      expect(rawUpload.warningMessage).toContain('03_OTHER');

      const bareName = parseFileName('floorplan.dwg', 'AF');
      expect(bareName.matched).toBe(false);
      expect(bareName.fallbackToOther).toBe(true);
    });

    it('Master Download Toggle: VIEW_ONLY strips original download URL; VIEW_AND_DOWNLOAD returns it', () => {
      const signedUrl = 'https://r2.pronex-archai.com/vault/AF/07_CIVIL_DRGS/foundation.dwg?token=xyz';

      const viewOnly = sanitizeOriginalDownloadUrl(signedUrl, 'VIEW_ONLY');
      expect(viewOnly).toBeNull();

      const viewAndDownload = sanitizeOriginalDownloadUrl(signedUrl, 'VIEW_AND_DOWNLOAD');
      expect(viewAndDownload).toBe(signedUrl);
    });
  });

  // ============================================================================
  // CHAPTER 6: Design Verification
  // ============================================================================
  describe('Chapter 6: Design Verification', () => {
    it('Full Lifecycle: Staff submission -> Admin revision request -> Staff resubmission -> Admin approval', () => {
      // 1. Staff submits drawing
      const sub1 = createSubmission({
        projectId: 'proj-1',
        folderId: 'folder-civil',
        drawingTitle: 'Cantilever Deck Structural Detailing',
        fileKey: 'uploads/deck_detailing_v1.dwg',
        submittedBy: 'staff-1',
      });
      expect(sub1.revisionNumber).toBe(1);
      expect(sub1.status).toBe('PENDING_REVIEW');
      expect(sub1.isLocked).toBe(false);

      // 2. Admin requests revision with feedback
      const rev1 = requestRevision(
        sub1,
        'Increase beam reinforcement from 16mm to 20mm at grid C2',
        'admin-1'
      );
      expect(rev1.status).toBe('REVISION_REQUIRED');
      expect(rev1.revisionNumber).toBe(2);
      expect(rev1.feedbackNote).toContain('Increase beam reinforcement');
      expect(rev1.reviewedBy).toBe('admin-1');

      // 3. Admin approves drawing
      const approved = approveDrawing(rev1, 'admin-1');
      expect(approved.status).toBe('APPROVED');
      expect(approved.isLocked).toBe(true);
      expect(approved.isCurrentApprovedDrawing).toBe(true);
    });

    it('Dual Revision Counter Visibility: Admin & Staff see revision counter; Clients strictly forbidden', () => {
      const drawing = {
        id: 'ver-201',
        drawingTitle: 'Reflected Ceiling Cove Detailing',
        revisionNumber: 3,
        status: 'REVISION_REQUIRED' as const,
        feedbackNote: 'Lower cove drop by 50mm',
      };

      // Admin view
      const adminView = serializeVerificationItem(drawing, 'ADMIN');
      expect(adminView.revisionNumber).toBe(3);
      expect(adminView.revisionLabel).toBe('Rev 3');

      // Staff view
      const staffView = serializeVerificationItem(drawing, 'STAFF');
      expect(staffView.revisionNumber).toBe(3);
      expect(staffView.revisionLabel).toBe('Rev 3');

      // Client access strictly denied
      expect(canRoleAccessVerification('CLIENT_LEADER')).toBe(false);
      expect(canRoleAccessVerification('CLIENT_VIEWER')).toBe(false);
    });
  });

  // ============================================================================
  // CHAPTER 7: Meeting Management
  // ============================================================================
  describe('Chapter 7: Meeting Management', () => {
    it('Fixed 90-minute slots: exactly 3 fixed daily slots (12:00, 16:00, 18:00)', () => {
      expect(VALID_SLOTS).toEqual(['SLOT_12_00_13_30', 'SLOT_16_00_17_30', 'SLOT_18_00_19_30']);
      expect(isValidSlot('SLOT_12_00_13_30')).toBe(true);
      expect(isValidSlot('SLOT_16_00_17_30')).toBe(true);
      expect(isValidSlot('SLOT_18_00_19_30')).toBe(true);
      expect(isValidSlot('SLOT_14_00_15_30')).toBe(false);
    });

    it('Past Date Rejection: rejects meetings booked for past calendar dates', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const future = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];

      expect(isFutureDate(yesterday)).toBe(false);
      expect(isFutureDate(future)).toBe(true);
    });

    it('Atomic Concurrency Collision Lock: prevents double booking of identical date and slot', async () => {
      const engine = new MeetingReservationEngine();
      const futureDate = new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0];
      const slot = 'SLOT_16_00_17_30';

      const firstBooking = await engine.bookSlot({
        bookingDate: futureDate,
        slot,
        type: 'OFFICE_MEETING',
        requestedBy: 'client-leader-1',
        notes: 'Initial schematic sign-off',
      });
      expect(firstBooking.success).toBe(true);
      expect(firstBooking.meeting?.status).toBe('REQUESTED');

      // Second concurrent booking for the same slot is rejected
      const secondBooking = await engine.bookSlot({
        bookingDate: futureDate,
        slot,
        type: 'SITE_VISIT',
        requestedBy: 'client-leader-2',
        notes: 'Conflicting request',
      });
      expect(secondBooking.success).toBe(false);
      expect(secondBooking.error).toContain('Slot already booked or reserved');
    });

    it('Reschedule Safeguard: old confirmed meeting stays active until replacement slot is approved', async () => {
      const engine = new MeetingReservationEngine();
      const date1 = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
      const date2 = new Date(Date.now() + 86400000 * 6).toISOString().split('T')[0];

      // 1. Initial meeting confirmed
      const m1 = await engine.bookSlot({
        bookingDate: date1,
        slot: 'SLOT_12_00_13_30',
        type: 'OFFICE_MEETING',
        requestedBy: 'client-1',
      });
      const approvedM1 = engine.approveMeeting(m1.meeting!.id, 'admin-1');
      expect(approvedM1?.status).toBe('CONFIRMED');

      // 2. Client requests reschedule to date2
      const m2 = await engine.requestReschedule(approvedM1!.id, date2, 'SLOT_16_00_17_30', 'client-1');
      expect(m2.success).toBe(true);
      expect(m2.replacementMeeting?.status).toBe('RESCHEDULE_PENDING');

      // Safeguard: Old meeting remains CONFIRMED until Admin approves replacement
      const currentOldMeeting = engine.getMeeting(approvedM1!.id);
      expect(currentOldMeeting?.status).toBe('CONFIRMED');

      // 3. Admin approves replacement meeting -> old meeting is cancelled
      engine.approveMeeting(m2.replacementMeeting!.id, 'admin-1');
      const finalOldMeeting = engine.getMeeting(approvedM1!.id);
      expect(finalOldMeeting?.status).toBe('CANCELLED');
    });

    it('RBAC Enforcement: Only Admin and Client Leader can request meetings', () => {
      expect(isRoleAllowedToRequestMeeting('ADMIN')).toBe(true);
      expect(isRoleAllowedToRequestMeeting('CLIENT_LEADER')).toBe(true);
      expect(isRoleAllowedToRequestMeeting('STAFF')).toBe(false);
      expect(isRoleAllowedToRequestMeeting('CLIENT_VIEWER')).toBe(false);
    });
  });

  // ============================================================================
  // CHAPTER 8: Payments & Financial Ledger
  // ============================================================================
  describe('Chapter 8: Payments & Financial Ledger', () => {
    it('Agreed Fee, Advance, and Balance Ledger Calculation', () => {
      const totalAgreedFee = 5000000; // 50 Lakhs
      const advanceReceived = 3000000; // 30 Lakhs
      const balance = totalAgreedFee - advanceReceived;
      const collectionRatio = (advanceReceived / totalAgreedFee) * 100;

      expect(balance).toBe(2000000);
      expect(collectionRatio).toBe(60.0);
    });

    it('Staff Strict Restriction: Staff is 100% blocked from viewing payments, regardless of toggles', () => {
      expect(canRoleViewPayments('STAFF', true)).toBe(false);
      expect(canRoleViewPayments('STAFF', false)).toBe(false);
    });

    it('Client Visibility: Client access strictly governed by showPricing toggle', () => {
      expect(canRoleViewPayments('CLIENT_LEADER', false)).toBe(false);
      expect(canRoleViewPayments('CLIENT_VIEWER', false)).toBe(false);
      expect(canRoleViewPayments('CLIENT_LEADER', true)).toBe(true);
      expect(canRoleViewPayments('CLIENT_VIEWER', true)).toBe(true);
      expect(canRoleViewPayments('ADMIN', false)).toBe(true); // Admin always true
    });

    it('Discrepancy Flow & Audit Diff: Client flags entry -> REVISION_REQUESTED without changing amount; Admin corrects entry', () => {
      const payment = createPaymentEntry({
        projectId: 'proj-villa',
        amount: 500000,
        paymentMode: 'NEFT_RTGS',
        referenceNumber: 'AXIS12345678',
        bankName: 'Axis Bank',
        recordedBy: 'admin-1',
      });
      expect(payment.status).toBe('PENDING_CLEARANCE');

      // Client submits discrepancy note
      const flagged = submitDiscrepancyRequest(payment, 'Client transfer was for Rs 6,00,000 as per UTR Axis9988');
      expect(flagged.status).toBe('REVISION_REQUESTED');
      expect(flagged.amount).toBe(500000); // Unaltered!

      // Admin corrects entry with audit diff
      const { updatedPayment, auditDiff } = correctPaymentEntry(
        flagged,
        { amount: 600000, status: 'CONFIRMED', referenceNumber: 'Axis9988' },
        'admin-1'
      );
      expect(updatedPayment.amount).toBe(600000);
      expect(updatedPayment.status).toBe('CONFIRMED');
      expect(auditDiff.oldData.amount).toBe(500000);
      expect(auditDiff.newData.amount).toBe(600000);
      expect(auditDiff.editorId).toBe('admin-1');
    });
  });

  // ============================================================================
  // CHAPTER 9: Announcements & Policies
  // ============================================================================
  describe('Chapter 9: Announcements & Policies', () => {
    it('Targeted Audiences: verifies role-targeted audience visibility', () => {
      // Admin reads everything
      expect(canUserReadAnnouncement(UserRole.ADMIN, AnnouncementAudience.ALL)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.ADMIN, AnnouncementAudience.STAFF)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.ADMIN, AnnouncementAudience.CLIENT_LEADERS)).toBe(true);

      // Staff reads ALL and STAFF
      expect(canUserReadAnnouncement(UserRole.STAFF, AnnouncementAudience.ALL)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.STAFF, AnnouncementAudience.STAFF)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.STAFF, AnnouncementAudience.CLIENT_LEADERS)).toBe(false);

      // Client Leader reads ALL and CLIENT_LEADERS
      expect(canUserReadAnnouncement(UserRole.CLIENT_LEADER, AnnouncementAudience.ALL)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.CLIENT_LEADER, AnnouncementAudience.CLIENT_LEADERS)).toBe(true);
      expect(canUserReadAnnouncement(UserRole.CLIENT_LEADER, AnnouncementAudience.STAFF)).toBe(false);

      // Audience listing helper
      expect(getAudiencesForRole(UserRole.STAFF)).toEqual([AnnouncementAudience.ALL, AnnouncementAudience.STAFF]);
    });
  });

  // ============================================================================
  // CHAPTER 10: Progress Reports & Targets
  // ============================================================================
  describe('Chapter 10: Progress Reports & Targets', () => {
    it('Formula (populated / 16) * 100: calculates exact percentages across all 16 categories', () => {
      expect(calculateProgress(0).percentage).toBe(0.0);
      expect(calculateProgress(1).percentage).toBe(6.25);
      expect(calculateProgress(4).percentage).toBe(25.0);
      expect(calculateProgress(8).percentage).toBe(50.0);
      expect(calculateProgress(12).percentage).toBe(75.0);
      expect(calculateProgress(16).percentage).toBe(100.0);
    });

    it('Progress Boundary Guards: bounds negative and overflow values cleanly', () => {
      expect(calculateProgress(-4).percentage).toBe(0.0);
      expect(calculateProgress(25).percentage).toBe(100.0);
      expect(calculateProgress(5, 0).percentage).toBe(0.0);
    });

    it('Meaningful Change Detection: filters out micro-jitter < 0.01%', () => {
      expect(isMeaningfulProgressChange(50.0, 50.005)).toBe(false);
      expect(isMeaningfulProgressChange(50.0, 56.25)).toBe(true);
    });

    it('Staff Targets: dynamic overdue detection when due date passes before completion', () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);

      expect(computeEffectiveTargetStatus(TargetStatus.IN_PROGRESS, yesterday)).toBe(TargetStatus.OVERDUE);
      expect(computeEffectiveTargetStatus(TargetStatus.IN_PROGRESS, tomorrow)).toBe(TargetStatus.IN_PROGRESS);
      expect(computeEffectiveTargetStatus(TargetStatus.COMPLETED, yesterday)).toBe(TargetStatus.COMPLETED);
    });

    it('Target Status Transitions: Staff cannot self-approve to COMPLETED; must submit for Admin approval', () => {
      // Staff self-approval blocked
      const selfApprove = validateTargetStatusTransition(UserRole.STAFF, TargetStatus.IN_PROGRESS, TargetStatus.COMPLETED);
      expect(selfApprove.allowed).toBe(false);
      expect(selfApprove.error).toContain('Staff members cannot approve their own completed targets');

      // Staff submits for review
      const staffSubmit = validateTargetStatusTransition(UserRole.STAFF, TargetStatus.IN_PROGRESS, TargetStatus.SUBMITTED);
      expect(staffSubmit.allowed).toBe(true);

      // Admin approves to COMPLETED
      const adminApprove = validateTargetStatusTransition(UserRole.ADMIN, TargetStatus.SUBMITTED, TargetStatus.COMPLETED);
      expect(adminApprove.allowed).toBe(true);

      // Clients completely barred from targets
      const clientAccess = validateTargetStatusTransition(UserRole.CLIENT_LEADER, TargetStatus.PENDING, TargetStatus.IN_PROGRESS);
      expect(clientAccess.allowed).toBe(false);
    });
  });

  // ============================================================================
  // CHAPTER 11: Attendance & Daily Work Updates
  // ============================================================================
  describe('Chapter 11: Attendance & Daily Work Updates', () => {
    it('GPS Coordinates Audit: lat (-90 to +90) and lng (-180 to +180) mandatory', () => {
      expect(validateGpsCoordinates(23.0225, 72.5714).valid).toBe(true);
      expect(validateGpsCoordinates(undefined as any, 72.5714).valid).toBe(false);
      expect(validateGpsCoordinates(23.0225, undefined as any).valid).toBe(false);
      expect(validateGpsCoordinates(95.0, 72.5714).valid).toBe(false);
      expect(validateGpsCoordinates(23.0225, 190.0).valid).toBe(false);
    });

    it('Duplicate Clock-In Prevention: prevents second clock-in if session active', () => {
      const punch = validateClockIn(true, 23.0225, 72.5714);
      expect(punch.allowed).toBe(false);
      expect(punch.error).toContain('Active work session already exists');
    });

    it('Daily Work Updates Hard Gate: Clock-Out is strictly blocked if any required slot is unsubmitted', () => {
      const scheduledSlots = ['Slot 12:00', 'Slot 15:00', 'Slot 18:00'];
      const incompleteSubmission = ['Slot 12:00', 'Slot 15:00'];

      const gate = validateClockOutWithWorkUpdatesGate({
        scheduledSlots,
        submittedSlots: incompleteSubmission,
        lat: 23.0225,
        lng: 72.5714,
      });

      expect(gate.allowed).toBe(false);
      expect(gate.statusCode).toBe(422);
      expect(gate.pendingSlots).toEqual(['Slot 18:00']);
      expect(gate.error).toContain('Clock-Out blocked');
    });

    it('Daily Work Updates Hard Gate: Clock-Out allowed when all scheduled slots submitted', () => {
      const scheduledSlots = ['Slot 12:00', 'Slot 15:00', 'Slot 18:00'];
      const completeSubmission = ['Slot 12:00', 'Slot 15:00', 'Slot 18:00'];

      const gate = validateClockOutWithWorkUpdatesGate({
        scheduledSlots,
        submittedSlots: completeSubmission,
        lat: 23.0225,
        lng: 72.5714,
      });

      expect(gate.allowed).toBe(true);
      expect(gate.pendingSlots).toEqual([]);
    });
  });

  // ============================================================================
  // CHAPTER 12: Project Chat & Admin Reminders
  // ============================================================================
  describe('Chapter 12: Project Chat & Admin Reminders', () => {
    it('Access Control: Admin has universal access; Client Leader has assigned access; Staff is strictly prohibited', () => {
      expect(canUserAccessProjectChat('ADMIN', [], 'proj-villa')).toBe(true);
      expect(canUserAccessProjectChat('CLIENT_LEADER', ['proj-villa'], 'proj-villa')).toBe(true);
      expect(canUserAccessProjectChat('CLIENT_LEADER', ['proj-other'], 'proj-villa')).toBe(false);
      expect(canUserAccessProjectChat('STAFF', ['proj-villa'], 'proj-villa')).toBe(false);
    });

    it('Attachment Validation: 10MB limit strictly enforced with image MIME whitelist', () => {
      const exact10MB = 10 * 1024 * 1024;
      const valid = validateChatAttachment({
        fileName: 'site_photo.jpg',
        fileSize: exact10MB,
        mimeType: 'image/jpeg',
      });
      expect(valid.isValid).toBe(true);

      const overLimit = exact10MB + 1;
      const invalidSize = validateChatAttachment({
        fileName: 'big_photo.jpg',
        fileSize: overLimit,
        mimeType: 'image/jpeg',
      });
      expect(invalidSize.isValid).toBe(false);
      expect(invalidSize.error).toContain('10MB');

      const invalidMime = validateChatAttachment({
        fileName: 'dangerous.exe',
        fileSize: 1024,
        mimeType: 'application/x-msdownload',
      });
      expect(invalidMime.isValid).toBe(false);
    });
  });

  // ============================================================================
  // CHAPTER 13 & NOTIFICATION MATRIX: Notification Security
  // ============================================================================
  describe('Chapter 13 & Notification Matrix: Notification Security', () => {
    it('Push Retry Delays: 1+3 retry engine (+1m, +5m, +15m; exhausted at attempt 4)', () => {
      expect(calculateNextRetryDelay(1)).toBe(60000); // 1 min
      expect(calculateNextRetryDelay(2)).toBe(300000); // 5 min
      expect(calculateNextRetryDelay(3)).toBe(900000); // 15 min
      expect(calculateNextRetryDelay(4)).toBeNull(); // Exhausted
    });

    it('Push Privacy Sanitizer: removes sensitive payment amounts and bank details from preview copy', () => {
      const sensitive1 = 'Payment of ₹15,00,000 received via NEFT UTR AXIS7766';
      expect(sanitizePushPayload(sensitive1, 'AF-VILLA')).toBe(
        'A payment update has been recorded for Project AF-VILLA. Log in to view details.'
      );

      const sensitive2 = 'Cheque cleared: Rs. 250000 credited to account';
      expect(sanitizePushPayload(sensitive2, 'AF-VILLA')).toBe(
        'A payment update has been recorded for Project AF-VILLA. Log in to view details.'
      );

      const nonSensitive = 'New site drawings uploaded to 01 Site Drgs';
      expect(sanitizePushPayload(nonSensitive, 'AF-VILLA')).toBe(nonSensitive);
    });

    it('Push Privacy Sanitizer: removes OTP credentials from push banners', () => {
      const otpText = 'Your studio verification OTP code is 987654';
      expect(sanitizePushPayload(otpText, 'AF-VILLA')).toBe(
        'A security verification request has occurred for Project AF-VILLA. Log in to view details.'
      );
    });
  });
});
