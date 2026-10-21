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
});
