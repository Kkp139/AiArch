import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface OtpVerificationFormProps {
  mobile: string;
  tempToken: string;
  debugOtp?: string;
  onBack: () => void;
  onSuccess: (data: { token: string; user: any }) => void;
}

export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  mobile,
  tempToken,
  debugOtp = '123456',
  onBack,
  onSuccess,
}) => {
  const [digits, setDigits] = useState<string[]>(['1', '2', '3', '4', '5', '6']);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [countdown, setCountdown] = useState(30);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // 30s Countdown timer for Resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    setErrorMessage(null);
    setHasError(false);

    // Handle single digit input
    const cleanChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanChar;
    setDigits(newDigits);

    // Auto advance focus to next box
    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // If current is empty and backspace pressed, move to previous box
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    // Focus last filled digit or submit button
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = digits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      setHasError(true);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasError(false);

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          otp: fullOtp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error || 'Invalid or expired verification code.');
        setHasError(true);
        return;
      }

      onSuccess(data);
    } catch (err: any) {
      setErrorMessage('Unable to connect to the studio server.');
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isLoading) return;
    setErrorMessage(null);
    setHasError(false);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, mobile }),
      });
      if (res.ok) {
        setCountdown(30);
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (e) {
      setErrorMessage('Failed to resend verification code.');
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
        <span>Change phone number</span>
      </button>

      <h2 className="form-heading">Verify OTP</h2>
      <p className="form-description">
        A 6-digit verification code has been dispatched to WhatsApp on{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{mobile}</strong>.
      </p>

      {errorMessage && (
        <div className="form-alert-error">
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleVerify}>
        <div className="otp-boxes-grid" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              className={`otp-box-input ${hasError ? 'has-error' : ''}`}
              placeholder="—"
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              disabled={isLoading}
              autoComplete="one-time-code"
              aria-label={`Digit ${idx + 1}`}
            />
          ))}
        </div>

        <button
          type="submit"
          className="form-primary-btn"
          disabled={isLoading || digits.join('').length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify OTP</span>
          )}
        </button>

        <div className="otp-resend-row">
          <span>Didn't receive the code?</span>
          {countdown > 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>
              Resend in {countdown}s
            </span>
          ) : (
            <button
              type="button"
              className="form-text-link"
              style={{ background: 'none', border: 'none', padding: 0 }}
              onClick={handleResend}
            >
              Resend OTP
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
