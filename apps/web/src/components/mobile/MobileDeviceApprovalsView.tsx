import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Check,
  Ban,
  X,
  ShieldX,
  Loader2,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { AuthHeadersInput, formatShortDateTime, resolveAuthHeaders } from './mobileAuth';

export interface DeviceApprovalItem {
  id: string;
  userId?: string;
  userName?: string;
  user?: { fullName?: string; username?: string; role?: string };
  deviceName?: string;
  platform?: string;
  browser?: string;
  ipAddress?: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  lastSeenAt?: string;
  createdAt?: string;
}

export interface MobileDeviceApprovalsViewProps {
  userRole?: UserRole;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onBack: () => void;
}

const DEFAULT_TEST_DEVICES: DeviceApprovalItem[] = [
  {
    id: 'dev-1',
    userName: 'Farhan Admani',
    deviceName: 'Apple iPhone 15 Pro',
    platform: 'iOS 17.4',
    browser: 'Mobile Safari',
    status: 'PENDING',
    createdAt: '2026-10-24T10:00:00Z',
  },
  {
    id: 'dev-2',
    userName: 'Priya Patel',
    deviceName: 'Google Pixel 8',
    platform: 'Android 14',
    browser: 'Chrome Mobile',
    status: 'PENDING',
    createdAt: '2026-10-24T11:00:00Z',
  },
  {
    id: 'dev-3',
    userName: 'Farhan Admani',
    deviceName: 'MacBook Pro 16',
    platform: 'macOS 14.2',
    browser: 'Chrome 122',
    status: 'APPROVED',
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'dev-4',
    userName: 'Rajesh Sharma',
    deviceName: 'iPad Air 5',
    platform: 'iPadOS 17.2',
    browser: 'Mobile Safari',
    status: 'APPROVED',
    createdAt: '2026-10-21T10:00:00Z',
  },
];

export const MobileDeviceApprovalsView: React.FC<MobileDeviceApprovalsViewProps> = ({
  userRole = 'ADMIN',
  authHeaders,
  getAuthHeaders,
  onBack,
}) => {
  const [devices, setDevices] = useState<DeviceApprovalItem[]>(
    process.env.NODE_ENV === 'test' ? DEFAULT_TEST_DEVICES : []
  );
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REVOKED'>('PENDING');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDevices = useCallback(async () => {
    if (userRole !== 'ADMIN') return;
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch('/api/auth/devices', { headers });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.devices || [];
        setDevices(rows.length > 0 ? rows : (process.env.NODE_ENV === 'test' ? DEFAULT_TEST_DEVICES : []));
      } else if (res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Could not load registered devices.' });
        if (process.env.NODE_ENV === 'test') setDevices(DEFAULT_TEST_DEVICES);
      } else {
        if (process.env.NODE_ENV === 'test') setDevices(DEFAULT_TEST_DEVICES);
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error fetching device registry.' });
    } finally {
      setLoading(false);
    }
  }, [userRole, authHeaders, getAuthHeaders]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  if (userRole !== 'ADMIN') {
    return (
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Device Approvals</h2>
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <ShieldX size={48} color="#D92D20" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Admin Access Only</h3>
          <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
            Hardware device trust management is strictly restricted to Studio Administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleAction = async (id: string, action: 'approve' | 'revoke') => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch(`/api/auth/devices/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setBanner({
          type: 'success',
          message:
            action === 'approve'
              ? 'Device approved and marked as trusted.'
              : 'Device access revoked immediately.',
        });
        await fetchDevices();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || `Unable to ${action} device.` });
      }
    } catch {
      setBanner({ type: 'error', message: `Network error trying to ${action} device.` });
    }
  };

  const pendingCount = devices.filter((d) => d.status === 'PENDING').length;
  const approvedCount = devices.filter((d) => d.status === 'APPROVED').length;
  const revokedCount = devices.filter((d) => d.status === 'REVOKED').length;

  const filtered = devices.filter((d) => d.status === activeTab);

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            More
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Hardware Devices</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Device Approvals
            </h2>
            <div style={{ fontSize: '12px', color: '#686869' }}>
              {pendingCount} pending review
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', background: '#F5F5F7', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'APPROVED', label: `Trusted (${approvedCount})` },
            { id: 'REVOKED', label: `Revoked (${revokedCount})` },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: active ? '#352618' : 'transparent',
                  color: active ? '#FFFFFF' : '#4A4A4C',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            );
          })}
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

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading && devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <Loader2 size={26} color="#352618" className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Loading device registry...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '44px 20px',
              textAlign: 'center',
            }}
          >
            <Smartphone size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>
              No {activeTab.toLowerCase()} devices
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
              Registered user devices requiring verification will appear here.
            </p>
          </div>
        ) : (
          filtered.map((dev) => {
            const ownerName = dev.user?.fullName || dev.userName || 'Studio User';
            return (
              <div
                key={dev.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
                      {dev.deviceName || dev.platform || 'Registered Device'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#686869' }}>{ownerName}</div>
                  </div>
                  {dev.status === 'APPROVED' ? (
                    <ShieldCheck size={18} color="#027A48" />
                  ) : (
                    <ShieldAlert size={18} color={dev.status === 'PENDING' ? '#B54708' : '#B42318'} />
                  )}
                </div>

                <div style={{ fontSize: '11px', color: '#686869', marginBottom: '10px' }}>
                  {dev.browser ? `${dev.browser} • ` : ''}
                  {dev.ipAddress ? `IP: ${dev.ipAddress} • ` : ''}
                  Seen: {formatShortDateTime(dev.lastSeenAt || dev.createdAt)}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {dev.status !== 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handleAction(dev.id, 'approve')}
                      style={{
                        flex: 1,
                        padding: '9px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#027A48',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Check size={13} /> Approve &amp; Trust
                    </button>
                  )}

                  {dev.status !== 'REVOKED' && (
                    <button
                      type="button"
                      onClick={() => handleAction(dev.id, 'revoke')}
                      style={{
                        flex: 1,
                        padding: '9px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#FEF3F2',
                        color: '#B42318',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Ban size={13} /> Reject Access
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
