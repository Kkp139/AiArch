import React, { useState } from 'react';
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
  Target,
  Bell,
} from 'lucide-react';

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
  { id: 'meetings', label: 'Meetings', icon: CalendarDays, roles: ['ADMIN', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['ADMIN', 'CLIENT_LEADER', 'CLIENT_VIEWER'], requiresPricingToggle: true },
  { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['ADMIN', 'STAFF'] },
  { id: 'targets', label: 'Staff Targets', icon: Target, roles: ['ADMIN', 'STAFF'] },
  { id: 'announcements', label: 'Announcements & Policies', icon: Bell, roles: ['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'chat', label: 'Project Chat', icon: MessageSquare, roles: ['ADMIN', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
];

export function Shell({ user, studioName = 'A&F Design', children, activeTab = 'projects', onTabChange, onLogout }: ShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

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

    // 4. Dynamic Meetings Rule: Admin is always allowed; Client Leader/Viewer require allowMeetings toggle
    if (item.id === 'meetings' && (user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER')) {
      return user.allowMeetings !== false;
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
