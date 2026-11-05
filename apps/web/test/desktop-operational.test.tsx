import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopAttendanceView } from '../src/components/desktop/DesktopAttendanceView';
import { DesktopTargetsView } from '../src/components/desktop/DesktopTargetsView';

describe('Task 9: Desktop Attendance & Targets Operational Views', () => {
  describe('DesktopAttendanceView', () => {
    it('renders full staff roster, geofence audit, and metrics for ADMIN', () => {
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onApproveRegularization = vi.fn();

      render(
        <DesktopAttendanceView
          user={adminUser}
          onApproveRegularization={onApproveRegularization}
        />
      );

      // Attendance Metrics
      expect(screen.getByTestId('attendance-metric-total')).toBeInTheDocument();
      expect(screen.getByTestId('attendance-metric-present')).toBeInTheDocument();
      expect(screen.getByTestId('attendance-metric-onsite')).toBeInTheDocument();

      // Geofence status card
      expect(screen.getByTestId('attendance-geofence-card')).toBeInTheDocument();
      expect(screen.getByText(/Ahmedabad Studio HQ/i)).toBeInTheDocument();

      // Staff Roster Table
      expect(screen.getByTestId('attendance-roster-table')).toBeInTheDocument();
      expect(screen.getByText('Farhan Admani')).toBeInTheDocument();
      expect(screen.getByText('Sonu Sharma')).toBeInTheDocument();

      // Tabs: switch to Regularization
      const regTab = screen.getByTestId('attendance-tab-regularization');
      fireEvent.click(regTab);
      expect(screen.getByTestId('attendance-regularization-queue')).toBeInTheDocument();
    });

    it('renders clock-in / clock-out controls for STAFF role', () => {
      const staffUser = { fullName: 'Priya Mehta', role: 'STAFF' as const };
      const onClockIn = vi.fn();

      render(
        <DesktopAttendanceView
          user={staffUser}
          isClockedIn={false}
          onClockIn={onClockIn}
        />
      );

      const clockInBtn = screen.getByTestId('attendance-clock-in-btn');
      expect(clockInBtn).toBeInTheDocument();
      fireEvent.click(clockInBtn);
      expect(onClockIn).toHaveBeenCalledTimes(1);
    });

    it('restricts CLIENT_LEADER role with security card', () => {
      const clientUser = { fullName: 'Dr. Sameer Mehta', role: 'CLIENT_LEADER' as const };

      render(<DesktopAttendanceView user={clientUser} />);

      expect(screen.getByTestId('attendance-restricted-card')).toBeInTheDocument();
      expect(screen.queryByTestId('attendance-roster-table')).not.toBeInTheDocument();
    });
  });

  describe('DesktopTargetsView', () => {
    it('renders targets board, metrics, and create modal for ADMIN', () => {
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onCreateTarget = vi.fn();

      render(
        <DesktopTargetsView
          user={adminUser}
          onCreateTarget={onCreateTarget}
        />
      );

      // Metrics
      expect(screen.getByTestId('targets-metric-in-progress')).toBeInTheDocument();
      expect(screen.getByTestId('targets-metric-submitted')).toBeInTheDocument();
      expect(screen.getByTestId('targets-metric-completed')).toBeInTheDocument();

      // Targets Table
      expect(screen.getByTestId('targets-data-table')).toBeInTheDocument();
      expect(screen.getByText(/Complete Ground Floor Working Drawing Package/i)).toBeInTheDocument();

      // Admin + Create Target button & dialog
      const createBtn = screen.getByTestId('targets-create-btn');
      fireEvent.click(createBtn);
      expect(screen.getByTestId('targets-create-modal')).toBeInTheDocument();
    });

    it('allows STAFF to submit target for review with completion notes', () => {
      const staffUser = { fullName: 'Rajesh Patel', role: 'STAFF' as const };
      const onSubmitReview = vi.fn();

      render(
        <DesktopTargetsView
          user={staffUser}
          onSubmitReview={onSubmitReview}
        />
      );

      const submitBtn = screen.getByTestId('target-submit-btn-tgt-1');
      fireEvent.click(submitBtn);

      expect(screen.getByTestId('target-submit-modal')).toBeInTheDocument();
      const notesInput = screen.getByTestId('target-submit-notes');
      fireEvent.change(notesInput, { target: { value: 'All DWG layouts finalized.' } });

      const confirmBtn = screen.getByTestId('target-submit-confirm');
      fireEvent.click(confirmBtn);

      expect(onSubmitReview).toHaveBeenCalledWith('tgt-1', 'All DWG layouts finalized.');
    });

    it('restricts CLIENT_LEADER from staff targets board', () => {
      const clientUser = { fullName: 'Dr. Sameer Mehta', role: 'CLIENT_LEADER' as const };

      render(<DesktopTargetsView user={clientUser} />);

      expect(screen.getByTestId('targets-restricted-card')).toBeInTheDocument();
      expect(screen.queryByTestId('targets-data-table')).not.toBeInTheDocument();
    });
  });
});

