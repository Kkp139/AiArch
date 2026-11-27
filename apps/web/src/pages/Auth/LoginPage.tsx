import React, { useState } from 'react';
import './auth.css';
import { EditorialPanel } from './EditorialPanel';
import { SignInForm } from './SignInForm';
import { ConfirmDetailsForm } from './ConfirmDetailsForm';
import { OtpVerificationForm } from './OtpVerificationForm';
import { SetupPasswordForm } from './SetupPasswordForm';
import { useAuth } from '../../context/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { ArrowRight, X, ShieldCheck, Headphones, Users } from 'lucide-react';

type AuthStep = 'SIGN_IN' | 'CONFIRM_DETAILS' | 'VERIFY_OTP' | 'SETUP_PASSWORD';
type InfoModalTopic = 'help' | 'privacy' | 'team' | null;

interface IntermediateAuthData {
  tempToken: string;
  fullName: string;
  mobile: string;
  debugOtp?: string;
}

const INFO_MODAL_CONTENT: Record<Exclude<InfoModalTopic, null>, { title: string; body: string }> = {
  help: {
    title: 'A&F Design Workspace Support',
    body: 'Need assistance accessing your studio account or invitation? Reach A&F Design support at support@afdesign.studio or contact your project coordinator.',
  },
  privacy: {
    title: 'Studio Data & Privacy Policy',
    body: 'All A&F Design architectural drawings, CAD blueprints, and project communications are encrypted and strictly isolated by project and role permissions.',
  },
  team: {
    title: 'Contact Your Project Team',
    body: 'If your setup invitation expired or your WhatsApp OTP number changed, ask your Studio Administrator to re-issue a secure access link.',
  },
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { isMobile } = useResponsive();
  const initialSetupToken =
    typeof window !== 'undefined' && window.location.pathname === '/setup-password'
      ? new URLSearchParams(window.location.search).get('token') || ''
      : '';
  const [step, setStep] = useState<AuthStep>(
    typeof window !== 'undefined' && window.location.pathname === '/setup-password'
      ? 'SETUP_PASSWORD'
      : 'SIGN_IN',
  );
  const [setupToken] = useState(initialSetupToken);
  const [prefilledUsername, setPrefilledUsername] = useState('');
  const [setupSuccessMsg, setSetupSuccessMsg] = useState<string | null>(null);
  const [intermediateData, setIntermediateData] = useState<IntermediateAuthData | null>(null);
  const [infoModal, setInfoModal] = useState<InfoModalTopic>(null);

  const clearSetupUrl = () => {
    if (typeof window !== 'undefined' && window.location.pathname === '/setup-password') {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleSetupSuccess = (configuredUsername: string) => {
    clearSetupUrl();
    setPrefilledUsername(configuredUsername);
    setSetupSuccessMsg('Password configured successfully! Please sign in with your new password.');
    setStep('SIGN_IN');
  };

  const handleSignInSuccess = (data: {
    requireOtp: boolean;
    tempToken?: string;
    token?: string;
    user: any;
  }) => {
    if (!data.requireOtp && data.token) {
      login(data.user, data.token);
    } else if (data.requireOtp && data.tempToken) {
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

  const renderInfoModal = () => {
    if (!infoModal) return null;
    const content = INFO_MODAL_CONTENT[infoModal];
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-info-modal-title"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1200,
          backgroundColor: 'rgba(12, 12, 13, 0.55)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
        onClick={() => setInfoModal(null)}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
            border: '1px solid #EAEAED',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#BF935A' }}>
              {infoModal === 'privacy' ? <ShieldCheck size={18} /> : infoModal === 'team' ? <Users size={18} /> : <Headphones size={18} />}
              <h3 id="auth-info-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0C0C0D' }}>
                {content.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setInfoModal(null)}
              aria-label="Close dialog"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#686869',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
          <p style={{ margin: '0 0 18px 0', fontSize: '13.5px', lineHeight: 1.6, color: '#4A4A4C' }}>
            {content.body}
          </p>
          <button
            type="button"
            onClick={() => setInfoModal(null)}
            style={{
              width: '100%',
              height: '40px',
              backgroundColor: '#BF935A',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <div
        style={{
          backgroundColor: '#0C0C0D',
          width: '100%',
          height: '100dvh',
          minHeight: '100dvh',
          maxHeight: '100dvh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          padding: 0,
        }}
      >
        <div
          className="figma-mobile-viewport"
          style={{
            width: '100%',
            maxWidth: '100%',
            height: '100dvh',
            minHeight: '100dvh',
            maxHeight: '100dvh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0C0C0D',
          }}
        >
          {/* Top Architectural Photo Banner with Editorial Text (Figma: 17:102, 21:3621) */}
          <div
            style={{
              flex: '1 1 auto',
              minHeight: '220px',
              position: 'relative',
              backgroundImage: 'url(/assets/auth/editorial_courtyard_clean.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: 'max(16px, env(safe-area-inset-top, 16px)) 20px 42px 20px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(25, 17, 2, 0.44) 0%, rgba(46, 32, 3, 0.05) 42%, #191102 100%)',
              }}
            />

            <div style={{ position: 'relative', zIndex: 2 }}>
              <img src="/assets/auth/asf_logo.svg" alt="asf design" style={{ height: '38px', width: 'auto' }} />
              <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', color: '#B9B9BA', marginTop: '6px' }}>
                ARCHITECTURE &amp; INTERIORS
              </div>
            </div>

            <div style={{ position: 'relative', zIndex: 2 }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#E8E8E9', lineHeight: '36px', margin: '0 0 4px 0' }}>
                Great spaces.<br />Built together.
              </h2>
              <p style={{ fontSize: '12px', color: '#F4F4F4', margin: 0, lineHeight: '18px' }}>
                A considered place for every drawing, decision and conversation.
              </p>
            </div>
          </div>

          {/* Curved Bottom Sheet (Figma: 21:3645, 17:123) */}
          <div
            style={{
              backgroundColor: '#E8E8E8',
              borderTop: '2px solid #FFFFFF',
              borderRadius: '28px 28px 0 0',
              marginTop: '-28px',
              position: 'relative',
              zIndex: 10,
              padding: '26px 20px max(24px, env(safe-area-inset-bottom, 24px)) 20px',
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '80dvh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              boxSizing: 'border-box',
              boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.25)',
            }}
          >
            {step === 'SETUP_PASSWORD' && (
              <SetupPasswordForm
                token={setupToken}
                onBackToSignIn={() => {
                  clearSetupUrl();
                  setStep('SIGN_IN');
                }}
                onSuccess={handleSetupSuccess}
              />
            )}

            {step === 'SIGN_IN' && (
              <SignInForm
                initialUsername={prefilledUsername}
                setupSuccessMessage={setupSuccessMsg}
                onSuccess={handleSignInSuccess}
              />
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
        {renderInfoModal()}
      </div>
    );
  }

  return (
    <div className="auth-viewport">
      <EditorialPanel />

      <div className="auth-form-col">
        <div>
          <div className="form-header-row">
            <div className="form-logo-badge">
              <img
                src="/assets/auth/asf_logo.svg"
                alt="asf design"
                className="form-logo-img"
              />
            </div>
            <button
              type="button"
              className="form-help-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setInfoModal('help')}
            >
              <span>Need help?</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <span className="form-private-tag">PRIVATE WORKSPACE</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {step === 'SETUP_PASSWORD' && (
            <SetupPasswordForm
              token={setupToken}
              onBackToSignIn={() => {
                clearSetupUrl();
                setStep('SIGN_IN');
              }}
              onSuccess={handleSetupSuccess}
            />
          )}

          {step === 'SIGN_IN' && (
            <SignInForm
              initialUsername={prefilledUsername}
              setupSuccessMessage={setupSuccessMsg}
              onSuccess={handleSignInSuccess}
            />
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

        <div className="form-footer-section">
          <div className="form-footer-row-1">
            <span>Secure access. Shared vision.</span>
            <button
              type="button"
              className="form-text-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setInfoModal('privacy')}
            >
              Privacy policy →
            </button>
          </div>
          <div className="form-footer-row-2">
            <span>Having trouble with your invitation or account? </span>
            <button
              type="button"
              className="form-text-link"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              onClick={() => setInfoModal('team')}
            >
              Contact your project team →
            </button>
          </div>
        </div>
      </div>
      {renderInfoModal()}
    </div>
  );
};
