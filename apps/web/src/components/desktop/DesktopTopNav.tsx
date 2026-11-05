import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  User,
  Shield,
  KeyRound,
  LogOut,
  Check,
  X,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import './desktop.css';

export interface DesktopTopNavProps {
  user: {
    fullName: string;
    role: UserRole;
    email?: string;
  };
  unreadCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onOpenNotifications?: () => void;
  onRoleSwitch?: (role: UserRole) => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

export const DesktopTopNav: React.FC<DesktopTopNavProps> = ({
  user,
  unreadCount = 0,
  searchValue = '',
  onSearchChange,
  onOpenNotifications,
  onRoleSwitch,
  onChangePassword,
  onLogout,
}) => {
  const [internalSearch, setInternalSearch] = useState(searchValue);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Sync internal search if prop changes
  useEffect(() => {
    setInternalSearch(searchValue);
  }, [searchValue]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    if (onRoleSwitch) {
      onRoleSwitch(role);
    }
    setIsProfileOpen(false);
  };

  const handleNotificationsClick = () => {
    if (onOpenNotifications) {
      onOpenNotifications();
    }
    setIsNotifOpen((prev) => !prev);
  };

  // User initials (e.g. "Kamal Patel" -> "KP", or single initial)
  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Role display label
  const formatRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'ADMIN':
        return 'Admin';
      case 'STAFF':
        return 'Staff Architect';
      case 'CLIENT_LEADER':
        return 'Client Leader';
      case 'CLIENT_VIEWER':
        return 'Client Viewer';
      default:
        return role;
    }
  };

  return (
    <header className="desktop-topnav" data-testid="desktop-topnav">
      {/* 766px Max-Width Global Search Bar */}
      <div className="desktop-search-container" data-testid="desktop-search-container">
        <Search size={18} className="desktop-search-icon" aria-hidden="true" />
        <input
          type="search"
          className="desktop-search-input"
          placeholder="Search projects, clients, drawings, meetings..."
          value={internalSearch}
          onChange={handleSearchChange}
          aria-label="Global Search"
          data-testid="desktop-global-search-input"
        />
        {internalSearch && (
          <button
            type="button"
            onClick={() => {
              setInternalSearch('');
              if (onSearchChange) onSearchChange('');
            }}
            aria-label="Clear search"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--desk-text-muted)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Right Action Icons & Profile */}
      <div className="desktop-topnav-actions">
        {/* Notifications Popover Button */}
        <div className="desktop-notifications-wrapper" ref={notifRef}>
          <button
            type="button"
            className="desktop-notifications-btn"
            onClick={handleNotificationsClick}
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={isNotifOpen}
            data-testid="notifications-btn"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="desktop-unread-badge" data-testid="unread-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="desktop-notifications-popover" data-testid="notifications-popover">
              <div className="desktop-popover-header">
                <span>Studio Notifications</span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(217, 45, 32, 0.1)',
                      color: 'var(--desk-danger)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--desk-text-secondary)', padding: '10px 0' }}>
                {unreadCount > 0
                  ? `You have ${unreadCount} new updates, drawings, or meeting notices.`
                  : 'No unread notifications at this time.'}
              </div>
            </div>
          )}
        </div>

        {/* Profile Trigger & Dropdown Menu */}
        <div className="desktop-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className="desktop-profile-btn"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            aria-label="User Profile Menu"
            aria-expanded={isProfileOpen}
            data-testid="profile-dropdown-btn"
          >
            <div className="desktop-profile-avatar" aria-hidden="true">
              {getInitials(user.fullName)}
            </div>
            <div className="desktop-profile-info">
              <span className="desktop-profile-name">{user.fullName}</span>
              <span className="desktop-role-badge">{formatRoleLabel(user.role)}</span>
            </div>
            <ChevronDown
              size={16}
              style={{
                color: 'var(--desk-text-muted)',
                transform: isProfileOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>

          {isProfileOpen && (
            <div className="desktop-dropdown" data-testid="profile-dropdown-menu">
              <div className="desktop-dropdown-section-title">Switch Role Simulator</div>
              <button
                type="button"
                className={`desktop-dropdown-item ${user.role === 'ADMIN' ? 'active-role' : ''}`}
                onClick={() => handleRoleSelect('ADMIN')}
                data-testid="role-switch-admin"
              >
                <Shield size={15} />
                <span style={{ flex: 1 }}>Admin</span>
                {user.role === 'ADMIN' && <Check size={14} />}
              </button>
              <button
                type="button"
                className={`desktop-dropdown-item ${user.role === 'STAFF' ? 'active-role' : ''}`}
                onClick={() => handleRoleSelect('STAFF')}
                data-testid="role-switch-staff"
              >
                <User size={15} />
                <span style={{ flex: 1 }}>Staff Architect</span>
                {user.role === 'STAFF' && <Check size={14} />}
              </button>
              <button
                type="button"
                className={`desktop-dropdown-item ${user.role === 'CLIENT_LEADER' ? 'active-role' : ''}`}
                onClick={() => handleRoleSelect('CLIENT_LEADER')}
                data-testid="role-switch-client"
              >
                <User size={15} />
                <span style={{ flex: 1 }}>Client Leader</span>
                {user.role === 'CLIENT_LEADER' && <Check size={14} />}
              </button>

              <div className="desktop-dropdown-divider" />

              {onChangePassword && (
                <button
                  type="button"
                  className="desktop-dropdown-item"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onChangePassword();
                  }}
                  data-testid="profile-change-password-btn"
                >
                  <KeyRound size={15} />
                  <span>Change Password</span>
                </button>
              )}

              {onLogout && (
                <button
                  type="button"
                  className="desktop-dropdown-item logout"
                  onClick={() => {
                    setIsProfileOpen(false);
                    onLogout();
                  }}
                  data-testid="profile-logout-btn"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
