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
} from 'lucide-react';

export interface ShellProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
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
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
  requiresPricingToggle?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'projects', label: 'Projects', icon: FolderKanban, roles: ['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'vault', label: 'Document Vault', icon: FileBox, roles: ['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'verification', label: 'Verifications', icon: CheckSquare, roles: ['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'meetings', label: 'Meetings', icon: CalendarDays, roles: ['ADMIN', 'CLIENT_LEADER', 'CLIENT_VIEWER'] },
  { id: 'payments', label: 'Payments', icon: CreditCard, roles: ['ADMIN', 'CLIENT_LEADER', 'CLIENT_VIEWER'], requiresPricingToggle: true },
  { id: 'attendance', label: 'Attendance', icon: Clock, roles: ['ADMIN', 'STAFF'] },
  { id: 'chat', label: 'Project Chat', icon: MessageSquare, roles: ['ADMIN', 'CLIENT_LEADER'] },
];

export function Shell({ user, studioName = 'A&F Design', children, activeTab = 'projects', onTabChange, onLogout }: ShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    setIsDarkMode(!isDarkMode);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Filter navigation items by role and client pricing permission
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

    return true;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Desktop Architectural Sidebar */}
      <aside
        style={{
          width: '260px',
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
        }}
      >
        <div>
          {/* Studio Brand Header */}
          <div style={{ paddingBottom: '28px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 700 }}>
              Architecture Studio
            </div>
            <div style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
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
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                color: 'var(--accent-rose)',
              }}
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Global Architectural Top Bar */}
        <header
          style={{
            height: '64px',
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
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
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
