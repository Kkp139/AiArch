import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Smartphone,
  History,
  Settings,
  Info,
  HelpCircle,
  Lock,
  LogOut,
  BellRing,
  User as UserIcon,
  TrendingUp,
  Megaphone,
  ShieldCheck,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { ProjectSummary } from '../../App';
import { AuthHeadersInput } from './mobileAuth';
import { MobileProfileView } from './MobileProfileView';
import { MobileUserManagementView } from './MobileUserManagementView';
import { MobileDeviceApprovalsView } from './MobileDeviceApprovalsView';
import { MobileActivityLogView } from './MobileActivityLogView';
import { MobileSettingsView } from './MobileSettingsView';
import { MobileAboutAppView } from './MobileAboutAppView';
import { MobileHelpSupportView } from './MobileHelpSupportView';

export interface MobileMoreMenuUser {
  id?: string;
  fullName: string;
  username?: string;
  email?: string;
  mobile?: string;
  role: UserRole;
  showPricing?: boolean;
  allowMeetings?: boolean;
}

export interface MobileMoreMenuProps {
  user?: MobileMoreMenuUser;
  userRole?: UserRole;
  projects?: ProjectSummary[];
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onOpenUserManagement?: () => void;
  onOpenProfile?: () => void;
  onChangePassword?: () => void;
  onNavigateTab?: (tab: string) => void;
  onLogout?: () => void;
  onBack?: () => void;
}

type MoreSubView =
  | 'menu'
  | 'profile'
  | 'users'
  | 'devices'
  | 'audit'
  | 'settings'
  | 'about'
  | 'help';

function getRoleSubtitle(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Principal Administrator';
    case 'STAFF':
      return 'Studio Architect';
    case 'CLIENT_LEADER':
      return 'Client Leader';
    case 'CLIENT_VIEWER':
      return 'Client Viewer';
    default:
      return role;
  }
}

