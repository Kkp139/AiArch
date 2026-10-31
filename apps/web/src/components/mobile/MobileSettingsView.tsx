import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  Settings,
  Bell,
  MessageSquare,
  Moon,
  Sun,
  Fingerprint,
  HardDrive,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import './mobile.css';

export interface MobileSettingsViewProps {
  userRole: UserRole;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onBack: () => void;
}

export const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({
  userRole,
  theme,
  onToggleTheme,
  onBack,
}) => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(true);
  const [drawingAlerts, setDrawingAlerts] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [offlineCache, setOfflineCache] = useState(true);

  const handleClearCache = () => {
    if (confirm('Clear local offline drawing cache? Drawing files will be fetched on demand.')) {
      alert('PWA storage cache cleared successfully.');
    }
  };

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <div>
            <h2 className="figma-subpage-title">Settings</h2>
            <span style={{ fontSize: '11px', color: '#686869' }}>
              App Preferences & Security
            </span>
          </div>
        </div>
      </div>

      <div className="figma-subpage-body">
        {/* GROUP 1: NOTIFICATIONS */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#686869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Notifications & Broadcasts
          </span>

          <div className="figma-settings-card" style={{ marginTop: '8px' }}>
            <div className="figma-setting-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={18} color="#BF935A" />
                <div>
                  <h4 className="figma-setting-label">Mobile Push Notifications</h4>
                  <p className="figma-setting-sub">Alerts for meetings, targets and drawing updates</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={pushEnabled}
                onChange={() => setPushEnabled(!pushEnabled)}
                className="figma-switch-toggle"
              />
            </div>

            <div className="figma-setting-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MessageSquare size={18} color="#087A48" />
                <div>
                  <h4 className="figma-setting-label">WhatsApp Channel Sync</h4>
                  <p className="figma-setting-sub">Receive instant milestone and OTP alerts on WhatsApp</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={whatsAppEnabled}
                onChange={() => setWhatsAppEnabled(!whatsAppEnabled)}
                className="figma-switch-toggle"
              />
            </div>

            <div className="figma-setting-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} color="#175CD3" />
                <div>
                  <h4 className="figma-setting-label">Drawing Seal & Stamp Notifications</h4>
                  <p className="figma-setting-sub">Immediate notification upon architect sign-off</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={drawingAlerts}
                onChange={() => setDrawingAlerts(!drawingAlerts)}
                className="figma-switch-toggle"
              />
            </div>
          </div>
        </div>

        {/* GROUP 2: APPEARANCE & SECURITY */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#686869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Display & Security
          </span>

          <div className="figma-settings-card" style={{ marginTop: '8px' }}>
            <div className="figma-setting-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {theme === 'dark' ? <Moon size={18} color="#BF935A" /> : <Sun size={18} color="#BF935A" />}
                <div>
                  <h4 className="figma-setting-label">Architectural Mode Theme</h4>
                  <p className="figma-setting-sub">Current: {theme === 'dark' ? 'Charcoal Dark' : 'Warm Limestone Light'}</p>
                </div>
              </div>
              <button
                type="button"
                className="figma-btn-sm"
                style={{ background: '#F4EFEB', color: '#352618', fontWeight: 700 }}
                onClick={onToggleTheme}
              >
                Switch
              </button>
            </div>

            <div className="figma-setting-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Fingerprint size={18} color="#A35A13" />
                <div>
                  <h4 className="figma-setting-label">Biometric App Lock</h4>
                  <p className="figma-setting-sub">Require FaceID / Fingerprint on mobile resume</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={biometricEnabled}
                onChange={() => setBiometricEnabled(!biometricEnabled)}
                className="figma-switch-toggle"
              />
            </div>
          </div>
        </div>

        {/* GROUP 3: STORAGE & CACHE */}
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#686869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Offline Drawing Storage
          </span>

          <div className="figma-settings-card" style={{ marginTop: '8px' }}>
            <div className="figma-setting-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <HardDrive size={18} color="#686869" />
                <div>
                  <h4 className="figma-setting-label">PWA Offline Vault Sync</h4>
                  <p className="figma-setting-sub">Cache recent drawing sheets for offline site visits</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={offlineCache}
                onChange={() => setOfflineCache(!offlineCache)}
                className="figma-switch-toggle"
              />
            </div>

            <div className="figma-setting-row" style={{ cursor: 'pointer' }} onClick={handleClearCache}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trash2 size={18} color="#D92D20" />
                <div>
                  <h4 className="figma-setting-label" style={{ color: '#D92D20' }}>Clear Offline Drawing Cache</h4>
                  <p className="figma-setting-sub">Frees up 14.8 MB local device storage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

