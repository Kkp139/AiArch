import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  Calendar,
  CreditCard,
  ShieldCheck,
  Clock,
  MessageSquare,
  Megaphone,
  Target,
} from 'lucide-react';
import { InAppNotificationItem } from '../layout/Shell';
import { AuthHeadersInput, formatShortDateTime, resolveAuthHeaders } from './mobileAuth';

export interface MobileNotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: InAppNotificationItem[];
  unreadCount?: number;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onMarkAllRead?: () => void;
  onNotificationClick?: (notification: InAppNotificationItem) => void;
}

function getCategoryStyle(category: string) {
  switch ((category || '').toUpperCase()) {
    case 'MEETING':
      return { bg: 'rgba(191,147,90,0.14)', color: '#9E743F', icon: Calendar };
    case 'PAYMENT':
      return { bg: '#ECFDF3', color: '#027A48', icon: CreditCard };
    case 'VERIFICATION':
      return { bg: '#EFF8FF', color: '#175CD3', icon: ShieldCheck };
    case 'CHAT':
      return { bg: '#F4F3FF', color: '#5925DC', icon: MessageSquare };
    case 'ANNOUNCEMENT':
      return { bg: '#FFF4ED', color: '#B93815', icon: Megaphone };
    case 'TARGET':
      return { bg: '#FEF3F2', color: '#B42318', icon: Target };
    default:
      return { bg: '#F2F4F7', color: '#344054', icon: Bell };
  }
}

export const MobileNotificationsSheet: React.FC<MobileNotificationsSheetProps> = ({
  isOpen,
  onClose,
  notifications: propNotifications,
  unreadCount: propUnreadCount,
  authHeaders,
  getAuthHeaders,
  onMarkAllRead,
  onNotificationClick,
}) => {
  const [localNotifications, setLocalNotifications] = useState<InAppNotificationItem[]>([]);
  const [localUnread, setLocalUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch('/api/notifications', { headers });
      if (res.ok) {
        const data = await res.json();
        setLocalNotifications(data.notifications || []);
        setLocalUnread(
          typeof data.unreadCount === 'number'
            ? data.unreadCount
            : (data.notifications || []).filter((n: any) => !n.isRead).length
        );
      }
    } catch {
      // Leave clean empty state
    }
  }, [authHeaders, getAuthHeaders]);

  useEffect(() => {
    if (isOpen && !propNotifications) {
      fetchNotifications();
    }
  }, [isOpen, propNotifications, fetchNotifications]);

  if (!isOpen) return null;

  const notifications = propNotifications ?? localNotifications;
  const unreadCount =
    typeof propUnreadCount === 'number' ? propUnreadCount : localUnread;

  const handleMarkAll = async () => {
    if (onMarkAllRead) {
      onMarkAllRead();
      return;
    }
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      await fetchNotifications();
    } catch {
      // ignore
    }
  };

  const handleClickNotification = async (notif: InAppNotificationItem) => {
    if (onNotificationClick) {
      onNotificationClick(notif);
      return;
    }
    try {
      if (!notif.isRead) {
        const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
        await fetch(`/api/notifications/${encodeURIComponent(notif.id)}/read`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        await fetchNotifications();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: '26px',
          borderTopRightRadius: '26px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 20px 14px 20px',
            borderBottom: '1px solid #F0F0F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Notifications
            </h3>
            <span style={{ fontSize: '12px', color: '#686869' }}>
              {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                style={{
                  background: '#F4EFEA',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#352618',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                }}
              >
                <CheckCheck size={14} /> Mark Read
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close notifications"
              style={{
                background: '#F5F5F7',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4A4A4C',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px 32px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
              <Bell size={38} color="#979798" style={{ opacity: 0.4, margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0C0C0D', marginBottom: '4px' }}>
                No notifications yet
              </div>
              <div style={{ fontSize: '13px' }}>
                Updates on drawings, meetings, and payments appear here.
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const cat = getCategoryStyle(notif.category);
              const Icon = cat.icon;
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleClickNotification(notif)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: notif.isRead ? '#FFFFFF' : '#FCF9F6',
                    borderRadius: '16px',
                    padding: '14px',
                    border: notif.isRead ? '1px solid #F0F0F2' : '1px solid rgba(191, 147, 90, 0.35)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: cat.bg,
                      color: cat.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0C0C0D' }}>
                        {notif.title}
                      </span>
                      {!notif.isRead && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#352618',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </div>

                    <p style={{ fontSize: '12px', color: '#4A4A4C', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                      {notif.message}
                    </p>

                    <div style={{ fontSize: '11px', color: '#979798', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {formatShortDateTime(notif.createdAt)}
                      {notif.projectCode && ` • ${notif.projectCode}`}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
