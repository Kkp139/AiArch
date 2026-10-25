import React, { useState } from 'react';
import './auth.css';
import { EditorialPanel } from './EditorialPanel';
import { SignInForm } from './SignInForm';
import { ConfirmDetailsForm } from './ConfirmDetailsForm';
import { OtpVerificationForm } from './OtpVerificationForm';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Smartphone, Monitor, Signal, Wifi, Battery } from 'lucide-react';

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
  const [isPhoneView, setIsPhoneView] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 768 : false;
  });

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

  // -------------------------------------------------------------------------
  // FIGMA MOBILE PHONE LOGIN SCREEN (Matching Figma Node 17:102, 21:3621)
  // -------------------------------------------------------------------------
  if (isPhoneView) {
    return (
      <div style={{ backgroundColor: '#1A1D20', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 32px 0' }}>
        {/* View Switcher Pill */}
        <div
          style={{
            position: 'fixed',
            top: '8px',
            right: '8px',
            zIndex: 1000,
            background: 'rgba(20, 24, 29, 0.9)',
            border: '1px solid #30363d',
            borderRadius: '20px',
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            color: '#c9d1d9',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ color: '#BF935A', fontWeight: 700 }}>Figma Phone Login</span>
          <button
            onClick={() => setIsPhoneView(false)}
            style={{
              background: '#21262d',
              color: '#8b949e',
              border: 'none',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Desktop View
          </button>
        </div>

        {/* 390x844 Mobile Device Viewport (Figma: 17:102) */}
        <div
          className="figma-mobile-viewport"
          style={{
            borderRadius: '36px',
            overflow: 'hidden',
            backgroundColor: '#0C0C0D',
            minHeight: '844px',
            height: 'auto',
          }}
        >
          {/* Top Status Bar (Figma: 17:106) */}
          <div className="figma-status-bar on-dark">
            <span>9:41</span>
            <div className="figma-status-icons">
              <Signal size={14} />
              <Wifi size={14} />
              <Battery size={16} />
            </div>
          </div>

          {/* Top Architectural Photo Banner with Editorial Text */}
          <div
            style={{
              height: '350px',
              position: 'relative',
              backgroundImage: 'url(/assets/auth/editorial_courtyard_clean.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '16px 20px 32px 20px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(12,12,13,0.3) 0%, rgba(12,12,13,0.7) 70%, rgba(12,12,13,0.95) 100%)',
              }}
            />

            {/* Logo & Discipline */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <img src="/assets/auth/asf_logo.svg" alt="asf design" style={{ height: '36px', width: 'auto' }} />
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
                ARCHITECTURE & INTERIORS
              </div>
            </div>

            {/* Editorial Quote (Figma: 17:138) */}
            <div style={{ position: 'relative', zIndex: 2 }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.15, margin: '0 0 6px 0' }}>
                Great spaces.<br />Built together.
              </h2>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.35 }}>
                A considered place for every drawing, decision and conversation.
              </p>
            </div>
          </div>

          {/* Curved Bottom Sheet (Figma: 17:123) */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '28px 28px 0 0',
              marginTop: '-24px',
              position: 'relative',
              zIndex: 10,
              padding: '24px 20px 32px 20px',
              flex: 1,
            }}
          >
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
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // DESKTOP SPLIT VIEW
  // -------------------------------------------------------------------------
  return (
    <div className="auth-viewport">
      {/* Switch to Phone View Button */}
      <button
        onClick={() => setIsPhoneView(true)}
        title="Switch to Mobile Phone Login (Figma Spec)"
        style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          padding: '6px 14px',
          borderRadius: '20px',
          backgroundColor: '#352618',
          color: '#BF935A',
          border: '1px solid #BF935A',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <Smartphone size={14} />
        <span>📱 Phone Screen (Figma)</span>
      </button>

      {/* Left Column (Desktop) / Top Section (Mobile): Editorial Architecture */}
      <EditorialPanel />

      {/* Right Column (Desktop) / Bottom Sheet (Mobile): Form Container */}
      <div className="auth-form-col">
        {/* Masthead Header */}
        <div>
          <div className="form-header-row">
            <div className="form-logo-badge">
              <img
                src="/assets/auth/asf_logo.svg"
                alt="asf design"
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

