import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Shell & Responsive Infrastructure
import { DesktopSidebar, getSidebarNavItems } from '../src/components/desktop/DesktopSidebar';
import { DesktopTopNav } from '../src/components/desktop/DesktopTopNav';
import { DesktopShell } from '../src/components/desktop/DesktopShell';
import { ResponsiveShell } from '../src/components/layout/ResponsiveShell';
import { getResponsiveState } from '../src/hooks/useResponsive';
import { UserRole } from '../src/context/AuthContext';

// Functional Views
import { DesktopDashboardView } from '../src/components/desktop/DesktopDashboardView';
import { DesktopProjectsView, OFFICIAL_16_FOLDERS } from '../src/components/desktop/DesktopProjectsView';
import { DesktopMeetingsView, FIXED_DAILY_SLOTS } from '../src/components/desktop/DesktopMeetingsView';
import { DesktopPaymentsView } from '../src/components/desktop/DesktopPaymentsView';
import { DesktopVerificationView } from '../src/components/desktop/DesktopVerificationView';
import { DesktopAttendanceView } from '../src/components/desktop/DesktopAttendanceView';
import { DesktopTargetsView } from '../src/components/desktop/DesktopTargetsView';
import { DesktopChatView, ProjectThread } from '../src/components/desktop/DesktopChatView';
import { UploadModal, checkNamingConvention } from '../src/components/vault/UploadModal';
import { StaffAttendance } from '../src/pages/Attendance/StaffAttendance';

