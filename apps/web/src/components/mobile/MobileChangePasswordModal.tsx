import React, { useState } from 'react';
import { ChevronLeft, Lock, Eye, EyeOff, Check, X, Loader2 } from 'lucide-react';

export interface MobileChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  userName?: string;
  authHeaders?: Record<string, string>;
}

export const MobileChangePasswordModal: React.FC<MobileChangePasswordModalProps> = ({
  isOpen,
  onClose,
  userName,
  authHeaders,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Password rules validation
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  const rulesPassedCount = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentPassword.trim()) {
      setErrorMessage('Please enter your current password.');
      return;
    }
    if (rulesPassedCount < 4) {
      setErrorMessage('New password does not meet the security criteria.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          currentPassword: currentPassword.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to update password. Please check your credentials.');
        return;
      }

      setSuccessMessage('Password updated successfully!');
      setTimeout(() => {
        onClose();
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while updating password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          maxHeight: '90vh',
          backgroundColor: '#F0F0F0',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.25)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
        }}
      >
        {/* Header (Figma: 240:5287) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid #E2E2E6',
            backgroundColor: '#FFFFFF',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#F0F0F2',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <ChevronLeft size={20} color="#1D1D1F" />
          </button>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1D1D1F' }}>
            Change password
          </h3>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Security Info Card (Figma: 240:5291) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: '1px solid #EAEAED',
            }}
          >
            <Lock size={18} color="#686869" />
            <span style={{ fontSize: '13px', color: '#686869', lineHeight: 1.4 }}>
              Use a strong password to keep your account secure
            </span>
          </div>

          {errorMessage && (
            <div
              style={{
                backgroundColor: '#FFEBEE',
                border: '1px solid #FFCDD2',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#D32F2F',
              }}
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div
              style={{
                backgroundColor: '#E8F5E9',
                border: '1px solid #C8E6C9',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#2E7D32',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Current Password Field (Figma: 240:5296) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: 500, color: '#4A4A4C' }}>
              Current Password <span style={{ color: '#DF3344' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showCurrent ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '8px',
                  border: '1px solid #B5B6BC',
                  backgroundColor: '#FFFFFF',
                  padding: '0 40px 0 14px',
                  fontSize: '14px',
                  color: '#0C0C0D',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#686869',
                  padding: '4px',
                }}
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password Field (Figma: 240:5301) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: 500, color: '#4A4A4C' }}>
              New Password <span style={{ color: '#DF3344' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showNew ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '8px',
                  border: '1px solid #B5B6BC',
                  backgroundColor: '#FFFFFF',
                  padding: '0 40px 0 14px',
                  fontSize: '14px',
                  color: '#0C0C0D',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#686869',
                  padding: '4px',
                }}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Password Strength Meter (Figma: 240:5307) */}
          <div style={{ display: 'flex', gap: '4px', margin: '2px 0' }}>
            {[1, 2, 3, 4, 5].map((idx) => {
              const active = idx <= rulesPassedCount;
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '4px',
                    backgroundColor: active
                      ? rulesPassedCount >= 4
                        ? '#2E7D32'
                        : '#BF935A'
                      : '#DBDBDF',
                    transition: 'background-color 0.2s',
                  }}
                />
              );
            })}
          </div>

          {/* Requirements Checklist (Figma: 240:5313) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '4px 0' }}>
            <span style={{ fontSize: '12px', color: '#686869', lineHeight: 1.35 }}>
              Password must be at least 8 characters with a mix of letters, number and symbols
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { label: 'At least 8 characters', passed: hasMinLength },
                { label: 'One uppercase letter', passed: hasUpperCase },
                { label: 'One lower letter', passed: hasLowerCase },
                { label: 'One number', passed: hasNumber },
                { label: 'One special character', passed: hasSpecial },
              ].map((rule, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: rule.passed ? '#2E7D32' : '#686869' }}>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      border: `1.5px solid ${rule.passed ? '#2E7D32' : '#979798'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: rule.passed ? '#2E7D32' : 'transparent',
                    }}
                  >
                    {rule.passed && <Check size={10} color="#FFFFFF" />}
                  </div>
                  <span>{rule.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confirm New Password Field (Figma: 240:5331) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13.5px', fontWeight: 500, color: '#4A4A4C' }}>
              Confirm New Password <span style={{ color: '#DF3344' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Re-Enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '46px',
                  borderRadius: '8px',
                  border: '1px solid #B5B6BC',
                  backgroundColor: '#FFFFFF',
                  padding: '0 40px 0 14px',
                  fontSize: '14px',
                  color: '#0C0C0D',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#686869',
                  padding: '4px',
                }}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button (Figma: 240:5340) */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#BF935A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              boxShadow: '0 4px 12px rgba(191, 147, 90, 0.25)',
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <span>Update Password</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
