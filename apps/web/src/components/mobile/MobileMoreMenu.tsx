import React from 'react';
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
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';

export interface MobileMoreMenuProps {
  userRole: UserRole;
  onOpenUserManagement: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
}

export const MobileMoreMenu: React.FC<MobileMoreMenuProps> = ({
  userRole,
  onOpenUserManagement,
  onOpenProfile,
  onLogout,
}) => {
  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Header (Figma: 55:2381) */}
      <div className="figma-subpage-header">
        <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0 0 0', color: '#0C0C0D' }}>
          More
        </h2>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* GROUP 1: ACCOUNT */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#686869', marginBottom: '8px' }}>
            Account
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div
              onClick={onOpenProfile}
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
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Set up your profile</p>
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
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Team member</h4>
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Manage team and role</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>
          </div>
        </div>

        {/* GROUP 2: MANAGEMENT (Admin & Staff) */}
        {userRole === 'ADMIN' && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#686869', marginBottom: '8px' }}>
              Management
            </div>
            <div style={{ background: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div
                onClick={() => alert('Device Approvals: All mobile & tablet hardware tokens verified under strict biometric binding.')}
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
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Device Approvals</h4>
                    <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Manage device requests</p>
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
                  borderBottom: '1px solid #F5F5F7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#352618', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <UserCheck size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>User Management</h4>
                    <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Add or remove users (Single-use link)</p>
                  </div>
                </div>
                <ChevronRight size={18} color="#979798" />
              </div>

              <div
                onClick={() => alert('Activity Log: 48 recent studio actions logged with immutable timestamps.')}
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
                    <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>View recent activities</p>
                  </div>
                </div>
                <ChevronRight size={18} color="#979798" />
              </div>
            </div>
          </div>
        )}

        {/* GROUP 3: SETTING & SUPPORT */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#686869', marginBottom: '8px' }}>
            Setting & support
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <div
              onClick={() => alert('Studio Settings: Notifications, dark mode toggle, WhatsApp gateway.')}
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
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>App preferences</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>

            <div
              onClick={() => alert('Help & Support: Direct studio hotline +91 98251 99887 or support@asfdesign.in')}
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
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Get help & contact us</p>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>

            <div
              onClick={() => alert('A&F Design Portal v2.4.0 — Architecture & Interior Studio Edition')}
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
                  <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>Version privacy and terms</p>
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
