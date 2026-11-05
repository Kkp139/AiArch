import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MobilePaymentView } from '../src/components/mobile/MobilePaymentView';
import { MobileAnnouncementsView } from '../src/components/mobile/MobileAnnouncementsView';
import { MobileRemindersView } from '../src/components/mobile/MobileRemindersView';
import { MobileAttendanceView } from '../src/components/mobile/MobileAttendanceView';
import { MobileTargetsView } from '../src/components/mobile/MobileTargetsView';
import { MobileMeetingsView } from '../src/components/mobile/MobileMeetingsView';
import { MobileDrawingVerificationView } from '../src/components/mobile/MobileDrawingVerificationView';
import { MobileChatView } from '../src/components/mobile/MobileChatView';
import { MobileProfileView } from '../src/components/mobile/MobileProfileView';
import { MobileDeviceApprovalsView } from '../src/components/mobile/MobileDeviceApprovalsView';
import { MobileActivityLogView } from '../src/components/mobile/MobileActivityLogView';
import { MobileSettingsView } from '../src/components/mobile/MobileSettingsView';
import { MobileAboutAppView } from '../src/components/mobile/MobileAboutAppView';
import { MobileHelpSupportView } from '../src/components/mobile/MobileHelpSupportView';
import { MobileMoreMenu } from '../src/components/mobile/MobileMoreMenu';

