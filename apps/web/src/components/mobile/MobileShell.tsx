import React, { useState, useEffect } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  Bell,
  ChevronDown,
  Check,
  Home,
  FolderKanban,
  CalendarDays,
  MoreHorizontal,
  Wifi,
  Battery,
  Signal,
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
  children: React.ReactNode;
}

export const MobileShell: React.FC<MobileShellProps> = ({
  user,
  activeTab,
  onTabChange,
  onRoleSwitch,
  onOpenNotifications,
  children,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const roles: { role: UserRole; label: string }[] = [
    { role: 'ADMIN', label: 'Admin' },
    { role: 'CLIENT_LEADER', label: 'Client Leader' },
    { role: 'CLIENT_VIEWER', label: 'Client Viewer' },
    { role: 'STAFF', label: 'Staff' },
  ];

  return (
    <div className="figma-mobile-viewport">
      {/* 1. Status Bar (Figma: 17:106, 71:9394) */}
      <div className="figma-status-bar">
        <span>{currentTime}</span>
        <div className="figma-status-icons">
          <Signal size={14} />
          <Wifi size={14} />
          <Battery size={16} />
        </div>
      </div>

      {/* 2. Top App Bar Header (Figma: 71:9393) */}
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

          {/* User Profile Avatar Pill with Role Dropdown */}
          <div style={{ position: 'relative' }}>
            <div
              className="figma-profile-pill"
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            >
              <div className="figma-profile-avatar">
                {user.fullName ? user.fullName.charAt(0) : 'U'}
              </div>
              <ChevronDown size={14} color="#4A4A4C" />
            </div>

            {/* Instant Role Switcher Dropdown (Figma: 67:8997) */}
            {roleDropdownOpen && (
              <>
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                  onClick={() => setRoleDropdownOpen(false)}
                />
                <div className="figma-role-dropdown">
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#979798', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', paddingLeft: '8px' }}>
                    Switch Active Role
                  </div>
                  {roles.map((r) => {
                    const isCurrent = user.role === r.role;
                    return (
                      <div
                        key={r.role}
                        className={`figma-role-item ${isCurrent ? 'active' : ''}`}
                        onClick={() => {
                          if (onRoleSwitch) {
                            onRoleSwitch(r.role);
                          }
                          setRoleDropdownOpen(false);
                        }}
                      >
                        <div className="figma-role-info">
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: '#2E2216',
                              color: '#BF935A',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {r.label.charAt(0)}
                          </div>
                          <span className="figma-role-name">{r.label}</span>
                        </div>

                        <div className={`figma-role-check ${isCurrent ? 'checked' : 'unchecked'}`}>
                          {isCurrent && <Check size={12} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
