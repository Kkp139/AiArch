import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  KeyRound,
  LogOut,
  X,
  Settings,
  Users,
  Calendar,
  Check,
  CheckCheck,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { InAppNotificationItem } from '../layout/Shell';
import './desktop.css';

export interface DesktopTopNavProps {
  user: {
    fullName: string;
    role: UserRole;
    email?: string;
    username?: string;
  };
  notifications?: InAppNotificationItem[];
  unreadCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onOpenNotifications?: () => void;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notif: InAppNotificationItem) => void;
  onNavigateModule?: (moduleId: string, subTab?: string) => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

export const DesktopTopNav: React.FC<DesktopTopNavProps> = ({
  user,
  notifications = [],
  unreadCount,
  searchValue = '',
  onSearchChange,
  onOpenNotifications,
  onMarkAllNotificationsRead,
  onNotificationClick,
  onNavigateModule,
  onChangePassword,
  onLogout,
}) => {
  const [internalSearch, setInternalSearch] = useState(searchValue);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInternalSearch(searchValue);
  }, [searchValue]);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const computedUnread =
    unreadCount !== undefined ? unreadCount : notifications.filter((n) => !n.isRead).length;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalSearch(val);
    onSearchChange?.(val);
  };

  const handleNotificationsClick = () => {
    onOpenNotifications?.();
    setIsNotifOpen((prev) => !prev);
    setIsProfileOpen(false);
  };

  const getInitials = (name: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'ADMIN':
        return 'Studio Administrator';
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
              onSearchChange?.('');
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
        {/* Notifications Popover */}
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
            <Bell size={19} />
            {computedUnread > 0 && (
              <span className="desktop-unread-badge" data-testid="unread-badge">
                {computedUnread > 9 ? '9+' : computedUnread}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="desktop-notifications-popover" data-testid="notifications-popover">
              <div className="desktop-popover-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Studio Notifications</span>
                  {computedUnread > 0 && (
                    <span className="desk-pill red">{computedUnread} unread</span>
                  )}
                </div>
                {computedUnread > 0 && onMarkAllNotificationsRead && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--desk-gold)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    data-testid="mark-all-notifications-read"
                  >
                    <CheckCheck size={14} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="desktop-notif-list">
                {notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '28px 16px',
                      textAlign: 'center',
                      color: 'var(--desk-text-muted)',
                      fontSize: '13px',
                    }}
                  >
                    <Bell size={22} style={{ marginBottom: '8px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: 'var(--desk-text-secondary)' }}>
                      You are all caught up
                    </div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Meeting invitations, approvals, and target updates appear here.
                    </div>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      type="button"
                      className={`desktop-notif-item ${!notif.isRead ? 'unread' : ''}`}
                      onClick={() => {
                        onNotificationClick?.(notif);
                        setIsNotifOpen(false);
                      }}
                      data-testid={`notification-item-${notif.id}`}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'var(--desk-white)',
                          border: '1px solid var(--desk-border-subtle)',
                          color: 'var(--desk-gold)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {notif.category === 'MEETING' ? (
                          <Calendar size={15} />
                        ) : (
                          <Check size={15} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '2px',
                          }}
                        >
                          <span className="desk-pill gold" style={{ fontSize: '10px', padding: '1px 7px' }}>
                            {notif.category}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--desk-text-muted)' }}>
                            {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--desk-text-primary)',
                            marginBottom: '2px',
                          }}
                        >
                          {notif.title}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--desk-text-secondary)',
                            lineHeight: 1.4,
                          }}
                        >
                          {notif.message}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Pill & Dropdown (Full Name ONLY — NO Role Switcher, NO Role in parentheses) */}
        <div className="desktop-profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className="desktop-profile-btn"
            onClick={() => {
              setIsProfileOpen((prev) => !prev);
              setIsNotifOpen(false);
            }}
            aria-label="User Profile Menu"
            aria-expanded={isProfileOpen}
            data-testid="profile-dropdown-btn"
          >
            <div className="desktop-profile-avatar" aria-hidden="true">
              {getInitials(user.fullName)}
            </div>
            <span className="desktop-profile-name">{user.fullName}</span>
            <ChevronDown
              size={15}
              style={{
                color: 'var(--desk-text-muted)',
                transform: isProfileOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            />
          </button>

          {isProfileOpen && (
            <div className="desktop-dropdown" data-testid="profile-dropdown-menu">
              <div className="desktop-dropdown-profile-summary">
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--desk-text-primary)' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--desk-gold-dark)', fontWeight: 600, marginTop: '2px' }}>
                  {formatRoleLabel(user.role)}
                </div>
                {(user.email || user.username) && (
                  <div style={{ fontSize: '11.5px', color: 'var(--desk-text-secondary)', marginTop: '2px' }}>
                    {user.email || `@${user.username}`}
                  </div>
                )}
              </div>

              {user.role === 'ADMIN' && onNavigateModule && (
                <>
                  <button
                    type="button"
                    className="desktop-dropdown-item"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateModule('settings', 'users');
                    }}
                    data-testid="profile-user-management-btn"
                  >
                    <Users size={15} />
                    <span>User Management</span>
                  </button>
                  <button
                    type="button"
                    className="desktop-dropdown-item"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onNavigateModule('settings', 'studio');
                    }}
                    data-testid="profile-settings-btn"
                  >
                    <Settings size={15} />
                    <span>Studio Settings & Audit</span>
                  </button>
                  <div className="desktop-dropdown-divider" />
                </>
              )}

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
