import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, UserRole } from '../../context/AuthContext';
import {
  FolderKanban,
  FileBox,
  CheckSquare,
  CalendarDays,
  CreditCard,
  Clock,
  MessageSquare,
  Moon,
  Sun,
  Menu,
  X,
  LogOut,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  MapPin,
  Building2,
} from 'lucide-react';

export interface InAppNotificationItem {
  id: string;
  recipientId?: string;
  projectId?: string;
  projectCode?: string | null;
  projectName?: string | null;
  category: string;
  title: string;
  message: string;
  deepLink?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ShellProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
  };
  studioName?: string;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onLogout?: () => void;
  notifications?: InAppNotificationItem[];
  unreadNotificationsCount?: number;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notif: InAppNotificationItem) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: any;
  roles: UserRole[];
  requiresPricingToggle?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'projects', label: 'Projects', icon: FolderKanban, roles: ['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'vault', label: 'Document Vault', icon: FileBox, roles: ['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'verification', label: 'Verifications', icon: CheckSquare, roles: ['ADMIN', 'STAFF'] }, // STRICT SPEC: Admin & Staff only
  { id: 'meetings', label: 'Meetings', icon: CalendarDays, roles: ['ADMIN', 'CLIENT_LEADER'] }, // STRICT SPEC: Admin & Client Leader only (Staff and Client Viewer forbidden)
  { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['ADMIN', 'CLIENT_LEADER', 'CLIENT_VIEWER'], requiresPricingToggle: true },
  { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['ADMIN', 'STAFF'] },
  { id: 'chat', label: 'Project Chat', icon: MessageSquare, roles: ['ADMIN', 'CLIENT_LEADER'] },
];

