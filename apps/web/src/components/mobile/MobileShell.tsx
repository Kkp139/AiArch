import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Home,
  FolderKanban,
  CalendarDays,
  Clock,
  MoreHorizontal,
  User as UserIcon,
  Lock,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import './mobile.css';

export interface MobileShellUser {
  id?: string;
  fullName: string;
  username?: string;
  role: UserRole;
  showPricing?: boolean;
  allowMeetings?: boolean;
}

export interface MobileShellProps {
  user: MobileShellUser;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenNotifications: () => void;
  onOpenProfile?: () => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
  unreadCount?: number;
  children: React.ReactNode;
}

function getRoleSubtitle(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Principal Admin';
    case 'STAFF':
      return 'Studio Staff';
    case 'CLIENT_LEADER':
      return 'Client Leader';
    case 'CLIENT_VIEWER':
      return 'Client Viewer';
    default:
      return role;
  }
}

export const MobileShell: React.FC<MobileShellProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenNotifications,
  onOpenProfile,
  onChangePassword,
  onLogout,
  unreadCount = 0,
  children,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const canAccessMeetings =
    user.role === 'ADMIN' ||
    (user.role === 'CLIENT_LEADER' && user.allowMeetings !== false);

  const initials = (user.fullName || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';

  return (
    <div className="figma-mobile-shell">
      {/* Top App Header (Figma 71:9393 / 224:4851) */}
      <header className="figma-top-header">
        <div
          className="figma-brand-wrap"
          onClick={() => onTabChange('home')}
          style={{ cursor: 'pointer' }}
        >
          <img
            src="/assets/brand/af_logo_circle.jpg"
            alt="asf design"
            className="figma-brand-logo"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <span className="figma-brand-title">A&amp;F Design</span>
        </div>

        <div className="figma-header-actions" ref={menuRef}>
          <button
            type="button"
            className="figma-icon-btn"
            aria-label="Notifications"
            onClick={onOpenNotifications}
          >
            <Bell size={20} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="figma-bell-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className="figma-icon-btn"
            aria-label="Account menu"
            aria-expanded={profileMenuOpen}
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            style={{
              backgroundColor: profileMenuOpen ? '#352618' : undefined,
              color: profileMenuOpen ? '#FFFFFF' : undefined,
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            {initials}
          </button>

          {/* Account Dropdown (Profile, Change Password, Sign Out only — NO demo role switcher) */}
          {profileMenuOpen && (
            <div className="figma-profile-dropdown">
              <div
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid #F0F0F2',
                  marginBottom: '6px',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0C0C0D' }}>
                  {user.fullName}
                </div>
                <div style={{ fontSize: '12px', color: '#686869', marginTop: '2px' }}>
                  {getRoleSubtitle(user.role)}
                </div>
              </div>

              <button
                type="button"
                className="figma-dropdown-item"
                onClick={() => {
                  setProfileMenuOpen(false);
                  if (onOpenProfile) {
                    onOpenProfile();
                  } else {
                    onTabChange('profile');
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserIcon size={16} />
                  <span>My Profile</span>
                </div>
                <ChevronRight size={14} opacity={0.5} />
              </button>

              {onChangePassword && (
                <button
                  type="button"
                  className="figma-dropdown-item"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    onChangePassword();
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={16} />
                    <span>Change Password</span>
                  </div>
                  <ChevronRight size={14} opacity={0.5} />
                </button>
              )}

              {onLogout && (
                <>
                  <div style={{ height: '1px', background: '#F0F0F2', margin: '6px 0' }} />
                  <button
                    type="button"
                    className="figma-dropdown-item"
                    style={{ color: '#B42318' }}
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onLogout();
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </div>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {children}
      </main>

      {/* Bottom Tab Navigation Dock (Figma 71:9393) */}
      <nav className="figma-bottom-dock" aria-label="Primary Mobile Navigation">
        <button
          type="button"
          className={`figma-dock-tab ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => onTabChange('home')}
        >
          <Home size={20} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`figma-dock-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => onTabChange('projects')}
        >
          <FolderKanban size={20} strokeWidth={activeTab === 'projects' ? 2.5 : 2} />
          <span>Projects</span>
        </button>

        {canAccessMeetings && (
          <button
            type="button"
            className={`figma-dock-tab ${activeTab === 'meetings' ? 'active' : ''}`}
            onClick={() => onTabChange('meetings')}
          >
            <CalendarDays size={20} strokeWidth={activeTab === 'meetings' ? 2.5 : 2} />
            <span>Meetings</span>
          </button>
        )}

        {user.role === 'STAFF' && (
          <button
            type="button"
            className={`figma-dock-tab ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => onTabChange('attendance')}
          >
            <Clock size={20} strokeWidth={activeTab === 'attendance' ? 2.5 : 2} />
            <span>Attendance</span>
          </button>
        )}

        <button
          type="button"
          className={`figma-dock-tab ${activeTab === 'more' ? 'active' : ''}`}
          onClick={() => onTabChange('more')}
        >
          <MoreHorizontal size={20} strokeWidth={activeTab === 'more' ? 2.5 : 2} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
};
