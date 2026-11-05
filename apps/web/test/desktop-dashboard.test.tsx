import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopDashboardView } from '../src/components/desktop/DesktopDashboardView';

describe('Task 3: DesktopDashboardView', () => {
  it('renders all metrics and operational sections for ADMIN role', () => {
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
    const onOpenNewProject = vi.fn();
    const onOpenUpload = vi.fn();
    const onScheduleMeeting = vi.fn();

    render(
      <DesktopDashboardView
        user={adminUser}
        onOpenNewProject={onOpenNewProject}
        onOpenUpload={onOpenUpload}
        onScheduleMeeting={onScheduleMeeting}
      />
    );

    // Welcome title & user name
    expect(screen.getByText('Studio Workspace Dashboard')).toBeInTheDocument();
    expect(screen.getByText(/Farhaz Patel/)).toBeInTheDocument();

    // 4 Top Metrics
    expect(screen.getByTestId('metric-active-projects')).toBeInTheDocument();
    expect(screen.getByTestId('metric-consultation-meetings')).toBeInTheDocument();
    expect(screen.getByTestId('metric-financial-collection')).toBeInTheDocument();
    expect(screen.getByTestId('metric-pending-verifications')).toBeInTheDocument();

    // Quick Action buttons
    const newProjectBtn = screen.getByTestId('quick-action-new-project');
    fireEvent.click(newProjectBtn);
    expect(onOpenNewProject).toHaveBeenCalledTimes(1);

    const uploadBtn = screen.getByTestId('quick-action-upload');
    fireEvent.click(uploadBtn);
    expect(onOpenUpload).toHaveBeenCalledTimes(1);

    // Panels
    expect(screen.getByTestId('dashboard-meetings-panel')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-verification-panel')).toBeInTheDocument();
  });

  it('STAFF role strictly hides Financial Collection and Meetings per RBAC specification', () => {
    const staffUser = { fullName: 'Priya Mehta', role: 'STAFF' as const };

    render(<DesktopDashboardView user={staffUser} />);

    // Financial collection must NEVER be rendered for Staff
    expect(screen.queryByTestId('metric-financial-collection')).not.toBeInTheDocument();
    expect(screen.queryByText(/Financial Collection/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('metric-consultation-meetings')).not.toBeInTheDocument();

    // Staff sees assigned targets & pending verifications
    expect(screen.getByTestId('metric-staff-targets')).toBeInTheDocument();
    expect(screen.getByTestId('metric-pending-verifications')).toBeInTheDocument();

    // Quick actions for Staff
    expect(screen.getByTestId('quick-action-attendance')).toBeInTheDocument();
    expect(screen.getByTestId('quick-action-upload')).toBeInTheDocument();
  });

  it('CLIENT_LEADER role renders Project Progress and only displays financials when showPricing is true', () => {
    // 1. Client without showPricing
    const clientNoPricing = {
      fullName: 'Aakash Mehta',
      role: 'CLIENT_LEADER' as const,
      showPricing: false,
    };

    const { rerender } = render(<DesktopDashboardView user={clientNoPricing} />);

    expect(screen.getByTestId('metric-client-progress')).toBeInTheDocument();
    expect(screen.queryByTestId('metric-financial-collection')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard-client-vault-panel')).toBeInTheDocument();

    // 2. Client with showPricing
    const clientWithPricing = {
      fullName: 'Aakash Mehta',
      role: 'CLIENT_LEADER' as const,
      showPricing: true,
    };

    rerender(<DesktopDashboardView user={clientWithPricing} />);
    expect(screen.getByTestId('metric-financial-collection')).toBeInTheDocument();
  });

  it('renders upcoming consultation meetings with Google Meet link and status badge', () => {
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
    render(<DesktopDashboardView user={adminUser} />);

    expect(screen.getByText('Courtyard Villa')).toBeInTheDocument();
    expect(screen.getByText('Dr. Sameer Mehta')).toBeInTheDocument();
    expect(screen.getByText('12:00 – 13:30')).toBeInTheDocument();

    // Google meet launch link
    const meetLinks = screen.getAllByRole('link', { name: /Join/i });
    expect(meetLinks.length).toBeGreaterThan(0);
    expect(meetLinks[0]).toHaveAttribute('href', 'https://meet.google.com/xyz-af-villa');
  });

  it('renders recent drawing verification feed with proper status badges', () => {
    const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
    render(<DesktopDashboardView user={adminUser} />);

    expect(
      screen.getByText('Ground Floor Setting Out Geometry & Column Centerlines')
    ).toBeInTheDocument();
    expect(screen.getByTestId('status-pending')).toBeInTheDocument();
    expect(screen.getByTestId('status-approved')).toBeInTheDocument();
    expect(screen.getByTestId('status-revision')).toBeInTheDocument();
  });
});
