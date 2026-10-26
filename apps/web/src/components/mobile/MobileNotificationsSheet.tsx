import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, Palette, UserPlus, Upload, Bell, CheckCircle2 } from 'lucide-react';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: string;
  isRead: boolean;
  createdAt: string;
}

export interface MobileNotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  authHeaders?: Record<string, string>;
}

export const MobileNotificationsSheet: React.FC<MobileNotificationsSheetProps> = ({
  isOpen,
  onClose,
  authHeaders,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!authHeaders) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to load notifications from DB', err);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkAllRead = async () => {
    if (!authHeaders) return;
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const handleItemClick = async (notif: NotificationItem) => {
    if (notif.isRead || !authHeaders) return;
    try {
      const res = await fetch(`/api/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  if (!isOpen) return null;

  const getRelativeTime = (isoString: string) => {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Group into today, yesterday, and earlier
  const now = new Date();
  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  };
  const isYesterday = (dateStr: string) => {
    const d = new Date(dateStr);
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return (
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()
    );
  };

  const todayList = notifications.filter((n) => isToday(n.createdAt));
  const yesterdayList = notifications.filter((n) => isYesterday(n.createdAt));
  const earlierList = notifications.filter((n) => !isToday(n.createdAt) && !isYesterday(n.createdAt));

  const getCategoryIcon = (category: string) => {
    switch (category?.toUpperCase()) {
      case 'DRAWING':
        return <Palette size={20} />;
      case 'TEAM':
        return <UserPlus size={20} />;
      case 'MEETING':
      case 'UPLOAD':
        return <Upload size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const renderCard = (notif: NotificationItem) => (
    <div
      key={notif.id}
      onClick={() => handleItemClick(notif)}
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '14px',
        border: '1px solid #EFEFEF',
        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'transform 0.15s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '42px',
            height: '42px',
            minWidth: '42px',
            borderRadius: '12px',
            background: '#352618',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getCategoryIcon(notif.category)}
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
          <h5
            style={{
              fontSize: '14px',
              fontWeight: 700,
              margin: '0 0 2px 0',
              color: '#0C0C0D',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {notif.title}
          </h5>
          <div
            style={{
              fontSize: '12px',
              color: '#686869',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {notif.message}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#979798', whiteSpace: 'nowrap' }}>
          {getRelativeTime(notif.createdAt)}
        </span>
        {!notif.isRead && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#12B76A',
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="figma-sheet-backdrop" onClick={onClose}>
      <div
        className="figma-sheet-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '20px 20px 32px 20px',
          borderRadius: '28px 28px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header (Figma: 74:9791) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#F5F5F7',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={20} color="#0C0C0D" />
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Notifications
            </h3>
          </div>

          <button
            onClick={handleMarkAllRead}
            style={{
              background: 'none',
              border: 'none',
              color: '#BF935A',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Mark all as read
          </button>
        </div>

        {/* LOADING STATE */}
        {isLoading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#686869', fontSize: '14px' }}>
            Loading notifications from database...
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <CheckCircle2 size={40} color="#BF935A" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0C0C0D' }}>
              All caught up!
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
              You don&apos;t have any notifications at the moment.
            </p>
          </div>
        )}

        {/* TODAY SECTION */}
        {todayList.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#686869', marginBottom: '12px' }}>
              Today
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayList.map(renderCard)}
            </div>
          </div>
        )}

        {/* YESTERDAY SECTION */}
        {yesterdayList.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#686869', marginBottom: '12px' }}>
              Yesterday
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {yesterdayList.map(renderCard)}
            </div>
          </div>
        )}

        {/* EARLIER SECTION */}
        {earlierList.length > 0 && (
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#686869', marginBottom: '12px' }}>
              Earlier
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {earlierList.map(renderCard)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
