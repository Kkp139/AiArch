import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Settings,
  ShieldCheck,
  Database,
  Moon,
  Sun,
  CheckCircle2,
  X,
  Loader2,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { purgePwaSessionCache } from '../../pwa/registerServiceWorker';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileSettingsViewProps {
  userRole?: UserRole;
  theme?: string;
  onToggleTheme?: () => void;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onBack: () => void;
}

interface GovernanceSettings {
  requireDeviceApproval: boolean;
  requireDrawingVerification: boolean;
  maxUploadSizeMb: number;
  dailyUpdateMode: 'SLOT_GATED' | 'FLEXIBLE';
}

export const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({
  userRole = 'ADMIN',
  theme,
  onToggleTheme,
  authHeaders,
  getAuthHeaders,
  onBack,
}) => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('af_theme') === 'dark';
  });

  const [govSettings, setGovSettings] = useState<GovernanceSettings>({
    requireDeviceApproval: true,
    requireDrawingVerification: true,
    maxUploadSizeMb: 50,
    dailyUpdateMode: 'SLOT_GATED',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchSettings = useCallback(async () => {
    if (userRole !== 'ADMIN') return;
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch('/api/settings', { headers });
      if (res.ok) {
        const data = await res.json();
        const cfg = data.settings || data;
        setGovSettings({
          requireDeviceApproval: cfg.requireDeviceApproval ?? true,
          requireDrawingVerification: cfg.requireDrawingVerification ?? true,
          maxUploadSizeMb: Number(cfg.maxUploadSizeMb) || 50,
          dailyUpdateMode: cfg.dailyUpdateMode === 'FLEXIBLE' ? 'FLEXIBLE' : 'SLOT_GATED',
        });
      }
    } catch {
      // Keep default state gracefully
    } finally {
      setLoading(false);
    }
  }, [userRole, authHeaders, getAuthHeaders]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('af_theme', next ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    }
    setBanner({
      type: 'success',
      message: `Switched display theme to ${next ? 'Dark' : 'Light'} mode.`,
    });
  };

  const handleSaveGovernance = async (patch: Partial<GovernanceSettings>) => {
    const updated = { ...govSettings, ...patch };
    setGovSettings(updated);
    setSaving(true);
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setBanner({ type: 'success', message: 'Studio governance policy saved.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Unable to save settings.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error updating studio settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await purgePwaSessionCache();
      setBanner({ type: 'success', message: 'Offline PWA cache cleared successfully.' });
    } catch {
      setBanner({ type: 'error', message: 'Unable to clear offline cache.' });
    }
  };

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            More
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Preferences</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Settings
            </h2>
            <div style={{ fontSize: '12px', color: '#686869' }}>
              Appearance &amp; Studio Governance
            </div>
          </div>
        </div>
      </div>

      {banner && (
        <div
          style={{
            margin: '12px 16px 0 16px',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: banner.type === 'success' ? '#ECFDF3' : '#FEF3F2',
            color: banner.type === 'success' ? '#027A48' : '#B42318',
          }}
        >
          <span>{banner.message}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Display Theme Preference */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {darkMode ? <Moon size={18} color="#352618" /> : <Sun size={18} color="#BF935A" />}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0C0C0D' }}>
                  Architectural Mode Theme
                </div>
                <div style={{ fontSize: '12px', color: '#686869' }}>
                  {darkMode ? 'Dark Studio' : 'Light Studio'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme || handleToggleTheme}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                background: '#F9F9FB',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Switch
            </button>
          </div>
        </div>

        {/* Biometric App Lock */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0C0C0D' }}>Biometric App Lock</div>
            <div style={{ fontSize: '12px', color: '#686869' }}>Require Face ID / Fingerprint on launch</div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#027A48' }}>Enabled</span>
        </div>

        {/* Admin Governance Rules */}
        {userRole === 'ADMIN' && (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '18px',
              border: '1px solid rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700 }}>
                <ShieldCheck size={17} color="#352618" /> Admin Governance Policies
              </div>
              {(loading || saving) && <Loader2 size={15} className="animate-spin" color="#352618" />}
            </div>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
              <span>Require Admin Device Approval</span>
              <input
                type="checkbox"
                checked={govSettings.requireDeviceApproval}
                onChange={(e) => handleSaveGovernance({ requireDeviceApproval: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#352618' }}
              />
            </label>

            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
              <span>Require Drawing Verification Gate</span>
              <input
                type="checkbox"
                checked={govSettings.requireDrawingVerification}
                onChange={(e) => handleSaveGovernance({ requireDrawingVerification: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#352618' }}
              />
            </label>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Max Upload Size Limit (MB)
              </label>
              <select
                value={govSettings.maxUploadSizeMb}
                onChange={(e) => handleSaveGovernance({ maxUploadSizeMb: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  background: '#FFFFFF',
                }}
              >
                <option value={25}>25 MB</option>
                <option value={50}>50 MB (Default)</option>
                <option value={100}>100 MB</option>
                <option value={250}>250 MB</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Daily Update Clock-Out Trigger
              </label>
              <select
                value={govSettings.dailyUpdateMode}
                onChange={(e) => handleSaveGovernance({ dailyUpdateMode: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  background: '#FFFFFF',
                }}
              >
                <option value="SLOT_GATED">Hard Gate (12:00 &amp; 17:30 Slots Required)</option>
                <option value="FLEXIBLE">Flexible Single Update</option>
              </select>
            </div>
          </div>
        )}

        {/* Storage & Cache */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.04)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} color="#352618" />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0C0C0D' }}>Offline Storage</div>
              <div style={{ fontSize: '12px', color: '#686869' }}>Purge cached assets</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #FECDCA',
              background: '#FEF3F2',
              color: '#B42318',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Clear Cache
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#686869', fontSize: '11px' }}>
          <CheckCircle2 size={13} color="#027A48" />
          <Settings size={13} />
          <span>Synced with A&amp;F Design Backend</span>
        </div>
      </div>
    </div>
  );
};
