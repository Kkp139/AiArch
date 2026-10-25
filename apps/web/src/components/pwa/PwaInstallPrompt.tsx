import React, { useState, useEffect } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle2, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // 1. Detect if running in standalone mode (already installed)
    const isStandaloneMode =
      (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)')?.matches) ||
      (typeof window !== 'undefined' && (window.navigator as any)?.standalone === true);
    setIsStandalone(Boolean(isStandaloneMode));

    if (isStandaloneMode) return;

    // Check dismissal status (stored for 7 days)
    try {
      const dismissedUntil = localStorage.getItem('pwa_install_dismissed_until');
      if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
        setIsDismissed(true);
      }
    } catch {}

    // 2. Detect iOS / iPadOS
    const userAgent = typeof window !== 'undefined' && window.navigator?.userAgent ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (typeof window !== 'undefined' && window.navigator?.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    setIsIos(isIosDevice);

    // 3. Listen for Chromium / Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for app installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      console.log('[PWA] App successfully installed!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosModal(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      // Dismiss for 7 days
      localStorage.setItem('pwa_install_dismissed_until', (Date.now() + 7 * 24 * 60 * 60 * 1000).toString());
    } catch {}
  };

  // If already standalone or user dismissed, don't show the banner
  if (isStandalone || isDismissed) {
    return null;
  }

  // Show if either deferredPrompt is available (Chrome/Edge/Android) OR it's an iOS device
  const canInstall = !!deferredPrompt || isIos;
  if (!canInstall) {
    return null;
  }

  return (
    <>
      {/* Floating Modern Studio Install Banner */}
      <div
        className="pwa-install-banner"
        style={{
          position: 'fixed',
          bottom: 'max(16px, calc(var(--sab, 0px) + 16px))',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: '520px',
          backgroundColor: '#14181D',
          border: '1px solid #BF935A',
          borderRadius: '16px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)',
          zIndex: 9990,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#0C0C0D',
              border: '1px solid #30363d',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <img src="/favicon.svg" alt="A&F Design" style={{ width: '28px', height: '24px' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.2px' }}>
              Install A&F Design App
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#9CA3AF',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {isIos ? 'Add to Home Screen for full-screen experience' : 'Instant access & offline resilience'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handleInstallClick}
            aria-label="Install Studio App"
            style={{
              backgroundColor: '#BF935A',
              color: '#0C0C0D',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
          >
            {isIos ? <Smartphone size={14} /> : <Download size={14} />}
            <span>{isIos ? 'Install' : 'Install'}</span>
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss installation banner"
            style={{
              color: '#6B7280',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Step-by-Step Installation Modal */}
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 10000,
          }}
          onClick={() => setShowIosModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#14181D',
              border: '1px solid #30363D',
              borderRadius: '24px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8)',
              color: '#F3F4F6',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src="/favicon.svg" alt="A&F Design" style={{ width: '32px', height: '28px' }} />
                <h3 id="ios-install-title" style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                onClick={() => setShowIosModal(false)}
                aria-label="Close dialog"
                style={{ color: '#9CA3AF', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#9CA3AF', lineHeight: 1.5, marginBottom: '20px' }}>
              Follow these simple steps in Safari to add the A&F Design Portal to your iOS Home Screen for a native app experience:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#1F252E',
                    color: '#BF935A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Tap the Share Button</div>
                  <div style={{ fontSize: '12px', color: '#8B949E', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    Tap <Share2 size={13} style={{ color: '#3B82F6' }} /> at the bottom or top bar of Safari.
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#1F252E',
                    color: '#BF935A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Select "Add to Home Screen"</div>
                  <div style={{ fontSize: '12px', color: '#8B949E', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    Scroll down the menu and choose <PlusSquare size={13} style={{ color: '#BF935A' }} /> <strong>Add to Home Screen</strong>.
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#1F252E',
                    color: '#BF935A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '13px',
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF' }}>Tap "Add" in Top Right</div>
                  <div style={{ fontSize: '12px', color: '#8B949E', marginTop: '2px' }}>
                    The A&F Design Studio icon will be placed directly on your Home Screen.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosModal(false)}
              style={{
                width: '100%',
                backgroundColor: '#BF935A',
                color: '#0C0C0D',
                padding: '12px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
