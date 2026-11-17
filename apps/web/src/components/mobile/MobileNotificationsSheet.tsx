import React from 'react';
import { ChevronLeft, Calendar, Check, Bell, ChevronRight, Clock, MapPin } from 'lucide-react';
import { InAppNotificationItem } from '../layout/Shell';

export interface MobileNotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: InAppNotificationItem[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onNotificationClick?: (notif: InAppNotificationItem) => void;
}

export const MobileNotificationsSheet: React.FC<MobileNotificationsSheetProps> = ({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  return (
    <div className="figma-sheet-backdrop" onClick={onClose}>
      <div
        className="figma-sheet-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '20px 20px 32px 20px',
          borderRadius: '28px 28px 0 0',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-secondary, #FFFFFF)',
          color: 'var(--text-primary, #0C0C0D)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--bg-surface, #F5F5F7)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={20} color="currentColor" />
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0C0C0D)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: 'var(--accent-gold, #BF935A)',
                  color: '#0d0f12',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          {unreadCount > 0 && onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-gold, #BF935A)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div
            style={{
              padding: '40px 16px',
              textAlign: 'center',
              color: 'var(--text-muted, #686869)',
            }}
          >
            <Bell size={32} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #0C0C0D)' }}>
              No notifications yet
            </h4>
            <p style={{ margin: 0, fontSize: '13px' }}>
              Meeting invitations and project updates will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((notif) => {
              const isMeeting = notif.category === 'MEETING';
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (onNotificationClick) {
                      onNotificationClick(notif);
                    }
                    onClose();
                  }}
                  style={{
                    background: notif.isRead ? 'var(--bg-surface, #F9F9FA)' : 'var(--bg-tertiary, #FFFFFF)',
                    borderRadius: '18px',
                    padding: '16px',
                    border: notif.isRead ? '1px solid var(--border-subtle, #EFEFEF)' : '1px solid var(--accent-gold, #BF935A)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: isMeeting ? 'rgba(191, 147, 90, 0.15)' : 'rgba(59, 130, 246, 0.12)',
                        color: isMeeting ? 'var(--accent-gold, #BF935A)' : 'var(--accent-blue, #3B82F6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isMeeting ? <Calendar size={22} /> : <Check size={22} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isMeeting ? 'var(--accent-gold, #BF935A)' : 'var(--accent-blue, #3B82F6)',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                          }}
                        >
                          {isMeeting ? 'Meeting Invite' : notif.category}
                        </span>

                        {notif.projectCode && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #686869)' }}>
                            {notif.projectCode}
                          </span>
                        )}

                        {!notif.isRead && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent-emerald, #12B76A)',
                              marginLeft: 'auto',
                            }}
                          />
                        )}
                      </div>

                      <h4
                        style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          margin: '0 0 4px 0',
                          color: 'var(--text-primary, #0C0C0D)',
                          lineHeight: 1.3,
                        }}
                      >
                        {notif.title}
                      </h4>

                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary, #686869)',
                          margin: '0 0 10px 0',
                          lineHeight: 1.4,
                        }}
                      >
                        {notif.message}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #979798)' }}>
                          {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Recent'}
                        </span>

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--accent-gold, #BF935A)',
                          }}
                        >
                          <span>Open Meeting</span>
                          <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
