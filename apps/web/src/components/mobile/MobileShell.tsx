import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  Bell,
  ChevronDown,
  ChevronRight,
  User,
  Lock,
  LogOut,
  Home,
  FolderKanban,
  CalendarDays,
  MoreHorizontal,
} from 'lucide-react';
import './mobile.css';

export interface MobileShellProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
  };
  activeTab: string;
  onTabChange: (tab: string) => void;
  onRoleSwitch?: (role: UserRole) => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenNotifications,
  onOpenProfile,
  onChangePassword,
  onLogout,
  children,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const formatRole = (role?: string) => {
    if (!role) return '';
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'Admin';
      case 'CLIENT_LEADER':
        return 'Client Leader';
      case 'CLIENT_VIEWER':
        return 'Client Viewer';
      case 'STAFF':
        return 'Staff';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }
  };

  return (
    <div className="figma-mobile-viewport">
      {/* Top App Bar Header (Figma: 71:9393) */}
      <header className="figma-mobile-header">
        <div className="figma-header-brand" onClick={() => onTabChange('home')} style={{ cursor: 'pointer' }}>
          <img
            src="/assets/auth/asf_logo.svg"
            alt="asf design"
            className="figma-header-logo"
          />
        </div>

        <div className="figma-header-actions">
          {/* Notification Bell */}
          <button
            className="figma-notif-btn"
            onClick={onOpenNotifications}
            title="Notifications"
          >
            <Bell size={18} />
            <span className="figma-notif-badge">4</span>
          </button>

          {/* User Profile Avatar Pill with Dropdown (Figma: 224:4851) */}
          <div style={{ position: 'relative' }}>
            <div
              className="figma-profile-pill"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              style={{ cursor: 'pointer' }}
            >
              <div className="figma-profile-avatar">
                {user.fullName ? user.fullName.charAt(0) : 'U'}
              </div>
              <ChevronDown size={14} color="#4A4A4C" />
            </div>

            {/* Figma 224:4851 Profile Dropdown */}
            {profileDropdownOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="figma-profile-dropdown">
                  {/* User Profile Header Row */}
                  <div className="figma-dropdown-user-row">
                    <div className="figma-dropdown-avatar">
                      {user.fullName ? user.fullName.charAt(0) : 'U'}
                    </div>
                    <div className="figma-dropdown-user-info">
                      <span className="figma-dropdown-user-name">{user.fullName || 'User'}</span>
                      <span className="figma-dropdown-user-role">{formatRole(user.role)}</span>
                    </div>
                  </div>

                  <div className="figma-dropdown-divider" />

                  {/* 1. My Profile */}
                  <button
                    type="button"
                    className="figma-dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onOpenProfile) onOpenProfile();
                    }}
                  >
                    <div className="figma-dropdown-item-left">
                      <span className="figma-dropdown-item-icon"><User size={18} /></span>
                      <span className="figma-dropdown-item-label">My Profile</span>
                    </div>
                    <ChevronRight size={16} color="#979798" />
                  </button>

                  {/* 2. Change password */}
                  <button
                    type="button"
                    className="figma-dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onChangePassword) onChangePassword();
                    }}
                  >
                    <div className="figma-dropdown-item-left">
                      <span className="figma-dropdown-item-icon"><Lock size={18} /></span>
                      <span className="figma-dropdown-item-label">Change password</span>
                    </div>
                    <ChevronRight size={16} color="#979798" />
                  </button>

                  <div className="figma-dropdown-divider" />

                  {/* 3. Logout */}
                  <button
                    type="button"
                    className="figma-dropdown-item figma-dropdown-item-logout"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      if (onLogout) onLogout();
                    }}
                  >
                    <div className="figma-dropdown-item-left">
                      <span className="figma-dropdown-item-icon"><LogOut size={18} /></span>
                      <span className="figma-dropdown-item-label">Logout</span>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area (Scrollable within viewport) */}
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </main>

      {/* 3. Floating Bottom Navigation Bar (Dock) (Figma: 71:9393) */}
      <nav className="figma-bottom-dock">
        <button
          className={`figma-dock-tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          <Home size={18} />
          <span>Home</span>
        </button>

        <button
          className={`figma-dock-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => onTabChange('projects')}
        >
          <FolderKanban size={18} />
          <span>Projects</span>
        </button>

        <button
          className={`figma-dock-tab ${activeTab === 'meetings' ? 'active' : ''}`}
          onClick={() => onTabChange('meetings')}
        >
          <CalendarDays size={18} />
          <span>Meetings</span>
        </button>

        <button
          className={`figma-dock-tab ${activeTab === 'more' ? 'active' : ''}`}
          onClick={() => onTabChange('more')}
        >
          <MoreHorizontal size={18} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};
