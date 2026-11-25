import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X, KeyRound } from 'lucide-react';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
}

export const MobileChangePasswordModal: React.FC<MobileChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userName,
  authHeaders,
  getAuthHeaders,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentPassword.trim()) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('New password cannot be identical to the current password.');
      return;
    }

    setSubmitting(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMsg(data.error || 'Failed to update password. Please verify your current password.');
        setSubmitting(false);
        return;
      }

      setSuccessMsg('Your studio password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1400);
    } catch {
      setErrorMsg('Network error updating password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5500,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '26px',
          borderTopRightRadius: '26px',
          padding: '24px 20px',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
          animation: 'slideUpSheet 0.25s ease-out',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(191, 147, 90, 0.15)',
                color: '#352618',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
                Change Password
              </h3>
              <p style={{ fontSize: '12px', color: '#686869', margin: 0 }}>
                {userName ? `Update credentials for ${userName}` : 'Update your A&F Design credentials'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: '#F5F5F7',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4A4A4C',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#FEF3F2',
              color: '#B42318',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#ECFDF3',
              color: '#027A48',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '6px' }}>
              Current Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#979798" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 40px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#686869',
                  cursor: 'pointer',
                }}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '6px' }}>
              New Password (Min 8 chars)
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#979798" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Create new strong password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 40px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#686869',
                  cursor: 'pointer',
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '6px' }}>
              Confirm New Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="#979798" style={{ position: 'absolute', left: '14px', top: '14px' }} />
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 40px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#686869',
                  cursor: 'pointer',
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              background: '#352618',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '8px',
              boxShadow: '0 4px 12px rgba(53, 38, 24, 0.2)',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Updating Password...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