describe('ProNex-ArchAI Master QA Frontend Scenarios & Cross-Device Flows', () => {
  // ============================================================================
  // 1. UNIVERSAL RESPONSIVENESS & DEVICE CONTINUITY
  // ============================================================================
  describe('1. Universal Responsiveness & Breakpoint Continuity', () => {
    it('Mobile Tier (< 768px): iPhone resolution (390x844) activates Mobile Shell with Bottom Navigation', () => {
      const state = getResponsiveState(390, 844);
      expect(state.isMobile).toBe(true);
      expect(state.isTablet).toBe(false);
      expect(state.isDesktop).toBe(false);

      window.innerWidth = 390;
      window.innerHeight = 844;
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

      render(
        <ResponsiveShell
          user={adminUser}
          desktopContent={<div data-testid="desktop-view">Desktop View</div>}
          mobileContent={<div data-testid="mobile-view">Mobile Studio Experience</div>}
        />
      );

      expect(screen.getByTestId('mobile-view')).toBeInTheDocument();
      expect(screen.queryByTestId('desktop-shell-root')).not.toBeInTheDocument();
    });

    it('Tablet Tier (768px - 1023px): iPad resolution (768x1024) triggers Tablet Responsive Mode', () => {
      const state768 = getResponsiveState(768, 1024);
      expect(state768.isMobile).toBe(false);
      expect(state768.isTablet).toBe(true);
      expect(state768.isDesktop).toBe(false);

      const state1023 = getResponsiveState(1023, 768);
      expect(state1023.isTablet).toBe(true);
      expect(state1023.isDesktop).toBe(false);
    });

    it('MacBook / Desktop Tier (1024px - 1439px): 1280x800 activates Desktop Shell with Sidebar (316px)', () => {
      const state = getResponsiveState(1280, 800);
      expect(state.isDesktop).toBe(true);
      expect(state.isMobile).toBe(false);
      expect(state.isLargeDesktop).toBe(false);

      window.innerWidth = 1280;
      window.innerHeight = 800;
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

      render(
        <ResponsiveShell
          user={adminUser}
          desktopContent={<div data-testid="desktop-workspace">Desktop Workspace Content</div>}
          mobileContent={<div data-testid="mobile-workspace">Mobile Workspace Content</div>}
        />
      );

      expect(screen.getByTestId('desktop-shell-root')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-workspace')).toBeInTheDocument();
      expect(screen.queryByTestId('mobile-workspace')).not.toBeInTheDocument();
    });

    it('4K Desktop Tier (>= 1440px / 1920px): 2560x1440 activates Safe Canvas Container and 4K state', () => {
      const state4K = getResponsiveState(2560, 1440);
      expect(state4K.isDesktop).toBe(true);
      expect(state4K.isLargeDesktop).toBe(true);
      expect(state4K.is4K).toBe(true);

      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      render(
        <DesktopShell user={adminUser}>
          <div data-testid="high-res-canvas">4K High-Res Content</div>
        </DesktopShell>
      );

      expect(screen.getByTestId('desktop-shell-root')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-canvas-container')).toBeInTheDocument();
      expect(screen.getByTestId('high-res-canvas')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 2. CHAPTER 2 & 3: ROLES, NAVIGATION & USER DISPLAY CONVENTION
  // ============================================================================
  describe('2. Chapter 2 & 3: Roles, Navigation Filtering & User Display Convention', () => {
    it('ADMIN role: renders exactly 12 navigation items across all studio modules', () => {
      const items = getSidebarNavItems('ADMIN', true);
      expect(items).toHaveLength(12);
      expect(items.map((i) => i.label)).toEqual([
        'Dashboard',
        'Projects',
        'Meetings',
        'Payments',
        'Design Verification',
        'Attendance',
        'Targets',
        'Updates',
        'Announcements',
        'Policies',
        'Reminders',
        'Settings',
      ]);
    });

    it('STAFF role: renders exactly 7 navigation links with Payments and Meetings strictly hidden', () => {
      const items = getSidebarNavItems('STAFF', false);
      expect(items).toHaveLength(7);
      expect(items.map((i) => i.label)).not.toContain('Payments');
      expect(items.map((i) => i.label)).not.toContain('Meetings');
      expect(items.map((i) => i.label)).not.toContain('Reminders');
      expect(items.map((i) => i.label)).not.toContain('Settings');
    });

    it('CLIENT_LEADER role: hides Payments when showPricing is false; shows Payments when showPricing is true', () => {
      const hiddenPricing = getSidebarNavItems('CLIENT_LEADER', false);
      expect(hiddenPricing).toHaveLength(7);
      expect(hiddenPricing.map((i) => i.label)).not.toContain('Payments');

      const visiblePricing = getSidebarNavItems('CLIENT_LEADER', true);
      expect(visiblePricing).toHaveLength(8);
      expect(visiblePricing.map((i) => i.label)).toContain('Payments');
    });

    it('Display Convention: displays Full Name only and never displays role in parentheses', () => {
      const mockUser = { fullName: 'Kamal Patel', role: 'ADMIN' as const };
      render(<DesktopTopNav user={mockUser} />);

      expect(screen.getByText('Kamal Patel')).toBeInTheDocument();
      expect(screen.queryByText(/Kamal Patel \(Admin\)/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\(Admin\)/i)).not.toBeInTheDocument();
    });

    it('Studio Identity: renders studio branding "A&F Design" and never displays "ProNex"', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      render(<DesktopSidebar user={mockUser} />);

      expect(screen.getByText('A&F Design')).toBeInTheDocument();
      expect(screen.getByText('ARCHITECTURE & INTERIORS')).toBeInTheDocument();
      expect(screen.queryByText(/ProNex/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 3. CHAPTER 4: PROJECT LIFECYCLE & 16-FOLDER VAULT UI
  // ============================================================================
  describe('3. Chapter 4: Project Lifecycle & 16-Folder Vault UI', () => {
    it('Renders all 16 canonical folders across Concept, Construction, and Other phases', () => {
      render(<DesktopProjectsView userRole="ADMIN" />);

      expect(OFFICIAL_16_FOLDERS).toHaveLength(16);
      expect(screen.getByTestId('folder-grid')).toBeInTheDocument();

      // Concept Phase (6 folders)
      expect(screen.getByText('Site Drawings & Topography')).toBeInTheDocument();
      expect(screen.getByText('Zoning & Space Planning')).toBeInTheDocument();
      expect(screen.getByText('Space & Object Studies')).toBeInTheDocument();
      expect(screen.getByText('Complete Architectural Package')).toBeInTheDocument();
      expect(screen.getByText('Material Selection & Moodboards')).toBeInTheDocument();
      expect(screen.getByText('3D Photorealistic CGI Renders')).toBeInTheDocument();

      // Construction Phase (9 folders)
      expect(screen.getByText('Civil Footing & Columns')).toBeInTheDocument();
      expect(screen.getByText('Plumbing & Drainage')).toBeInTheDocument();
      expect(screen.getByText('Fire Hydrant & Safety')).toBeInTheDocument();
      expect(screen.getByText('HVAC Ducting & Chilled Water')).toBeInTheDocument();
      expect(screen.getByText('Flooring & Finishes')).toBeInTheDocument();
      expect(screen.getByText('Reflected Ceiling & Lighting')).toBeInTheDocument();
      expect(screen.getByText('Electrical SLD & Conduit')).toBeInTheDocument();
      expect(screen.getByText('Wall Elevations & Sections')).toBeInTheDocument();
      expect(screen.getByText('Joinery & Element Details')).toBeInTheDocument();

      // Catch-all
      expect(screen.getByText('Other Reference & Handover')).toBeInTheDocument();
    });

    it('Phase filter tabs isolate Concept (6), Construction (9), and Other (1)', () => {
      render(<DesktopProjectsView userRole="ADMIN" />);

      // Filter Concept
      fireEvent.click(screen.getByTestId('phase-tab-concept'));
      expect(screen.getByText('Site Drawings & Topography')).toBeInTheDocument();
      expect(screen.queryByText('Civil Footing & Columns')).not.toBeInTheDocument();

      // Filter Construction
      fireEvent.click(screen.getByTestId('phase-tab-construction'));
      expect(screen.getByText('Civil Footing & Columns')).toBeInTheDocument();
      expect(screen.queryByText('Site Drawings & Topography')).not.toBeInTheDocument();

      // Filter Other
      fireEvent.click(screen.getByTestId('phase-tab-other'));
      expect(screen.getByText('Other Reference & Handover')).toBeInTheDocument();
      expect(screen.queryByText('Civil Footing & Columns')).not.toBeInTheDocument();
    });

    it('Switches seamlessly between High-Density Grid and Data Table views', () => {
      render(<DesktopProjectsView userRole="ADMIN" />);

      expect(screen.getByTestId('folder-grid')).toBeInTheDocument();
      expect(screen.queryByTestId('folder-table')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('view-toggle-table'));
      expect(screen.getByTestId('folder-table')).toBeInTheDocument();
      expect(screen.queryByTestId('folder-grid')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('view-toggle-grid'));
      expect(screen.getByTestId('folder-grid')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 4. CHAPTER 5: DOCUMENT VAULT & INTERACTIVE UPLOAD MODAL
  // ============================================================================
  describe('4. Chapter 5: Document Vault & Interactive Upload Modal', () => {
    it('Conforming filename routes automatically to designated category without warning', () => {
      const conformingName = 'LAP_ARCH_PLANS_GroundFloor_v1.dwg';
      const check = checkNamingConvention(conformingName);

      expect(check.matches).toBe(true);
      expect(check.routedCategory).toBe('01_ARCHITECTURAL_PLANS');
    });

    it('Non-conforming filename triggers interactive warning alerting user about 03_OTHER routing', async () => {
      const onUpload = vi.fn();
      render(
        <UploadModal
          projectCode="AF"
          isOpen={true}
          onClose={() => {}}
          onUpload={onUpload}
        />
      );

      const fileInput = screen.getByLabelText(/select file/i);
      const rawFile = new File(['mock content'], 'site_photo_camera.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [rawFile] } });

      // Interactive warning modal appears
      expect(await screen.findByText(/does not match the standard naming format/i)).toBeInTheDocument();
      expect(screen.getAllByText(/03_OTHER/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /rename now/i })).toBeInTheDocument();
    });

    it('Inline Rename: allows user to correct filename to match convention', async () => {
      const onUpload = vi.fn();
      render(
        <UploadModal
          projectCode="AF"
          isOpen={true}
          onClose={() => {}}
          onUpload={onUpload}
        />
      );

      const fileInput = screen.getByLabelText(/select file/i);
      const rawFile = new File(['mock content'], 'unformatted_dwg.dwg', { type: 'image/vnd.dwg' });
      fireEvent.change(fileInput, { target: { files: [rawFile] } });

      // Click "Rename Now"
      const renameBtn = await screen.findByRole('button', { name: /rename now/i });
      fireEvent.click(renameBtn);

      // Enter formatted filename
      const renameInput = screen.getByPlaceholderText(/enter formatted filename/i);
      fireEvent.change(renameInput, { target: { value: 'AF_ARCH_PLANS_Level1_v2.dwg' } });

      const confirmBtn = screen.getByRole('button', { name: /apply rename/i });
      fireEvent.click(confirmBtn);

      // Warning disappears and routed category updates
      expect(screen.queryByText(/does not match the standard naming format/i)).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 5. CHAPTER 6: DESIGN VERIFICATION UI WORKFLOW
  // ============================================================================
  describe('5. Chapter 6: Design Verification UI Workflow', () => {
    it('Client roles strictly restricted from internal design verification workflow', () => {
      render(<DesktopVerificationView userRole="CLIENT_LEADER" />);

      expect(screen.getByTestId('verification-client-restricted')).toBeInTheDocument();
      expect(screen.getByText('Internal Studio Verification Workflow')).toBeInTheDocument();
      expect(screen.queryByTestId('master-detail-split')).not.toBeInTheDocument();
    });

    it('Admin Workflow: 3-pane master detail view, official studio seal approval, and revision modal', () => {
      const onApprove = vi.fn();
      const onRequestRevision = vi.fn();

      render(
        <DesktopVerificationView
          userRole="ADMIN"
          onApprove={onApprove}
          onRequestRevision={onRequestRevision}
        />
      );

      // 3-Pane structure
      expect(screen.getByTestId('master-detail-split')).toBeInTheDocument();
      expect(screen.getByTestId('verification-queue-column')).toBeInTheDocument();
      expect(screen.getByTestId('verification-canvas-column')).toBeInTheDocument();
      expect(screen.getByTestId('verification-inspector-column')).toBeInTheDocument();

      // Approve with Studio Seal
      const approveBtn = screen.getByTestId('approve-seal-btn');
      fireEvent.click(approveBtn);
      expect(onApprove).toHaveBeenCalledWith('ver-101');
      expect(screen.getByTestId('official-studio-seal')).toBeInTheDocument();

      // Request Revision dialog
      const revisionBtn = screen.getByTestId('request-revision-btn');
      fireEvent.click(revisionBtn);
      expect(screen.getByTestId('revision-modal')).toBeInTheDocument();

      const notesTextarea = screen.getByTestId('textarea-revision-feedback');
      fireEvent.change(notesTextarea, { target: { value: 'Revise column sleeve positions on grid B2' } });

      const submitRevision = screen.getByTestId('submit-revision-btn');
      fireEvent.click(submitRevision);
      expect(onRequestRevision).toHaveBeenCalledWith('ver-101', 'Revise column sleeve positions on grid B2');
    });

    it('Staff Workflow: allows Staff to submit technical drawing for verification', () => {
      const onSubmitDrawing = vi.fn();
      render(<DesktopVerificationView userRole="STAFF" onSubmitDrawing={onSubmitDrawing} />);

      const submitBtn = screen.getByTestId('staff-submit-drawing-btn');
      fireEvent.click(submitBtn);

      expect(screen.getByTestId('staff-submit-drawing-modal')).toBeInTheDocument();
      const titleInput = screen.getByTestId('input-submit-title');
      fireEvent.change(titleInput, { target: { value: 'Staircase Railing Joinery Details' } });

      const confirmBtn = screen.getByTestId('confirm-staff-submit-btn');
      fireEvent.click(confirmBtn);

      expect(onSubmitDrawing).toHaveBeenCalledWith(
        expect.objectContaining({
          drawingTitle: 'Staircase Railing Joinery Details',
          status: 'PENDING_APPROVAL',
        })
      );
    });
  });

  // ============================================================================
  // 6. CHAPTER 7: MEETING MANAGEMENT UI WORKFLOW
  // ============================================================================
  describe('6. Chapter 7: Meeting Management UI Workflow', () => {
    it('Staff role strictly restricted from scheduling meetings', () => {
      render(<DesktopMeetingsView userRole="STAFF" />);

      expect(screen.getByTestId('meetings-staff-restricted')).toBeInTheDocument();
      expect(screen.getByText('Meetings Access Restricted')).toBeInTheDocument();
      expect(screen.queryByTestId('daily-slots-grid')).not.toBeInTheDocument();
    });

    it('Renders 3 fixed studio daily slots (12:00, 16:00, 18:00) and 1-tap Google Meet button', () => {
      render(<DesktopMeetingsView userRole="ADMIN" />);

      expect(FIXED_DAILY_SLOTS).toHaveLength(3);
      expect(screen.getByTestId('slot-card-slot-1')).toBeInTheDocument();
      expect(screen.getByTestId('slot-card-slot-2')).toBeInTheDocument();
      expect(screen.getByTestId('slot-card-slot-3')).toBeInTheDocument();

      // 1-Tap Google Meet action
      const meetBtn = screen.getByTestId('meet-btn-m-101');
      expect(meetBtn).toHaveAttribute('href', expect.stringContaining('meet.google.com'));
    });

    it('Admin can schedule a meeting via centered modal dialog', () => {
      const onScheduleSuccess = vi.fn();
      render(<DesktopMeetingsView userRole="ADMIN" onScheduleSuccess={onScheduleSuccess} />);

      fireEvent.click(screen.getByTestId('admin-schedule-meeting-btn'));
      expect(screen.getByTestId('schedule-meeting-modal')).toBeInTheDocument();

      const agendaInput = screen.getByTestId('textarea-meeting-agenda');
      fireEvent.change(agendaInput, { target: { value: 'Structural slab reinforcement sign-off' } });

      fireEvent.click(screen.getByTestId('confirm-schedule-btn'));
      expect(onScheduleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          agenda: 'Structural slab reinforcement sign-off',
        })
      );
    });
  });

  // ============================================================================
  // 7. CHAPTER 8: PAYMENTS & FINANCIAL LEDGER UI WORKFLOW
  // ============================================================================
  describe('7. Chapter 8: Payments & Financial Ledger UI Workflow', () => {
    it('Staff role access strictly denied with security warning banner', () => {
      render(<DesktopPaymentsView userRole="STAFF" />);

      expect(screen.getByTestId('payments-staff-restricted')).toBeInTheDocument();
      expect(screen.getByText(/Access Denied: Financial Ledger/i)).toBeInTheDocument();
      expect(screen.queryByTestId('payment-ledger-table')).not.toBeInTheDocument();
    });

    it('Client roles blocked when showPricing is false', () => {
      render(<DesktopPaymentsView userRole="CLIENT_LEADER" showPricing={false} />);

      expect(screen.getByTestId('payments-pricing-restricted')).toBeInTheDocument();
      expect(screen.getByText(/Pricing Transparency Restricted/i)).toBeInTheDocument();
      expect(screen.queryByTestId('payment-ledger-table')).not.toBeInTheDocument();
    });

    it('Admin view renders metrics banner with collection ratio % and ledger table', () => {
      render(
        <DesktopPaymentsView
          userRole="ADMIN"
          totalAgreedFee={5000000}
          advanceReceived={3500000}
        />
      );

      const banner = screen.getByTestId('payment-metrics-banner');
      expect(banner).toBeInTheDocument();
      expect(screen.getByText('₹50,00,000')).toBeInTheDocument();
      expect(screen.getByText('₹35,00,000')).toBeInTheDocument();
      expect(screen.getAllByText('₹15,00,000').length).toBeGreaterThan(0);
      expect(screen.getByText('70%')).toBeInTheDocument(); // 35L / 50L = 70%

      expect(screen.getByTestId('payment-ledger-table')).toBeInTheDocument();
    });

    it('Opens receipt preview modal and triggers receipt download', () => {
      const onDownloadReceipt = vi.fn();
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<DesktopPaymentsView userRole="ADMIN" onDownloadReceipt={onDownloadReceipt} />);

      fireEvent.click(screen.getByTestId('receipt-preview-btn-pay-001'));
      expect(screen.getByTestId('receipt-preview-modal')).toBeInTheDocument();
      expect(screen.getByText('Official Architectural Tax Receipt')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('download-receipt-pdf-btn'));
      expect(onDownloadReceipt).toHaveBeenCalledWith('pay-001');
    });
  });

  // ============================================================================
  // 8. CHAPTER 10: STAFF TARGETS & PRODUCTIVITY UI WORKFLOW
  // ============================================================================
  describe('8. Chapter 10: Staff Targets & Productivity UI Workflow', () => {
    it('Client roles strictly restricted from staff targets board', () => {
      const clientUser = { fullName: 'Dr. Sameer Mehta', role: 'CLIENT_LEADER' as const };
      render(<DesktopTargetsView user={clientUser} />);

      expect(screen.getByTestId('targets-restricted-card')).toBeInTheDocument();
      expect(screen.queryByTestId('targets-data-table')).not.toBeInTheDocument();
    });

    it('Admin renders targets board, metrics, and create modal', () => {
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onCreateTarget = vi.fn();

      render(<DesktopTargetsView user={adminUser} onCreateTarget={onCreateTarget} />);

      expect(screen.getByTestId('targets-metric-in-progress')).toBeInTheDocument();
      expect(screen.getByTestId('targets-metric-submitted')).toBeInTheDocument();
      expect(screen.getByTestId('targets-metric-completed')).toBeInTheDocument();
      expect(screen.getByTestId('targets-data-table')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('targets-create-btn'));
      expect(screen.getByTestId('targets-create-modal')).toBeInTheDocument();
    });

    it('Staff can submit target completion notes for Admin review', () => {
      const staffUser = { fullName: 'Rajesh Patel', role: 'STAFF' as const };
      const onSubmitReview = vi.fn();

      render(<DesktopTargetsView user={staffUser} onSubmitReview={onSubmitReview} />);

      fireEvent.click(screen.getByTestId('target-submit-btn-tgt-1'));
      expect(screen.getByTestId('target-submit-modal')).toBeInTheDocument();

      const notesInput = screen.getByTestId('target-submit-notes');
      fireEvent.change(notesInput, { target: { value: 'Working drawing set complete.' } });

      fireEvent.click(screen.getByTestId('target-submit-confirm'));
      expect(onSubmitReview).toHaveBeenCalledWith('tgt-1', 'Working drawing set complete.');
    });
  });

  // ============================================================================
  // 9. CHAPTER 11: STAFF ATTENDANCE & CLOCK-OUT HARD GATE UI
  // ============================================================================
  describe('9. Chapter 11: Staff Attendance & Clock-Out Hard Gate UI', () => {
    it('GPS Punch: initiates clock-in with GPS verification message', () => {
      const onClockIn = vi.fn();
      render(
        <StaffAttendance
          isClockedIn={false}
          pendingUpdates={[]}
          onClockIn={onClockIn}
        />
      );

      const punchBtn = screen.getByRole('button', { name: /punch clock-in \(gps\)/i });
      fireEvent.click(punchBtn);

      expect(screen.getByText(/acquiring high-accuracy gps coordinates/i)).toBeInTheDocument();
    });

    it('CLOCK-OUT HARD GATE: Clock-Out is strictly disabled when daily updates are pending', () => {
      const onClockOut = vi.fn();
      render(
        <StaffAttendance
          isClockedIn={true}
          pendingUpdates={['Slot 13:00', 'Slot 17:30']}
          onClockOut={onClockOut}
        />
      );

      // Warning banner present
      expect(screen.getByText('Mandatory Daily Update Pending')).toBeInTheDocument();
      expect(screen.getByText('Slot 13:00')).toBeInTheDocument();
      expect(screen.getByText('Slot 17:30')).toBeInTheDocument();

      // Clock-Out button is disabled
      const clockOutBtn = screen.getByRole('button', { name: /clock out/i });
      expect(clockOutBtn).toBeDisabled();
      fireEvent.click(clockOutBtn);
      expect(onClockOut).not.toHaveBeenCalled();
    });

    it('CLOCK-OUT HARD GATE: Clock-Out becomes enabled when all scheduled daily updates are submitted', () => {
      const onClockOut = vi.fn();
      render(
        <StaffAttendance
          isClockedIn={true}
          pendingUpdates={[]} // All submitted!
          onClockOut={onClockOut}
        />
      );

      // No warning banner
      expect(screen.queryByText('Mandatory Daily Update Pending')).not.toBeInTheDocument();

      // Clock-Out button is enabled
      const clockOutBtn = screen.getByRole('button', { name: /clock out/i });
      expect(clockOutBtn).not.toBeDisabled();
      fireEvent.click(clockOutBtn);
      expect(onClockOut).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // 10. CHAPTER 12: 2-PANE PROJECT CHAT UI
  // ============================================================================
  describe('10. Chapter 12: 2-Pane Project Chat UI', () => {
    const mockThreads: ProjectThread[] = [
      {
        id: 'thread-1',
        projectCode: 'AF-VILLA',
        projectName: 'Courtyard Villa',
        clientName: 'Dr. Sameer Mehta',
        lastMessage: 'The cantilever structural drawing package has been reviewed.',
        lastMessageTime: '10:30 AM',
        unreadCount: 2,
      },
    ];

    it('Renders 2-pane layout (threads list + conversation window) and sends message', () => {
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onSendMessage = vi.fn();

      render(
        <DesktopChatView
          user={adminUser}
          threads={mockThreads}
          activeProjectCode="AF-VILLA"
          onSendMessage={onSendMessage}
        />
      );

      expect(screen.getByTestId('chat-threads-pane')).toBeInTheDocument();
      expect(screen.getByTestId('chat-conversation-pane')).toBeInTheDocument();
      expect(screen.getByText('Courtyard Villa (AF-VILLA)')).toBeInTheDocument();

      const input = screen.getByTestId('chat-input-textarea');
      fireEvent.change(input, { target: { value: 'Approved structural drawings are now in the vault.' } });

      fireEvent.click(screen.getByTestId('chat-send-btn'));
      expect(onSendMessage).toHaveBeenCalledWith('Approved structural drawings are now in the vault.', undefined);
    });
  });
});
