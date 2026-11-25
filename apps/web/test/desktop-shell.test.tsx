import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopSidebar, getSidebarNavItems } from '../src/components/desktop/DesktopSidebar';
import { DesktopTopNav } from '../src/components/desktop/DesktopTopNav';
import { DesktopShell } from '../src/components/desktop/DesktopShell';

describe('Desktop Shell & Navigation Foundation', () => {
  describe('1. DesktopSidebar rendering and collapse behavior', () => {
    it('renders the sidebar in expanded state by default and toggles between expanded and collapsed', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const { container } = render(
        <DesktopSidebar user={mockUser} />
      );

      const sidebar = container.querySelector('.desktop-sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).not.toHaveClass('collapsed');

      // Click collapse toggle button
      const toggleBtn = screen.getByTestId('sidebar-collapse-toggle');
      expect(toggleBtn).toBeInTheDocument();
      fireEvent.click(toggleBtn);

      // Now collapsed
      expect(sidebar).toHaveClass('collapsed');

      // Click again to expand back
      fireEvent.click(toggleBtn);
      expect(sidebar).not.toHaveClass('collapsed');
    });

    it('renders studio branding "A&F Design" and subtitle "ARCHITECTURE & INTERIORS" and never displays "ProNex"', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      render(<DesktopSidebar user={mockUser} />);

      expect(screen.getByText('A&F Design')).toBeInTheDocument();
      expect(screen.getByText('ARCHITECTURE & INTERIORS')).toBeInTheDocument();
      expect(screen.queryByText(/ProNex/i)).not.toBeInTheDocument();
    });

    it('triggers onSelectModule callback when a navigation item is clicked', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onSelectModule = vi.fn();

      render(
        <DesktopSidebar
          user={mockUser}
          activeModule="dashboard"
          onSelectModule={onSelectModule}
        />
      );

      const projectsBtn = screen.getByTestId('nav-item-projects');
      fireEvent.click(projectsBtn);
      expect(onSelectModule).toHaveBeenCalledWith('projects');
    });
  });

  describe('2. Role-based navigation link filtering', () => {
    it('ADMIN role: renders full navigation links across all modules', () => {
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const items = getSidebarNavItems(adminUser.role, true);

      expect(items).toHaveLength(14);
      expect(items.map((i) => i.id)).toEqual([
        'dashboard',
        'projects',
        'meetings',
        'progress',
        'payments',
        'verification',
        'attendance',
        'targets',
        'updates',
        'announcements',
        'chats',
        'reminders',
        'policies',
        'settings',
      ]);

      render(<DesktopSidebar user={adminUser} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(14);
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Meetings')).toBeInTheDocument();
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Design Verify')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
      expect(screen.getByText('Targets')).toBeInTheDocument();
      expect(screen.getByText('Updates')).toBeInTheDocument();
      expect(screen.getByText('Announcements')).toBeInTheDocument();
      expect(screen.getByText('Chats')).toBeInTheDocument();
      expect(screen.getByText('Reminders')).toBeInTheDocument();
      expect(screen.getByText('Policies')).toBeInTheDocument();
      expect(screen.getByText('Settings & Audit')).toBeInTheDocument();
    });

    it('STAFF role: renders exactly 8 navigation links with Payments, Meetings, and Settings strictly hidden', () => {
      const staffUser = { fullName: 'Priya Mehta', role: 'STAFF' as const };
      const items = getSidebarNavItems(staffUser.role, false);

      expect(items).toHaveLength(8);
      expect(items.map((i) => i.id)).toEqual([
        'dashboard',
        'projects',
        'verification',
        'attendance',
        'targets',
        'updates',
        'announcements',
        'policies',
      ]);

      render(<DesktopSidebar user={staffUser} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(8);

      // Payments, Meetings, and Settings must NEVER be shown to Staff
      expect(screen.queryByText('Payments')).not.toBeInTheDocument();
      expect(screen.queryByText('Meetings')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings & Audit')).not.toBeInTheDocument();
    });

    it('CLIENT_LEADER role: renders 7 links when showPricing is false, hiding Payments, Verification, Attendance, Targets', () => {
      const clientUser = { fullName: 'Aakash Mehta', role: 'CLIENT_LEADER' as const, showPricing: false };
      const items = getSidebarNavItems(clientUser.role, false);

      expect(items).toHaveLength(7);
      expect(items.map((i) => i.id)).toEqual([
        'dashboard',
        'projects',
        'meetings',
        'progress',
        'announcements',
        'chats',
        'policies',
      ]);

      render(<DesktopSidebar user={clientUser} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(7);

      // Internal items strictly hidden
      expect(screen.queryByText('Payments')).not.toBeInTheDocument();
      expect(screen.queryByText('Design Verify')).not.toBeInTheDocument();
      expect(screen.queryByText('Attendance')).not.toBeInTheDocument();
      expect(screen.queryByText('Targets')).not.toBeInTheDocument();
    });

    it('CLIENT_LEADER role: renders 8 links when showPricing is true, including Payments', () => {
      const clientUserWithPricing = {
        fullName: 'Aakash Mehta',
        role: 'CLIENT_LEADER' as const,
        showPricing: true,
      };
      const items = getSidebarNavItems(clientUserWithPricing.role, true);

      expect(items).toHaveLength(8);
      expect(items.map((i) => i.id)).toContain('payments');

      render(<DesktopSidebar user={clientUserWithPricing} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(8);
      expect(screen.getByText('Payments')).toBeInTheDocument();
    });
  });

  describe('3. DesktopTopNav search input and profile dropdown', () => {
    it('renders global search input and fires onSearchChange', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onSearchChange = vi.fn();

      render(
        <DesktopTopNav
          user={mockUser}
          searchValue=""
          onSearchChange={onSearchChange}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        'Search projects, clients, drawings, meetings...'
      );
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: 'Skyline Penthouse' } });
      expect(onSearchChange).toHaveBeenCalledWith('Skyline Penthouse');
    });

    it('renders user profile and opens dropdown with Change Password, Sign Out, and without demo role switcher', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onChangePassword = vi.fn();
      const onLogout = vi.fn();

      render(
        <DesktopTopNav
          user={mockUser}
          onChangePassword={onChangePassword}
          onLogout={onLogout}
        />
      );

      // Displays user Full Name only, without (Admin)
      expect(screen.getByText('Farhaz Patel')).toBeInTheDocument();

      // Open profile dropdown
      const profileBtn = screen.getByTestId('profile-dropdown-btn');
      fireEvent.click(profileBtn);

      // Verify dropdown content
      expect(screen.getByTestId('profile-dropdown-menu')).toBeInTheDocument();
      expect(screen.queryByText('Switch Role Simulator')).not.toBeInTheDocument();

      // Click Change Password
      const changePasswordBtn = screen.getByTestId('profile-change-password-btn');
      fireEvent.click(changePasswordBtn);
      expect(onChangePassword).toHaveBeenCalledTimes(1);

      // Re-open and click Logout
      fireEvent.click(profileBtn);
      const logoutBtn = screen.getByTestId('profile-logout-btn');
      fireEvent.click(logoutBtn);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. Notification popover button and unread count badge', () => {
    it('renders notification button with unread count badge and toggles popover', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onOpenNotifications = vi.fn();

      render(
        <DesktopTopNav
          user={mockUser}
          unreadCount={5}
          onOpenNotifications={onOpenNotifications}
        />
      );

      const notifBtn = screen.getByTestId('notifications-btn');
      expect(notifBtn).toBeInTheDocument();

      // Unread badge with 5
      const badge = screen.getByTestId('unread-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');

      // Click to open popover
      fireEvent.click(notifBtn);
      expect(onOpenNotifications).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('notifications-popover')).toBeInTheDocument();
      expect(screen.getByText('Studio Notifications')).toBeInTheDocument();
      expect(screen.getByText('5 unread')).toBeInTheDocument();
    });
  });

  describe('5. DesktopShell Scaffolding & Safe Canvas Container', () => {
    it('renders sidebar, top navigation, and child content wrapped in safe container', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };

      render(
        <DesktopShell user={mockUser}>
          <div data-testid="test-child-content">Desktop Dashboard View Content</div>
        </DesktopShell>
      );

      expect(screen.getByTestId('desktop-shell-root')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-topnav')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-viewport')).toBeInTheDocument();
      expect(screen.getByTestId('desktop-canvas-container')).toBeInTheDocument();
      expect(screen.getByTestId('test-child-content')).toBeInTheDocument();
    });
  });
});
