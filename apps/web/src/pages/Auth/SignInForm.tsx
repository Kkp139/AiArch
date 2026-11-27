import React, { useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface SignInFormProps {
  initialUsername?: string;
  setupSuccessMessage?: string | null;
  onSuccess: (data: {
    requireOtp: boolean;
    tempToken?: string;
    token?: string;
    user: any;
  }) => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  initialUsername = '',
  setupSuccessMessage = null,
  onSuccess,
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Authentication failed. Please check your credentials.');
        return;
      }

      onSuccess(data);
    } catch (err: any) {
      setErrorMessage('Unable to connect to the studio server. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-body-wrapper">
      <h2 className="form-heading">Sign In to Your Workspace</h2>
      <p className="form-description">
        Access your projects and collaborate with your team.
      </p>

      {setupSuccessMessage && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#065f46',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '14px',
          }}
        >
          {setupSuccessMessage}
        </div>
      )}

      {errorMessage && (
        <div className="form-alert-error">
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="auth-username">
            Username
          </label>
          <div className="form-input-container">
            <input
              id="auth-username"
              type="text"
              autoComplete="username"
              className={`form-input ${errorMessage ? 'has-error' : ''}`}
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="auth-password">
            Password
          </label>
          <div className="form-input-container">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={`form-input ${errorMessage ? 'has-error' : ''}`}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <button
              type="button"
              className="form-input-icon-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="form-forgot-row">
          <button
            type="button"
            className="form-text-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onClick={() => setShowForgotHelp((prev) => !prev)}
          >
            Forgot password?
          </button>
        </div>

        {showForgotHelp && (
          <div
            role="status"
            style={{
              padding: '10px 12px',
              marginBottom: '14px',
              borderRadius: '8px',
              backgroundColor: 'rgba(191, 147, 90, 0.12)',
              border: '1px solid rgba(191, 147, 90, 0.35)',
              color: '#4A4A4C',
              fontSize: '12.5px',
              lineHeight: 1.5,
            }}
          >
            Password resets are issued securely by your Studio Administrator. Contact admin@afdesign.studio or your project coordinator for a single-use reset link.
          </div>
        )}

        <button
          type="submit"
          className="form-primary-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            <span>Sign in</span>
          )}
        </button>
      </form>
    </div>
  );
};
