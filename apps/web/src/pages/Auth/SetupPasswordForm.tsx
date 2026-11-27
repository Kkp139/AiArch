import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

interface SetupPasswordFormProps {
  token: string;
  onBackToSignIn: () => void;
  onSuccess: (username: string) => void;
}

export const SetupPasswordForm: React.FC<SetupPasswordFormProps> = ({
  token,
  onBackToSignIn,
  onSuccess,
}) => {
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadInfo = async () => {
      if (!token) {
        if (active) {
          setFatalError('Setup token is missing from the link.');
          setLoadingInfo(false);
        }
        return;
      }
      try {
        const res = await fetch(`/api/auth/setup-password/info?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok || !data.valid) {
          setFatalError(
            data.error ||
              'This setup link is invalid or has expired. Please contact studio administration for a new invitation.',
          );
        } else {
          setUsername(data.username || '');
          setFullName(data.fullName || '');
          setRole(data.role || '');
        }
      } catch {
        if (active) {
          setFatalError('Unable to verify your invitation link. Please check your connection.');
        }
      } finally {
        if (active) setLoadingInfo(false);
      }
    };
    void loadInfo();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to configure password.');
        return;
      }
      onSuccess(username);
    } catch {
      setErrorMessage('Unable to connect to the studio server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInfo) {
    return (
      <div className="form-body-wrapper" style={{ textAlign: 'center', padding: '32px 0' }}>
        <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#B08949' }} />
        <p className="form-description" style={{ margin: 0 }}>
          Verifying your secure studio invitation...
        </p>
      </div>
    );
  }

  if (fatalError) {
    return (
      <div className="form-body-wrapper">
        <button type="button" className="form-back-btn" onClick={onBackToSignIn}>
          <ArrowLeft size={16} />
          <span>Back to Sign in</span>
        </button>

        <h2 className="form-heading">Invitation Link Unavailable</h2>
        <div className="form-alert-error" style={{ marginTop: '12px', marginBottom: '20px' }}>
          <span>{fatalError}</span>
        </div>
        <button type="button" className="form-primary-btn" onClick={onBackToSignIn}>
          <span>Go to Sign In</span>
        </button>
      </div>
    );
  }

  return (
    <div className="form-body-wrapper">
      <button
        type="button"
        className="form-back-btn"
        onClick={onBackToSignIn}
        disabled={isSubmitting}
      >
        <ArrowLeft size={16} />
        <span>Back to Sign in</span>
      </button>

      <h2 className="form-heading">Set Your Password</h2>
      <p className="form-description">
        Welcome{fullName ? `, ${fullName}` : ''}! Create a permanent password for your{' '}
        {role ? <strong>{role.replace(/_/g, ' ')}</strong> : 'studio'} account.
      </p>

      {errorMessage && (
        <div className="form-alert-error">
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="setup-username">
            Username
          </label>
          <div className="form-input-container">
            <input
              id="setup-username"
              type="text"
              className="form-input"
              value={username}
              readOnly
              style={{ backgroundColor: '#f3f4f6', cursor: 'default', fontWeight: 600 }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="setup-new-password">
            New Password
          </label>
          <div className="form-input-container">
            <input
              id="setup-new-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className="form-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '18px' }}>
          <label className="form-label" htmlFor="setup-confirm-password">
            Confirm Password
          </label>
          <div className="form-input-container">
            <input
              id="setup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>
        </div>

        <button type="submit" className="form-primary-btn" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Saving Password...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>Set Password &amp; Continue</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
