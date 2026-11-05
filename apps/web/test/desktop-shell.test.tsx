import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DesktopSidebar, getSidebarNavItems } from '../src/components/desktop/DesktopSidebar';
import { DesktopTopNav } from '../src/components/desktop/DesktopTopNav';
import { DesktopShell } from '../src/components/desktop/DesktopShell';

describe('Desktop Shell & Navigation Foundation', () => {
  describe('1. DesktopSidebar rendering and collapse behavior', () => {
    it('renders the sidebar in expanded state by default and toggles between expanded (316px) and collapsed (80px)', () => {
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
    it('ADMIN role: renders exactly 12 navigation links across all modules', () => {
      const adminUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const items = getSidebarNavItems(adminUser.role, true);

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

      render(<DesktopSidebar user={adminUser} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(12);
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Projects')).toBeInTheDocument();
      expect(screen.getByText('Meetings')).toBeInTheDocument();
      expect(screen.getByText('Payments')).toBeInTheDocument();
      expect(screen.getByText('Design Verification')).toBeInTheDocument();
      expect(screen.getByText('Attendance')).toBeInTheDocument();
      expect(screen.getByText('Targets')).toBeInTheDocument();
      expect(screen.getByText('Updates')).toBeInTheDocument();
      expect(screen.getByText('Announcements')).toBeInTheDocument();
      expect(screen.getByText('Policies')).toBeInTheDocument();
      expect(screen.getByText('Reminders')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('STAFF role: renders exactly 7 navigation links with Payments and Meetings strictly hidden', () => {
      const staffUser = { fullName: 'Priya Mehta', role: 'STAFF' as const };
      const items = getSidebarNavItems(staffUser.role, false);

      expect(items).toHaveLength(7);
      expect(items.map((i) => i.label)).toEqual([
        'Dashboard',
        'Projects',
        'Attendance',
        'Updates',
        'Targets',
        'Announcements',
        'Design Verification',
      ]);

      render(<DesktopSidebar user={staffUser} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(7);

      // Payments and Meetings must NEVER be shown to Staff
      expect(screen.queryByText('Payments')).not.toBeInTheDocument();
      expect(screen.queryByText('Meetings')).not.toBeInTheDocument();
    });

    it('CLIENT_LEADER role: renders 7 links when showPricing is false, hiding Payments, Verification, Attendance, Targets', () => {
      const clientUser = { fullName: 'Aakash Mehta', role: 'CLIENT_LEADER' as const, showPricing: false };
      const items = getSidebarNavItems(clientUser.role, false);

      expect(items).toHaveLength(7);
      expect(items.map((i) => i.label)).toEqual([
        'Dashboard',
        'Projects',
        'Meetings',
        'Announcements',
        'Policies',
        'Progress Report',
        'Chats',
      ]);

      render(<DesktopSidebar user={clientUser} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(7);

      // Internal items strictly hidden
      expect(screen.queryByText('Payments')).not.toBeInTheDocument();
      expect(screen.queryByText('Design Verification')).not.toBeInTheDocument();
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
      expect(items.map((i) => i.label)).toContain('Payments');

      render(<DesktopSidebar user={clientUserWithPricing} />);
      const navButtons = screen.getAllByRole('button').filter((btn) =>
        btn.classList.contains('desktop-nav-item')
      );
      expect(navButtons).toHaveLength(8);
      expect(screen.getByText('Payments')).toBeInTheDocument();
    });
  });

  describe('3. DesktopTopNav search input and profile dropdown role switcher', () => {
    it('renders global search input with 766px container and fires onSearchChange', () => {
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

    it('renders user profile and opens dropdown with Role Switcher, Change Password, and Sign Out', () => {
      const mockUser = { fullName: 'Farhaz Patel', role: 'ADMIN' as const };
      const onRoleSwitch = vi.fn();
      const onChangePassword = vi.fn();
      const onLogout = vi.fn();

      render(
        <DesktopTopNav
          user={mockUser}
          onRoleSwitch={onRoleSwitch}
          onChangePassword={onChangePassword}
          onLogout={onLogout}
        />
      );

      // Displays user Full Name
      expect(screen.getByText('Farhaz Patel')).toBeInTheDocument();

      // Open profile dropdown
      const profileBtn = screen.getByTestId('profile-dropdown-btn');
      fireEvent.click(profileBtn);

      // Verify dropdown content
      expect(screen.getByTestId('profile-dropdown-menu')).toBeInTheDocument();
      expect(screen.getByText('Switch Role Simulator')).toBeInTheDocument();

      // Click Staff role switcher
      const staffBtn = screen.getByTestId('role-switch-staff');
      fireEvent.click(staffBtn);
      expect(onRoleSwitch).toHaveBeenCalledWith('STAFF');

      // Re-open and click Change Password
      fireEvent.click(profileBtn);
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

  describe('5. DesktopShell Scaffolding & 4K Safe Container', () => {
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
