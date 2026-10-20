import React, { useState } from 'react';
import './auth.css';
import { EditorialPanel } from './EditorialPanel';
import { SignInForm } from './SignInForm';
import { ConfirmDetailsForm } from './ConfirmDetailsForm';
import { OtpVerificationForm } from './OtpVerificationForm';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight } from 'lucide-react';

type AuthStep = 'SIGN_IN' | 'CONFIRM_DETAILS' | 'VERIFY_OTP';

interface IntermediateAuthData {
  tempToken: string;
  fullName: string;
  mobile: string;
  debugOtp?: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [step, setStep] = useState<AuthStep>('SIGN_IN');
  const [intermediateData, setIntermediateData] = useState<IntermediateAuthData | null>(null);

  const handleSignInSuccess = (data: {
    requireOtp: boolean;
    tempToken?: string;
    token?: string;
    user: any;
  }) => {
    if (!data.requireOtp && data.token) {
      // Direct login (Admin)
      login(data.user, data.token);
    } else if (data.requireOtp && data.tempToken) {
      // Transition to Step 2 (Staff & Client)
      setIntermediateData({
        tempToken: data.tempToken,
        fullName: data.user.fullName || '',
        mobile: data.user.mobile || '',
      });
      setStep('CONFIRM_DETAILS');
    }
  };

  const handleDetailsConfirmed = (data: {
    fullName: string;
    mobile: string;
    debugOtp?: string;
  }) => {
    if (intermediateData) {
      setIntermediateData({
        ...intermediateData,
        fullName: data.fullName,
        mobile: data.mobile,
        debugOtp: data.debugOtp,
      });
    }
    setStep('VERIFY_OTP');
  };

  const handleOtpVerified = (data: { token: string; user: any }) => {
    login(data.user, data.token);
  };

  return (
    <div className="auth-viewport">
      {/* Left Column (Desktop) / Top Section (Mobile): Editorial Architecture */}
      <EditorialPanel />

      {/* Right Column (Desktop) / Bottom Sheet (Mobile): Form Container */}
      <div className="auth-form-col">
        {/* Masthead Header */}
        <div>
          <div className="form-header-row">
            <div className="form-logo-badge">
              <img
                src="/assets/auth/asf_logo.png"
                alt="asf design logo"
                className="form-logo-img"
              />
            </div>
            <a
              href="#need-help"
              className="form-help-link"
              onClick={(e) => {
                e.preventDefault();
                alert('Support assistance: Please contact support@pronex-archai.com or +91 98251 00001.');
              }}
            >
              <span>Need help?</span>
              <ArrowRight size={14} />
            </a>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <span className="form-private-tag">PRIVATE WORKSPACE</span>
          </div>
        </div>

        {/* Dynamic Multi-Step Form */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {step === 'SIGN_IN' && (
            <SignInForm onSuccess={handleSignInSuccess} />
          )}

          {step === 'CONFIRM_DETAILS' && intermediateData && (
            <ConfirmDetailsForm
              initialFullName={intermediateData.fullName}
              initialMobile={intermediateData.mobile}
              tempToken={intermediateData.tempToken}
              onBack={() => setStep('SIGN_IN')}
              onSuccess={handleDetailsConfirmed}
            />
          )}

          {step === 'VERIFY_OTP' && intermediateData && (
            <OtpVerificationForm
              mobile={intermediateData.mobile}
              tempToken={intermediateData.tempToken}
              debugOtp={intermediateData.debugOtp}
              onBack={() => setStep('CONFIRM_DETAILS')}
              onSuccess={handleOtpVerified}
            />
          )}
        </div>

        {/* Form Footer */}
        <div className="form-footer-section">
          <div className="form-footer-row-1">
            <span>Secure access. Shared vision.</span>
            <a
              href="#privacy"
              className="form-text-link"
              onClick={(e) => {
                e.preventDefault();
                alert('Privacy Policy: All studio CAD drawings and client records are encrypted and protected under strict single-tenant data isolation.');
              }}
            >
              Privacy policy →
            </a>
          </div>
          <div className="form-footer-row-2">
            <span>Having trouble with your invitation or account? </span>
            <a
              href="#contact-team"
              className="form-text-link"
              onClick={(e) => {
                e.preventDefault();
                alert('Studio Team Contact: Reach your assigned project coordinator or studio admin.');
              }}
            >
              Contact your project team →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
