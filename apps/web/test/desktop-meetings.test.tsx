import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopMeetingsView, FIXED_DAILY_SLOTS } from '../src/components/desktop/DesktopMeetingsView';

describe('Task 5: Desktop Meetings Scheduler', () => {
  it('blocks STAFF role strictly per Master Spec Chapter 14', () => {
    render(<DesktopMeetingsView userRole="STAFF" />);

    expect(screen.getByTestId('meetings-staff-restricted')).toBeInTheDocument();
    expect(screen.getByText('Meetings Access Restricted')).toBeInTheDocument();
    expect(screen.queryByTestId('daily-slots-grid')).not.toBeInTheDocument();
  });

  it('renders weekly calendar and the 3 studio daily slots (12:00, 16:00, 18:00)', () => {
    render(<DesktopMeetingsView userRole="ADMIN" />);

    expect(screen.getByText('Architectural Consultation Scheduler')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-week-bar')).toBeInTheDocument();
    expect(screen.getByTestId('daily-slots-grid')).toBeInTheDocument();

    // Verify 3 daily slots
    expect(FIXED_DAILY_SLOTS).toHaveLength(3);
    expect(screen.getByTestId('slot-card-slot-1')).toBeInTheDocument();
    expect(screen.getByTestId('slot-card-slot-2')).toBeInTheDocument();
    expect(screen.getByTestId('slot-card-slot-3')).toBeInTheDocument();
  });

  it('renders 1-tap Google Meet link for virtual meetings', () => {
    render(<DesktopMeetingsView userRole="ADMIN" />);

    // Slot 1 has virtual meet url
    const meetBtn = screen.getByTestId('meet-btn-m-101');
    expect(meetBtn).toBeInTheDocument();
    expect(meetBtn).toHaveAttribute('href', 'https://meet.google.com/xyz-af-villa');
  });

  it('ADMIN can schedule consultation directly via centered modal dialog', () => {
    const onScheduleSuccess = vi.fn();
    render(<DesktopMeetingsView userRole="ADMIN" onScheduleSuccess={onScheduleSuccess} />);

    // Open schedule modal
    const scheduleBtn = screen.getByTestId('admin-schedule-meeting-btn');
    fireEvent.click(scheduleBtn);

    expect(screen.getByTestId('schedule-meeting-modal')).toBeInTheDocument();

    // Fill agenda
    const agendaInput = screen.getByTestId('textarea-meeting-agenda');
    fireEvent.change(agendaInput, {
      target: { value: 'Structural column alignment & plumbing sleeve approval' },
    });

    // Confirm
    const submitBtn = screen.getByTestId('confirm-schedule-btn');
    fireEvent.click(submitBtn);

    expect(onScheduleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        agenda: 'Structural column alignment & plumbing sleeve approval',
        status: 'CONFIRMED',
      })
    );
  });

  it('CLIENT_LEADER creates consultation request with PENDING_APPROVAL status', () => {
    const onScheduleSuccess = vi.fn();
    render(<DesktopMeetingsView userRole="CLIENT_LEADER" onScheduleSuccess={onScheduleSuccess} />);

    // Client sees Request Meeting button
    const requestBtn = screen.getByTestId('client-request-meeting-btn');
    fireEvent.click(requestBtn);

    expect(screen.getByTestId('schedule-meeting-modal')).toBeInTheDocument();

    const agendaInput = screen.getByTestId('textarea-meeting-agenda');
    fireEvent.change(agendaInput, {
      target: { value: 'Requesting review of poolside terrace finishes' },
    });

    const submitBtn = screen.getByTestId('confirm-schedule-btn');
    fireEvent.click(submitBtn);

    expect(onScheduleSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PENDING_APPROVAL',
      })
    );
  });

  it('opens reschedule modal and updates meeting status to RESCHEDULED', () => {
    render(<DesktopMeetingsView userRole="ADMIN" />);

    const rescheduleBtn = screen.getByTestId('reschedule-btn-m-101');
    fireEvent.click(rescheduleBtn);

    expect(screen.getByTestId('reschedule-meeting-modal')).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('confirm-reschedule-btn');
    fireEvent.click(confirmBtn);

    // Modal closes and meeting status becomes Rescheduled
    expect(screen.queryByTestId('reschedule-meeting-modal')).not.toBeInTheDocument();
    expect(screen.getByText('Rescheduled')).toBeInTheDocument();
  });
});