export const MobileMoreMenu: React.FC<MobileMoreMenuProps> = ({
  user,
  userRole: propUserRole,
  projects = [],
  authHeaders,
  getAuthHeaders,
  onOpenUserManagement,
  onOpenProfile: _onOpenProfile,
  onChangePassword,
  onNavigateTab,
  onLogout,
  onBack,
}) => {
  const [subView, setSubView] = useState<MoreSubView>('menu');
  const effectiveRole: UserRole = user?.role || propUserRole || 'STAFF';
  const effectiveUser: MobileMoreMenuUser = user || {
    fullName: getRoleSubtitle(effectiveRole),
    role: effectiveRole,
  };

  const initials =
    effectiveUser.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('') || 'U';

  if (subView === 'profile') {
    return (
      <MobileProfileView
        user={effectiveUser}
        projects={projects}
        onBack={() => setSubView('menu')}
        onChangePassword={onChangePassword}
        onLogout={onLogout}
      />
    );
  }

  if (subView === 'users') {
    return (
      <MobileUserManagementView
        userRole={effectiveRole}
        projects={projects}
        authHeaders={authHeaders}
        getAuthHeaders={getAuthHeaders}
        onBack={() => setSubView('menu')}
      />
    );
  }

  if (subView === 'devices') {
    return (
      <MobileDeviceApprovalsView
        userRole={effectiveRole}
        authHeaders={authHeaders}
        getAuthHeaders={getAuthHeaders}
        onBack={() => setSubView('menu')}
      />
    );
  }

  if (subView === 'audit') {
    return (
      <MobileActivityLogView
        userRole={effectiveRole}
        authHeaders={authHeaders}
        getAuthHeaders={getAuthHeaders}
        onBack={() => setSubView('menu')}
      />
    );
  }

  if (subView === 'settings') {
    return (
      <MobileSettingsView
        userRole={effectiveRole}
        authHeaders={authHeaders}
        getAuthHeaders={getAuthHeaders}
        onBack={() => setSubView('menu')}
      />
    );
  }

  if (subView === 'about') {
    return <MobileAboutAppView onBack={() => setSubView('menu')} />;
  }

  if (subView === 'help') {
    return <MobileHelpSupportView onBack={() => setSubView('menu')} />;
  }

  const isAdmin = effectiveRole === 'ADMIN';
  const canViewProgress = effectiveRole !== 'STAFF';

  const renderMenuItem = (
    icon: React.ReactNode,
    label: string,
    subtitle: string | undefined,
    onClick: () => void,
    danger = false
  ) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        background: 'transparent',
        border: 'none',
        padding: '13px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        textAlign: 'left',
        borderBottom: '1px solid #F5F5F7',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: danger ? '#FEF3F2' : '#F4EFEA',
            color: danger ? '#B42318' : '#352618',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: danger ? '#B42318' : '#0C0C0D' }}>
            {label}
          </div>
          {subtitle && <div style={{ fontSize: '11px', color: '#686869' }}>{subtitle}</div>}
        </div>
      </div>
      <ChevronRight size={16} color="#979798" />
    </button>
  );

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          {onBack && (
            <>
              <span className="figma-breadcrumb-link" onClick={onBack}>
                Home
              </span>
              <span className="figma-breadcrumb-sep">&gt;</span>
            </>
          )}
          <span className="active">More</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBack && (
            <button type="button" className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
          )}
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
            Studio Menu
          </h2>
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Real Profile Card (Zero hardcoded names or role parentheses) */}
        <button
          type="button"
          onClick={() => setSubView('profile')}
          style={{
            width: '100%',
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#352618',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '17px',
                fontWeight: 800,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0C0C0D' }}>
                {effectiveUser.fullName}
              </div>
              <div style={{ fontSize: '12px', color: '#BF935A', fontWeight: 600 }}>
                {getRoleSubtitle(effectiveRole)}
              </div>
            </div>
          </div>
          <ChevronRight size={18} color="#979798" />
        </button>

        {/* Admin Governance Section */}
        {isAdmin && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ padding: '12px 16px 6px', fontSize: '11px', fontWeight: 800, color: '#686869' }}>
              ADMIN GOVERNANCE
            </div>
            {renderMenuItem(
              <Users size={17} />,
              'User Directory',
              'Manage Staff, Client Leaders & Viewers',
              () => {
                if (onOpenUserManagement) {
                  onOpenUserManagement();
                } else {
                  setSubView('users');
                }
              }
            )}
            {renderMenuItem(
              <Smartphone size={17} />,
              'Device Approvals',
              'Approve or revoke trusted devices',
              () => setSubView('devices')
            )}
            {renderMenuItem(
              <History size={17} />,
              'Activity Log',
              'Studio security & vault audit trail',
              () => setSubView('audit')
            )}
            {onNavigateTab &&
              renderMenuItem(
                <BellRing size={17} />,
                'Admin Reminders',
                'Milestone deadlines & follow-ups',
                () => onNavigateTab('reminders')
              )}
          </div>
        )}

        {/* Workspace Shortcuts */}
        {onNavigateTab && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ padding: '12px 16px 6px', fontSize: '11px', fontWeight: 800, color: '#686869' }}>
              WORKSPACE
            </div>
            {canViewProgress &&
              renderMenuItem(
                <TrendingUp size={17} />,
                'Progress Report',
                '16-folder architectural progress',
                () => onNavigateTab('progress')
              )}
            {renderMenuItem(
              <Megaphone size={17} />,
              'Announcements',
              'Studio circulars & notices',
              () => onNavigateTab('announcement')
            )}
            {renderMenuItem(
              <ShieldCheck size={17} />,
              'Studio Policies',
              'Governance documents & sign-off',
              () => onNavigateTab('policies')
            )}
          </div>
        )}

        {/* Preferences & Account */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ padding: '12px 16px 6px', fontSize: '11px', fontWeight: 800, color: '#686869' }}>
            ACCOUNT &amp; PREFERENCES
          </div>
          {renderMenuItem(<UserIcon size={17} />, 'My Profile', 'Account details & projects', () =>
            setSubView('profile')
          )}
          {renderMenuItem(
            <Settings size={17} />,
            'Settings',
            isAdmin ? 'Theme, governance & offline cache' : 'Display theme & cache',
            () => setSubView('settings')
          )}
          {onChangePassword &&
            renderMenuItem(<Lock size={17} />, 'Change Password', 'Update login credentials', onChangePassword)}
          {renderMenuItem(<HelpCircle size={17} />, 'Help & Support', 'FAQs & Studio Desk', () =>
            setSubView('help')
          )}
          {renderMenuItem(<Info size={17} />, 'About A&F Design', 'Studio workspace info', () =>
            setSubView('about')
          )}
          {onLogout &&
            renderMenuItem(<LogOut size={17} />, 'Sign Out', undefined, onLogout, true)}
        </div>
      </div>
    </div>
  );
};
