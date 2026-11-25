import React, { useState } from 'react';
import { X, Headphones, Mail, Phone, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { InAppNotificationItem } from '../layout/Shell';
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopTopNav } from './DesktopTopNav';
import './desktop.css';

export interface DesktopShellProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
    email?: string;
    username?: string;
  };
  activeModule?: string;
  onSelectModule?: (moduleId: string, subTab?: string) => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  notifications?: InAppNotificationItem[];
  unreadCount?: number;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notif: InAppNotificationItem) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onOpenNotifications?: () => void;
  onContactSupport?: () => void;
  studioName?: string;
  children: React.ReactNode;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({
  user,
  activeModule = 'dashboard',
  onSelectModule,
  onLogout,
  onChangePassword,
  notifications = [],
  unreadCount,
  onMarkAllNotificationsRead,
  onNotificationClick,
  searchValue = '',
  onSearchChange,
  onOpenNotifications,
  onContactSupport,
  studioName = 'A&F Design',
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  const handleOpenSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      setSupportSubmitted(false);
      setIsSupportOpen(true);
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    setSupportSubmitted(true);
    setSupportSubject('');
    setSupportMessage('');
  };

  return (
    <div className="desktop-shell-root" data-testid="desktop-shell-root">
      <DesktopSidebar
        user={user}
        activeModule={activeModule}
        onSelectModule={(mod) => onSelectModule?.(mod)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onContactSupport={handleOpenSupport}
        studioName={studioName}
      />

      <div className="desktop-main-wrapper" data-testid="desktop-main-wrapper">
        <DesktopTopNav
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onOpenNotifications={onOpenNotifications}
          onMarkAllNotificationsRead={onMarkAllNotificationsRead}
          onNotificationClick={onNotificationClick}
          onNavigateModule={(mod, subTab) => onSelectModule?.(mod, subTab)}
          onChangePassword={onChangePassword}
          onLogout={onLogout}
        />

        <main className="desktop-viewport" data-testid="desktop-viewport">
          <div className="desktop-canvas-container" data-testid="desktop-canvas-container">
            {children}
          </div>
        </main>
      </div>

      {/* Studio Support & Help Dialog */}
      {isSupportOpen && (
        <div
          className="desk-modal-overlay"
          onClick={() => setIsSupportOpen(false)}
          data-testid="desktop-support-modal"
        >
          <div className="desk-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="desk-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="desk-soft-icon-box" style={{ width: '38px', height: '38px' }}>
                  <Headphones size={18} />
                </div>
                <div>
                  <h2 className="desk-modal-title">{studioName} Studio Support</h2>
                  <div style={{ fontSize: '12px', color: 'var(--desk-text-secondary)' }}>
                    Direct architectural desk assistance & troubleshooting
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsSupportOpen(false)}
                aria-label="Close support dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="desk-modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'var(--desk-gold-soft)',
                  border: '1px solid var(--desk-gold-border)',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={15} color="#BF935A" />
                  <span>studio@afdesign.in</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={15} color="#BF935A" />
                  <span>Mon–Sat • 10:00–19:30 IST</span>
                </div>
              </div>

              {supportSubmitted ? (
                <div className="desk-banner success" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={18} />
                    <span>
                      Support message logged for studio administration. We will respond shortly.
                    </span>
                  </div>
                </div>
              ) : (
                <form id="support-request-form" onSubmit={handleSupportSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="desk-form-group">
                    <label>Subject</label>
                    <input
                      type="text"
                      className="desk-form-input"
                      placeholder="e.g. Vault drawing access or meeting slot help"
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div className="desk-form-group">
                    <label>Message</label>
                    <textarea
                      className="desk-form-textarea"
                      rows={4}
                      placeholder="Describe how the studio team can assist you..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      required
                    />
                  </div>
                </form>
              )}
            </div>

            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setIsSupportOpen(false)}
              >
                Close
              </button>
              {!supportSubmitted && (
                <button
                  type="submit"
                  form="support-request-form"
                  className="desk-btn desk-btn-gold"
                >
                  Send Support Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