export function Shell({
  user,
  studioName = 'A&F Design',
  children,
  activeTab = 'projects',
  onTabChange,
  onLogout,
  notifications = [],
  unreadNotificationsCount = 0,
  onMarkAllNotificationsRead,
  onNotificationClick,
}: ShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Filter navigation items by role, dynamic meetings setting, and client pricing permission
  const allowedNavItems = NAV_ITEMS.filter((item) => {
    // 1. Check basic role permission
    if (!item.roles.includes(user.role)) {
      return false;
    }

    // 2. Strict Payments Rule: Staff is unconditionally blocked
    if (item.id === 'payments' && user.role === 'STAFF') {
      return false;
    }

    // 3. For Client roles, payments require showPricing toggle
    if (item.id === 'payments' && (user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER')) {
      return !!user.showPricing;
    }

    // 4. Meetings Rule: Admin is always allowed; Client Leader requires allowMeetings toggle; Staff & Client Viewer forbidden
    if (item.id === 'meetings') {
      if (user.role === 'STAFF' || user.role === 'CLIENT_VIEWER') {
        return false;
      }
      if (user.role === 'CLIENT_LEADER') {
        return user.allowMeetings !== false;
      }
    }

    return true;
  });

  return (
    <div className="shell-root">
      {/* Architectural Sidebar (Adaptive Tablet Rail & Desktop Panel) */}
      <aside className="shell-sidebar">
        <div>
          {/* Studio Brand Header */}
          <div className="sidebar-brand-box" style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
            <div className="sidebar-brand-sub" style={{ fontSize: '10px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 700 }}>
              Architecture Studio
            </div>
            <div className="sidebar-brand-title" style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
              {studioName}
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange && onTabChange(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    border: isActive ? '1px solid var(--border-strong)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    width: '100%',
                    minHeight: '44px',
                  }}
                >
                  <Icon size={18} style={{ flexShrink: 0 }} />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              minHeight: '44px',
            }}
          >
            {isDarkMode ? <Sun size={16} style={{ flexShrink: 0 }} /> : <Moon size={16} style={{ flexShrink: 0 }} />}
            <span className="sidebar-footer-label">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              aria-label="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--accent-rose)',
                minHeight: '44px',
              }}
            >
              <LogOut size={16} style={{ flexShrink: 0 }} />
              <span className="sidebar-footer-label">Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="shell-main-area">
        {/* Global Architectural Top Bar */}
        <header
          className="shell-header"
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Architecture & Interior Workspace
            </span>
          </div>

          {/* User Profile display in Header:
              CRITICAL REQUIREMENT: Displays user Full Name ONLY.
              MUST NOT display role label in parentheses e.g. '(Admin)' or '(Staff)'.
          */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Notification Center Trigger */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                title="Notifications"
                aria-label="Notifications"
                style={{
                  position: 'relative',
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: notifOpen ? 'var(--bg-tertiary)' : 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Bell size={18} color={unreadNotificationsCount > 0 ? 'var(--accent-gold)' : 'var(--text-secondary)'} />
                {unreadNotificationsCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 4px',
                      borderRadius: '9px',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#0d0f12',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                    }}
                  >
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Architectural Notifications Dropdown */}
              {notifOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '46px',
                    right: 0,
                    width: '380px',
                    maxHeight: '520px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                  }}
                >
                  {/* Dropdown Header */}
                  <div
                    style={{
                      padding: '14px 18px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-tertiary)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={16} color="var(--accent-gold)" />
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Notifications
                      </span>
                      {unreadNotificationsCount > 0 && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(197, 160, 89, 0.15)',
                            color: 'var(--accent-gold)',
                          }}
                        >
                          {unreadNotificationsCount} new
                        </span>
                      )}
                    </div>

                    {unreadNotificationsCount > 0 && onMarkAllNotificationsRead && (
                      <button
                        type="button"
                        onClick={onMarkAllNotificationsRead}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-gold)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '2px 4px',
                        }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Dropdown List */}
                  <div style={{ overflowY: 'auto', maxHeight: '420px', padding: '8px' }}>
                    {notifications.length === 0 ? (
                      <div
                        style={{
                          padding: '32px 16px',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontSize: '13px',
                        }}
                      >
                        <Bell size={24} style={{ margin: '0 auto 8px auto', opacity: 0.3 }} />
                        <p style={{ margin: 0, fontWeight: 600 }}>No notifications</p>
                        <span style={{ fontSize: '11px' }}>You will receive invitations and updates here.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {notifications.map((notif) => {
                          const isMeeting = notif.category === 'MEETING';
                          return (
                            <div
                              key={notif.id}
                              onClick={() => {
                                if (onNotificationClick) {
                                  onNotificationClick(notif);
                                }
                                setNotifOpen(false);
                              }}
                              style={{
                                padding: '12px 14px',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: notif.isRead ? 'var(--bg-surface)' : 'var(--bg-tertiary)',
                                border: notif.isRead ? '1px solid var(--border-subtle)' : '1px solid var(--accent-gold)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                position: 'relative',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    backgroundColor: isMeeting ? 'rgba(197, 160, 89, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                                    color: isMeeting ? 'var(--accent-gold)' : 'var(--accent-blue)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                  }}
                                >
                                  {isMeeting ? <Calendar size={16} /> : <Check size={16} />}
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                    <span
                                      style={{
                                        fontSize: '9px',
                                        fontWeight: 800,
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        backgroundColor: isMeeting ? 'var(--accent-gold)' : 'var(--accent-blue)',
                                        color: '#0d0f12',
                                        textTransform: 'uppercase',
                                      }}
                                    >
                                      {isMeeting ? 'Meeting Invite' : notif.category}
                                    </span>
                                    {notif.projectCode && (
                                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {notif.projectCode}
                                      </span>
                                    )}
                                    {!notif.isRead && (
                                      <span
                                        style={{
                                          width: '6px',
                                          height: '6px',
                                          borderRadius: '50%',
                                          backgroundColor: 'var(--accent-emerald)',
                                          marginLeft: 'auto',
                                        }}
                                      />
                                    )}
                                  </div>

                                  <h5
                                    style={{
                                      fontSize: '13px',
                                      fontWeight: 700,
                                      color: 'var(--text-primary)',
                                      margin: '0 0 3px 0',
                                      lineHeight: 1.3,
                                    }}
                                  >
                                    {notif.title}
                                  </h5>

                                  <p
                                    style={{
                                      fontSize: '11px',
                                      color: 'var(--text-secondary)',
                                      margin: '0 0 8px 0',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {notif.message}
                                  </p>

                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                      {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Recent'}
                                    </span>

                                    <button
                                      type="button"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: 'var(--accent-gold)',
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <span>View in Calendar</span>
                                      <ChevronRight size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile display in Header:
                CRITICAL REQUIREMENT: Displays user Full Name ONLY.
                MUST NOT display role label in parentheses e.g. '(Admin)' or '(Staff)'.
            */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#0d0f12',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '12px',
                }}
              >
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {user.fullName}
              </span>
            </div>
          </div>
        </header>

        {/* Page View Body */}
        <main className="shell-content">
          {children}
        </main>
      </div>
    </div>
  );
}
