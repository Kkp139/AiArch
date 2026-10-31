import React, { useState } from 'react';
import {
  User,
  Users,
  Smartphone,
  UserCheck,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { MobileProfileView } from './MobileProfileView';
import { MobileDeviceApprovalsView } from './MobileDeviceApprovalsView';
import { MobileActivityLogView } from './MobileActivityLogView';
import { MobileSettingsView } from './MobileSettingsView';
import { MobileAboutAppView } from './MobileAboutAppView';
import { MobileHelpSupportView } from './MobileHelpSupportView';
import './mobile.css';

export interface MobileMoreMenuProps {
  userRole: UserRole;
  user?: {
    fullName: string;
    role: UserRole;
    email?: string;
    username?: string;
  };
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenUserManagement: () => void;
  onChangePassword?: () => void;
  onLogout: () => void;
}

type SubViewType =
  | 'menu'
  | 'profile'
  | 'device_approvals'
  | 'activity_log'
  | 'settings'
  | 'about_app'
  | 'help_support';

export const MobileMoreMenu: React.FC<MobileMoreMenuProps> = ({
  userRole,
  user = { fullName: 'Farhan Admani', role: userRole },
  theme = 'light',
  onToggleTheme = () => {},
  onOpenUserManagement,
  onChangePassword = () => {},
  onLogout,
}) => {
  const [subView, setSubView] = useState<SubViewType>('menu');

  // Sub-view renders
  if (subView === 'profile') {
    return (
      <MobileProfileView
        user={user}
        onBack={() => setSubView('menu')}
        onChangePassword={onChangePassword}
        onLogout={onLogout}
      />
    );
  }

  if (subView === 'device_approvals') {
    return (
      <MobileDeviceApprovalsView
        userRole={userRole}
        onBack={() => setSubView('menu')}
      />
    );
  }

  if (subView === 'activity_log') {
    return (
      <MobileActivityLogView
        userRole={userRole}
        onBack={() => setSubView('menu')}
      />
    );
  }

  if (subView === 'settings') {
    return (
      <MobileSettingsView
        userRole={userRole}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onBack={() => setSubView('menu')}
      />
    );
  }

  if (subView === 'about_app') {
    return <MobileAboutAppView onBack={() => setSubView('menu')} />;
  }

  if (subView === 'help_support') {
    return <MobileHelpSupportView onBack={() => setSubView('menu')} />;
  }

  // Root Menu Screen (Figma: 55:2381)
  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Header */}
      <div className="figma-subpage-header">
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0 0 0', color: '#0C0C0D' }}>
          More
        </h2>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* GROUP 1: ACCOUNT (Figma: Profile Flow) */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#686869', marginBottom: '8px' }}>
            Account
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div
              onClick={() => setSubView('profile')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #F5F5F7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Profile</h4>
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>View & edit profile details</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>

            <div
              onClick={onOpenUserManagement}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Team Members</h4>
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Manage studio team and project roles</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>
          </div>
        </div>

        {/* GROUP 2: MANAGEMENT (Figma: Management & Device Flow) */}
        {userRole === 'ADMIN' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#686869', marginBottom: '8px' }}>
              Management & Security
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              {/* Device Approvals Flow */}
              <div
                onClick={() => setSubView('device_approvals')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F5F5F7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Device Approvals</h4>
                      <span className="figma-status-badge pending" style={{ padding: '1px 6px', fontSize: '10px' }}>2 Pending</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Authorize trusted mobile sessions</p>
                  </div>
                </div>
                <ChevronRight size={18} color="#979798" />
              </div>

              {/* User Management Flow */}
              <div
                onClick={onOpenUserManagement}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #F5F5F7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>User Management</h4>
                    <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Single-use registration links & permissions</p>
                  </div>
                </div>
                <ChevronRight size={18} color="#979798" />
              </div>

              {/* Activity Log Flow */}
              <div
                onClick={() => setSubView('activity_log')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Activity Log</h4>
                    <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>View immutable studio audit trail</p>
                  </div>
                </div>
                <ChevronRight size={18} color="#979798" />
              </div>
            </div>
          </div>
        )}

        {/* GROUP 3: SETTING & SUPPORT (Figma: Settings, Help support, About app) */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#686869', marginBottom: '8px' }}>
            Setting & Support
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            {/* Settings */}
            <div
              onClick={() => setSubView('settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #F5F5F7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Settings</h4>
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Notifications, theme, biometric lock</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>

            {/* Help & Support (Guides & FAQs) */}
            <div
              onClick={() => setSubView('help_support')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
                borderBottom: '1px solid #F5F5F7',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Help & Support</h4>
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>How-to guides, FAQs & contact desk</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>

            {/* About App */}
            <div
              onClick={() => setSubView('about_app')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>About App</h4>
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Version 2.4.0, Terms & Privacy policy</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>
          </div>
        </div>

        {/* SIGN OUT BUTTON */}
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            height: '50px',
            borderRadius: '16px',
            background: '#FEE4E2',
            color: '#D92D20',
            fontSize: '15px',
            fontWeight: 700,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            marginTop: '8px',
          }}
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
