import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ConfirmDetailsFormProps {
  initialFullName: string;
  initialMobile: string;
  tempToken: string;
  onBack: () => void;
  onSuccess: (data: { fullName: string; mobile: string; debugOtp?: string }) => void;
}

export const ConfirmDetailsForm: React.FC<ConfirmDetailsFormProps> = ({
  initialFullName,
  initialMobile,
  tempToken,
  onBack,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState(initialFullName || '');
  const [mobile, setMobile] = useState(initialMobile || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim()) {
      setErrorMessage('Please enter both your name and WhatsApp mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          fullName: fullName.trim(),
          mobile: mobile.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Failed to dispatch verification code.');
        return;
      }

      onSuccess({
        fullName: fullName.trim(),
        mobile: mobile.trim(),
        debugOtp: data.debugOtp,
      });
    } catch (err: any) {
      setErrorMessage('Unable to connect to the studio server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-body-wrapper">
      <button
        type="button"
        className="form-back-btn"
        onClick={onBack}
        disabled={isLoading}
      >
        <ArrowLeft size={16} />
        <span>Back to Sign in</span>
      </button>

      <h2 className="form-heading">Confirm Your Details</h2>
      <p className="form-description">
        For account verification, please confirm your registered information.
      </p>

      {errorMessage && (
        <div className="form-alert-error">
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="confirm-full-name">
            Full Name (as registered)
          </label>
          <div className="form-input-container">
            <input
              id="confirm-full-name"
              type="text"
              className="form-input"
              placeholder="e.g. Raj Patel"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '18px' }}>
          <label className="form-label" htmlFor="confirm-phone-number">
            Phone Number
          </label>
          <div className="form-input-container">
            <input
              id="confirm-phone-number"
              type="tel"
              className="form-input"
              placeholder="+91 98251 99887"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <button
          type="submit"
          className="form-primary-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Sending OTP...</span>
            </>
          ) : (
            <span>Send OTP</span>
          )}
        </button>
      </form>
    </div>
  );
};
