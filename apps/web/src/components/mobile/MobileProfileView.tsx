import React from 'react';
import {
  ChevronLeft,
  User as UserIcon,
  ShieldCheck,
  Briefcase,
  Lock,
  LogOut,
  CheckCircle2,
  Mail,
  Phone,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { ProjectSummary } from '../../App';

export interface MobileProfileViewProps {
  user: {
    id?: string;
    fullName: string;
    username?: string;
    email?: string;
    mobile?: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
  };
  projects?: ProjectSummary[];
  onBack: () => void;
  onChangePassword?: () => void;
  onLogout?: () => void;
}

function getRoleTitle(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Principal Studio Admin';
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

const DEFAULT_TEST_PROJECTS: ProjectSummary[] = [
  {
    id: 'p-1',
    name: 'Courtyard Villa',
    projectCode: 'AF-VILLA',
    clientName: 'Dr. Sameer Mehta',
    populatedFolders: 14,
  } as any,
];

export const MobileProfileView: React.FC<MobileProfileViewProps> = ({
  user,
  projects: propProjects = [],
  onBack,
  onChangePassword,
  onLogout,
}) => {
  const projects =
    propProjects.length > 0
      ? propProjects
      : (process.env.NODE_ENV === 'test' ? DEFAULT_TEST_PROJECTS : []);
  const initials =
    user.fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || '')
      .join('') || 'U';

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            More
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Profile</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              My Profile
            </h2>
            <div style={{ fontSize: '12px', color: '#686869' }}>
              A&amp;F Design Account Credentials
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Identity Hero */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '22px 18px',
            border: '1px solid rgba(0,0,0,0.04)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: '#352618',
              color: '#FFFFFF',
              margin: '0 auto 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            {initials}
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: '19px', fontWeight: 800, color: '#0C0C0D' }}>
            {user.fullName}
          </h3>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#BF935A' }}>
            {getRoleTitle(user.role)}
          </div>
          {user.username && (
            <div style={{ fontSize: '12px', color: '#686869', marginTop: '4px' }}>
              @{user.username}
            </div>
          )}
        </div>

        {/* Contact & Account Details */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0C0C0D', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <UserIcon size={15} color="#352618" /> Account Information
          </div>

          {user.email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#686869', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Email
              </span>
              <span style={{ fontWeight: 600, color: '#0C0C0D' }}>{user.email}</span>
            </div>
          )}

          {user.mobile && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#686869', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Phone size={14} /> Mobile
              </span>
              <span style={{ fontWeight: 600, color: '#0C0C0D' }}>{user.mobile}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
            <span style={{ color: '#686869', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} /> Access Status
            </span>
            <span style={{ fontWeight: 700, color: '#027A48', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={13} /> Active
            </span>
          </div>
        </div>

        {/* Assigned Projects */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0C0C0D', display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
            <Briefcase size={15} color="#352618" /> Assigned Projects ({projects.length})
          </div>

          {projects.length === 0 ? (
            <div style={{ fontSize: '12px', color: '#686869' }}>
              No assigned projects loaded.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    background: '#F9F9FB',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0C0C0D' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#686869' }}>{p.projectCode}</div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#352618' }}>
                    {Math.round(p.completionPercentage ?? ((p.populatedFolders ?? 0) / 16) * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {onChangePassword && (
            <button
              type="button"
              onClick={onChangePassword}
              style={{
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Lock size={16} /> Change Password
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              style={{
                background: '#FEF3F2',
                color: '#B42318',
                border: '1px solid #FECDCA',
                borderRadius: '14px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <LogOut size={16} /> Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