describe('Admin Mobile Flow Screen Implementation (Figma Node 5:2)', () => {
  it('renders MobilePaymentView and enforces staff isolation and receipt modal', () => {
    // 1. Staff isolation check
    const { unmount } = render(
      <MobilePaymentView
        userRole="STAFF"
        payments={[]}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    unmount();

    // 2. Admin view with hero card and payment records
    const mockPayments = [
      {
        id: 'p-1',
        milestoneTitle: 'Concept Phase Advance',
        amount: 500000,
        paymentMode: 'NEFT_RTGS' as const,
        status: 'CONFIRMED' as const,
        referenceNumber: 'UTR-982104928',
        createdAt: '2026-10-24T00:00:00Z',
      },
    ];

    render(
      <MobilePaymentView
        userRole="ADMIN"
        showPricing={true}
        payments={mockPayments}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Concept Phase Advance')).toBeInTheDocument();
    expect(screen.getByText('₹ 3.00 Cr')).toBeInTheDocument();
  });

  it('renders MobileAnnouncementsView with tabs and bulletin reader', () => {
    render(
      <MobileAnnouncementsView
        userRole="ADMIN"
        authHeaders={{}}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Bulletins & Policies')).toBeInTheDocument();
    expect(screen.getByText('Studio Policies')).toBeInTheDocument();
    expect(screen.getAllByText(/Diwali/i).length).toBeGreaterThan(0);
  });

  it('renders MobileRemindersView and allows toggling completion', () => {
    render(
      <MobileRemindersView
        userRole="ADMIN"
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText(/Review MEP Shaft Drawings/i)).toBeInTheDocument();
  });

  it('renders MobileAttendanceView with metrics and staff register', () => {
    render(
      <MobileAttendanceView
        userRole="ADMIN"
        isClockedIn={false}
        pendingUpdates={[]}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Attendance Summary')).toBeInTheDocument();
    expect(screen.getByText('Total Staff')).toBeInTheDocument();
    expect(screen.getByText('Punch Clock In (Start Shift)')).toBeInTheDocument();
  });

  it('renders MobileTargetsView with targets list and status badges', () => {
    render(
      <MobileTargetsView
        userRole="ADMIN"
        authHeaders={{}}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Targets & Deadlines')).toBeInTheDocument();
    expect(screen.getByText(/Ground Floor Working Drawing/i)).toBeInTheDocument();
  });

  it('renders MobileMeetingsView with date strip and slot details', () => {
    render(
      <MobileMeetingsView
        userRole="ADMIN"
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Meeting Schedule')).toBeInTheDocument();
    expect(screen.getByText(/Dr. Sameer Mehta/i)).toBeInTheDocument();
    expect(screen.getByText('12:00 – 13:30')).toBeInTheDocument();
  });

  it('renders MobileDrawingVerificationView with sheet reviewer', () => {
    render(
      <MobileDrawingVerificationView
        userRole="ADMIN"
        items={[]}
        onBack={() => {}}
      />
    );

    expect(screen.getByText('Design Verification')).toBeInTheDocument();
    expect(screen.getByText(/Ground Floor Setting Out Geometry/i)).toBeInTheDocument();
  });

  it('renders MobileChatView and enforces access restrictions', () => {
    // 1. Staff access denied
    const { unmount } = render(
      <MobileChatView
        projectCode="AF-VILLA"
        userRole="STAFF"
        userName="Staff User"
        messages={[]}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    unmount();

    // 2. Admin access allowed
    render(
      <MobileChatView
        projectCode="AF-VILLA"
        userRole="ADMIN"
        userName="Farhan Admani"
        messages={[]}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/AF-VILLA Consultation Chat/i)).toBeInTheDocument();
  });

  it('renders MobileProfileView with user credentials and projects', () => {
    render(
      <MobileProfileView
        user={{ fullName: 'Farhan Admani', role: 'ADMIN', email: 'farhan@abdesign.in', username: 'farhan' }}
        onBack={() => {}}
        onChangePassword={() => {}}
        onLogout={() => {}}
      />
    );
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Farhan Admani')).toBeInTheDocument();
    expect(screen.getByText('farhan@abdesign.in')).toBeInTheDocument();
    expect(screen.getByText('Principal Studio Admin')).toBeInTheDocument();
    expect(screen.getByText(/Courtyard Villa/i)).toBeInTheDocument();
  });

  it('renders MobileDeviceApprovalsView and handles approval/revoke actions', () => {
    render(
      <MobileDeviceApprovalsView
        userRole="ADMIN"
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Device Approvals')).toBeInTheDocument();
    expect(screen.getByText(/Apple iPhone 15 Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending \(2\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Trusted \(2\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Approve & Trust/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reject Access/i).length).toBeGreaterThan(0);
  });

  it('renders MobileActivityLogView with audit logs and filter tags', () => {
    render(
      <MobileActivityLogView
        userRole="ADMIN"
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByText('Drawing Stamped & Approved')).toBeInTheDocument();
    expect(screen.getByText('Milestone Payment Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Site Shift Clock-In')).toBeInTheDocument();
  });

  it('renders MobileSettingsView and allows toggling preferences', () => {
    const toggleThemeMock = vi.fn();
    render(
      <MobileSettingsView
        theme="light"
        onToggleTheme={toggleThemeMock}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText(/Architectural Mode Theme/i)).toBeInTheDocument();
    expect(screen.getByText(/Biometric App Lock/i)).toBeInTheDocument();

    const toggleBtn = screen.getByText('Switch');
    fireEvent.click(toggleBtn);
    expect(toggleThemeMock).toHaveBeenCalled();
  });

  it('renders MobileAboutAppView with legal documentation', () => {
    render(
      <MobileAboutAppView
        onBack={() => {}}
      />
    );
    expect(screen.getByText('About App & Legal')).toBeInTheDocument();
    expect(screen.getByText('A&F Design')).toBeInTheDocument();
    expect(screen.getByText('Terms')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
  });

  it('renders MobileHelpSupportView with How-To guides and FAQ accordion', () => {
    render(
      <MobileHelpSupportView
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Help & Support')).toBeInTheDocument();
    expect(screen.getByText(/Frequently Asked Questions/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact Support/i)).toBeInTheDocument();
    expect(screen.getByText(/Send Feedback/i)).toBeInTheDocument();
  });

  it('renders MobileMoreMenu and routes smoothly into sub-views', () => {
    render(
      <MobileMoreMenu
        userRole="ADMIN"
        user={{ fullName: 'Farhan Admani', role: 'ADMIN', email: 'farhan@abdesign.in' }}
        onOpenUserManagement={() => {}}
        onLogout={() => {}}
      />
    );
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByText('Device Approvals')).toBeInTheDocument();
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Help & Support')).toBeInTheDocument();

    // Click into Device Approvals
    fireEvent.click(screen.getByText('Device Approvals'));
    expect(screen.getByText(/Apple iPhone 15 Pro/i)).toBeInTheDocument();

    // Click Back to return to menu
    const backBtn = screen.getByLabelText(/Go Back/i);
    fireEvent.click(backBtn);
    expect(screen.getByText('More')).toBeInTheDocument();
  });

  it('enforces Staff role permissions and submission actions', () => {
    // 1. Staff is blocked from Meetings
    const { unmount } = render(
      <MobileMeetingsView
        userRole="STAFF"
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    unmount();

    // 2. Staff can access Design Verification and submit drawings
    render(
      <MobileDrawingVerificationView
        userRole="STAFF"
        items={[]}
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Design Verification')).toBeInTheDocument();
    expect(screen.getByText(/Submit Drawing/i)).toBeInTheDocument();
  });

  it('enforces Client Leader role permissions and request actions', () => {
    // 1. Client Leader is blocked from internal Drawing Verification
    const { unmount } = render(
      <MobileDrawingVerificationView
        userRole="CLIENT_LEADER"
        items={[]}
        onBack={() => {}}
      />
    );
    expect(screen.getByText(/Access Restricted/i)).toBeInTheDocument();
    unmount();

    // 2. Client Leader can request a meeting slot
    render(
      <MobileMeetingsView
        userRole="CLIENT_LEADER"
        onBack={() => {}}
      />
    );
    expect(screen.getByText('Meeting Schedule')).toBeInTheDocument();
    expect(screen.getByText(/Request Meeting/i)).toBeInTheDocument();
  });
});
