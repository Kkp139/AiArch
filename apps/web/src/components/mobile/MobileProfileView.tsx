import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  Briefcase,
  Lock,
  Camera,
  FolderKanban,
  CheckCircle2,
  X,
  LogOut,
  Edit2,
} from 'lucide-react';
import './mobile.css';

export interface MobileProfileViewProps {
  user: {
    fullName: string;
    role: UserRole;
    email?: string;
    username?: string;
  };
  onBack: () => void;
  onChangePassword: () => void;
  onLogout: () => void;
}

export const MobileProfileView: React.FC<MobileProfileViewProps> = ({
  user,
  onBack,
  onChangePassword,
  onLogout,
}) => {
  const [fullName, setFullName] = useState(user.fullName || 'Farhan Admani');
  const [email, setEmail] = useState(user.email || 'farhan@asfdesign.in');
  const [phone, setPhone] = useState('+91 98251 99887');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const formatRole = (role?: string) => {
    if (!role) return '';
    switch (role.toUpperCase()) {
      case 'ADMIN':
        return 'Principal Studio Admin';
      case 'STAFF':
        return 'Project Architect (Staff)';
      case 'CLIENT_LEADER':
        return 'Client Principal Leader';
      case 'CLIENT_VIEWER':
        return 'Client Viewer';
      default:
        return role;
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditModalOpen(false);
    alert('Profile details updated successfully.');
  };

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">My Profile</h2>
        </div>
        <button
          className="figma-subpage-back"
          onClick={() => setIsEditModalOpen(true)}
          title="Edit Profile"
        >
          <Edit2 size={16} color="#0C0C0D" />
        </button>
      </div>

      <div className="figma-subpage-body">
        {/* Profile Card Header */}
        <div className="figma-profile-hero-card">
          <div style={{ position: 'relative', margin: '0 auto 12px', width: '84px', height: '84px' }}>
            <div className="figma-profile-avatar-large">
              {fullName ? fullName.charAt(0) : 'U'}
            </div>
            <button
              className="figma-avatar-edit-badge"
              onClick={() => alert('Photo upload: Camera & Photo Library access available on mobile PWA.')}
              title="Change Profile Photo"
            >
              <Camera size={14} color="#FFFFFF" />
            </button>
          </div>

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 4px 0', textAlign: 'center' }}>
            {fullName}
          </h3>
          <span className="figma-role-pill-center">{formatRole(user.role)}</span>
          <p style={{ fontSize: '12px', color: '#979798', margin: '6px 0 0 0', textAlign: 'center' }}>
            A&F Design Architecture & Interiors Studio
          </p>
        </div>

        {/* Contact & Account Information */}
        <div style={{ marginTop: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#686869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Personal & Studio Info
          </span>

          <div className="figma-info-group-card" style={{ marginTop: '8px' }}>
            <div className="figma-info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} color="#979798" />
                <span style={{ fontSize: '13px', color: '#686869' }}>Email Address</span>
              </div>
              <strong style={{ fontSize: '13px', color: '#0C0C0D' }}>{email}</strong>
            </div>

            <div className="figma-info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="#979798" />
                <span style={{ fontSize: '13px', color: '#686869' }}>WhatsApp / Phone</span>
              </div>
              <strong style={{ fontSize: '13px', color: '#0C0C0D' }}>{phone}</strong>
            </div>

            <div className="figma-info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Briefcase size={16} color="#979798" />
                <span style={{ fontSize: '13px', color: '#686869' }}>Security Clearance</span>
              </div>
              <span className="figma-status-badge cleared">Level 3 Studio Master</span>
            </div>
          </div>
        </div>

        {/* Assigned Projects */}
        <div style={{ marginTop: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#686869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active Projects ({user.role === 'ADMIN' ? 'All Studio Sites' : '2 Sites'})
          </span>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
            {['Courtyard Villa (AF-VILLA)', 'Artilla Inn (AF-INN)', 'Zenith HQ (AF-CORP)'].map((p) => (
              <div key={p} className="figma-assigned-proj-chip">
                <FolderKanban size={13} color="#BF935A" />
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Account Security & Actions */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="figma-btn-secondary-full"
            onClick={onChangePassword}
          >
            <Lock size={16} />
            <span>Change Workspace Password</span>
          </button>

          <button
            className="figma-btn-full figma-btn-danger"
            onClick={onLogout}
          >
            <LogOut size={16} />
            <span>Sign Out of Workspace</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Drawer */}
      {isEditModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Edit Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Phone / WhatsApp</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

