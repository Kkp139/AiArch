import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VerificationList } from '../src/pages/Verification/VerificationList';
import { StaffAttendance } from '../src/pages/Attendance/StaffAttendance';
import { PaymentLedger } from '../src/pages/Payments/PaymentLedger';
import { MeetingCalendar } from '../src/pages/Meetings/MeetingCalendar';

describe('Operational Views UX Verification', () => {
  it('displays Revision Counter for Staff user in VerificationList (User Spec Rule)', () => {
    const mockItems = [
      {
        id: 'ver-1',
        drawingTitle: 'Ground Floor Electrical Plan',
        category: '04_ELECTRICAL_LAYOUTS',
        revisionNumber: 3,
        status: 'REVISION_REQUIRED' as const,
        submittedAt: '2026-10-19T10:00:00Z',
      },
    ];

    render(<VerificationList userRole="STAFF" items={mockItems} />);

    // Must show Revision Counter for Staff
    expect(screen.getByText(/Rev 3/i)).toBeInTheDocument();
    expect(screen.getByText('Ground Floor Electrical Plan')).toBeInTheDocument();
  });

  it('displays Revision Counter for Admin user as well', () => {
    const mockItems = [
      {
        id: 'ver-1',
        drawingTitle: 'Foundation Layout',
        category: '02_STRUCTURAL_DRAWINGS',
        revisionNumber: 2,
        status: 'PENDING_APPROVAL' as const,
        submittedAt: '2026-10-19T10:00:00Z',
      },
    ];

    render(<VerificationList userRole="ADMIN" items={mockItems} />);
    expect(screen.getByText(/Rev 2/i)).toBeInTheDocument();
  });

  it('CLOCK-OUT HARD GATE: disables Clock-Out button and warns user when daily work updates are pending', () => {
    const onClockOutMock = vi.fn();

    render(
      <StaffAttendance
        isClockedIn={true}
        pendingUpdates={['Slot +3h (12:00)']}
        onClockIn={() => {}}
        onClockOut={onClockOutMock}
        onSubmitUpdate={() => {}}
      />
    );

    const clockOutBtn = screen.getByRole('button', { name: /clock out/i });
    expect(clockOutBtn).toBeDisabled();

    // Warning message displayed
    expect(screen.getByText(/mandatory daily update pending/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Slot \+3h \(12:00\)/i).length).toBeGreaterThan(0);
  });

  it('enables Clock-Out button when all scheduled daily updates are submitted', () => {
    const onClockOutMock = vi.fn();

    render(
      <StaffAttendance
        isClockedIn={true}
        pendingUpdates={[]} // No pending updates
        onClockIn={() => {}}
        onClockOut={onClockOutMock}
        onSubmitUpdate={() => {}}
      />
    );

    const clockOutBtn = screen.getByRole('button', { name: /clock out/i });
    expect(clockOutBtn).not.toBeDisabled();

    fireEvent.click(clockOutBtn);
    expect(onClockOutMock).toHaveBeenCalled();
  });

  it('PAYMENTS ISOLATION: strictly forbids Staff from accessing PaymentLedger', () => {
    render(<PaymentLedger userRole="STAFF" showPricing={true} payments={[]} />);
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText(/Milestone Payments/i)).not.toBeInTheDocument();
  });

  it('MEETINGS: displays exactly the 3 fixed consultation slots', () => {
    render(
      <MeetingCalendar
        projectCode="LAP"
        bookedSlots={['12:00–13:30']}
        onBookSlot={() => {}}
      />
    );

    expect(screen.getByText('12:00–13:30')).toBeInTheDocument();
    expect(screen.getByText('16:00–17:30')).toBeInTheDocument();
    expect(screen.getByText('18:00–19:30')).toBeInTheDocument();

    // 12:00–13:30 should be marked booked/disabled
    expect(screen.getByText(/booked/i)).toBeInTheDocument();
  });

  it('MEETINGS ISOLATION: strictly forbids Staff and Client Viewer from accessing MeetingCalendar', () => {
    const { rerender } = render(
      <MeetingCalendar
        projectCode="LAP"
        userRole="STAFF"
      />
    );
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('12:00–13:30')).not.toBeInTheDocument();

    rerender(
      <MeetingCalendar
        projectCode="LAP"
        userRole="CLIENT_VIEWER"
      />
    );
    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.queryByText('12:00–13:30')).not.toBeInTheDocument();

    rerender(
      <MeetingCalendar
        projectCode="LAP"
        userRole="CLIENT_LEADER"
      />
    );
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    expect(screen.getByText('12:00–13:30')).toBeInTheDocument();
  });

  it('PAYMENTS PROJECT FILTERING: associates payments strictly with their respective project and displays empty state for projects without payments', () => {
    const mockPayments = [
      {
        id: 'pay-1',
        projectId: 'proj-villa',
        projectCode: 'AF-VILLA',
        projectName: 'Villa Horizon',
        milestoneTitle: 'Villa Foundation Completed',
        amount: 250000,
        paymentMode: 'NEFT_RTGS' as const,
        referenceNumber: 'UTR-1111',
        bankName: 'HDFC Bank',
        status: 'CONFIRMED' as const,
        recordedBy: 'Admin User',
        createdAt: '2026-10-15',
      },
      {
        id: 'pay-2',
        projectId: 'proj-tower',
        projectCode: 'AF-TOWER',
        projectName: 'Skyline Tower',
        milestoneTitle: 'Tower Soil Testing',
        amount: 150000,
        paymentMode: 'CHEQUE' as const,
        referenceNumber: 'CHQ-2222',
        bankName: 'ICICI Bank',
        status: 'CONFIRMED' as const,
        recordedBy: 'Admin User',
        createdAt: '2026-10-18',
      },
    ];

    const mockProjects = [
      { id: 'proj-villa', projectCode: 'AF-VILLA', name: 'Villa Horizon' },
      { id: 'proj-tower', projectCode: 'AF-TOWER', name: 'Skyline Tower' },
      { id: 'proj-metro', projectCode: 'AMC-METRO', name: 'Metro Plaza' },
    ];

    render(
      <PaymentLedger
        userRole="ADMIN"
        showPricing={true}
        payments={mockPayments}
        projects={mockProjects}
      />
    );

    // Initial view (ALL): both projects are listed
    expect(screen.getByText('Villa Foundation Completed')).toBeInTheDocument();
    expect(screen.getByText('Tower Soil Testing')).toBeInTheDocument();

    // Filter to AF-TOWER only
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'AF-TOWER' } });

    expect(screen.getByText('Tower Soil Testing')).toBeInTheDocument();
    expect(screen.queryByText('Villa Foundation Completed')).not.toBeInTheDocument();

    // Filter to AMC-METRO (zero payments logged)
    fireEvent.change(select, { target: { value: 'AMC-METRO' } });
    expect(screen.getByText(/No Payment Records Found for AMC-METRO/i)).toBeInTheDocument();
    expect(screen.queryByText('Villa Foundation Completed')).not.toBeInTheDocument();
    expect(screen.queryByText('Tower Soil Testing')).not.toBeInTheDocument();
  });
});
