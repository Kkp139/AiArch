import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  Smartphone,
  Laptop,
  Tablet,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Key,
  X,
  Search,
  Filter,
} from 'lucide-react';
import './mobile.css';

export interface DeviceSession {
  id: string;
  deviceName: string;
  deviceType: 'MOBILE' | 'LAPTOP' | 'TABLET';
  os: string;
  userName: string;
  userRole: UserRole;
  ipAddress: string;
  location: string;
  requestedAt: string;
  lastActive: string;
  fingerprint: string;
  status: 'PENDING' | 'TRUSTED' | 'REVOKED';
}

export interface MobileDeviceApprovalsViewProps {
  userRole: UserRole;
  onBack: () => void;
}

export const MobileDeviceApprovalsView: React.FC<MobileDeviceApprovalsViewProps> = ({
  userRole,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'TRUSTED' | 'REVOKED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<DeviceSession | null>(null);

  const [devices, setDevices] = useState<DeviceSession[]>([
    {
      id: 'dev-1',
      deviceName: 'Apple iPhone 15 Pro',
      deviceType: 'MOBILE',
      os: 'iOS 18.1 • Mobile PWA',
      userName: 'Rajesh Patel',
      userRole: 'STAFF',
      ipAddress: '103.21.24.8',
      location: 'Ahmedabad, Gujarat',
      requestedAt: '10 minutes ago',
      lastActive: 'Just now',
      fingerprint: 'fp_a98210fca718b9',
      status: 'PENDING',
    },
    {
      id: 'dev-2',
      deviceName: 'Samsung Galaxy Tab S9 Ultra',
      deviceType: 'TABLET',
      os: 'Android 15 • Mobile PWA',
      userName: 'Dr. Sameer Mehta',
      userRole: 'CLIENT_LEADER',
      ipAddress: '14.139.122.4',
      location: 'Mumbai, Maharashtra',
      requestedAt: '35 minutes ago',
      lastActive: '5 mins ago',
      fingerprint: 'fp_b710492cca1102',
      status: 'PENDING',
    },
    {
      id: 'dev-3',
      deviceName: 'Apple MacBook Pro 16" (M3 Max)',
      deviceType: 'LAPTOP',
      os: 'macOS Sequoia 15.0',
      userName: 'Farhan Admani',
      userRole: 'ADMIN',
      ipAddress: '103.21.24.1',
      location: 'Ahmedabad Studio HQ',
      requestedAt: '24 Oct 2026',
      lastActive: 'Active Now',
      fingerprint: 'fp_master_studio_hq',
      status: 'TRUSTED',
    },
    {
      id: 'dev-4',
      deviceName: 'Apple iPhone 14',
      deviceType: 'MOBILE',
      os: 'iOS 17.6',
      userName: 'Sonu Sharma',
      userRole: 'STAFF',
      ipAddress: '103.21.24.12',
      location: 'Ahmedabad, Gujarat',
      requestedAt: '18 Oct 2026',
      lastActive: 'Today 09:30 AM',
      fingerprint: 'fp_staff_sonu_01',
      status: 'TRUSTED',
    },
    {
      id: 'dev-5',
      deviceName: 'Unknown Xiaomi Redmi Note',
      deviceType: 'MOBILE',
      os: 'Android 12',
      userName: 'Former Intern',
      userRole: 'STAFF',
      ipAddress: '49.36.12.90',
      location: 'Surat, Gujarat',
      requestedAt: '15 Sep 2026',
      lastActive: 'Terminated',
      fingerprint: 'fp_untrusted_old_session',
      status: 'REVOKED',
    },
  ]);

  const handleApprove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'TRUSTED' } : d))
    );
    setSelectedDevice(null);
    alert('Device approved and registered as Trusted. Drawing vault access granted.');
  };

  const handleRevoke = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'REVOKED' } : d))
    );
    setSelectedDevice(null);
    alert('Device access revoked immediately. Session terminated.');
  };

  const getDeviceIcon = (type: DeviceSession['deviceType']) => {
    switch (type) {
      case 'LAPTOP':
        return <Laptop size={20} color="#BF935A" />;
      case 'TABLET':
        return <Tablet size={20} color="#BF935A" />;
      default:
        return <Smartphone size={20} color="#BF935A" />;
    }
  };

  const filteredDevices = devices.filter((d) => {
    const matchTab = d.status === activeTab;
    const matchSearch =
      d.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  const pendingCount = devices.filter((d) => d.status === 'PENDING').length;
  const trustedCount = devices.filter((d) => d.status === 'TRUSTED').length;
  const revokedCount = devices.filter((d) => d.status === 'REVOKED').length;

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <div>
            <h2 className="figma-subpage-title">Device Approvals</h2>
            <span style={{ fontSize: '11px', color: '#686869' }}>
              Zero-Trust Hardware Binding Security
            </span>
          </div>
        </div>
      </div>

      <div className="figma-subpage-body">
        {/* Security Notice Banner */}
        <div className="figma-device-security-banner">
          <ShieldCheck size={20} color="#BF935A" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '12px', color: '#4A4A4C', lineHeight: 1.45 }}>
            To safeguard architectural blueprints & project financials, only approved hardware sessions are granted Vault access.
          </p>
        </div>

        {/* Tab Switcher: Pending, Trusted, Revoked */}
        <div className="figma-pill-tab-group" style={{ margin: '14px 0' }}>
          <button
            className={`figma-pill-tab ${activeTab === 'PENDING' ? 'active' : ''}`}
            onClick={() => setActiveTab('PENDING')}
          >
            <span>Pending ({pendingCount})</span>
          </button>
          <button
            className={`figma-pill-tab ${activeTab === 'TRUSTED' ? 'active' : ''}`}
            onClick={() => setActiveTab('TRUSTED')}
          >
            <span>Trusted ({trustedCount})</span>
          </button>
          <button
            className={`figma-pill-tab ${activeTab === 'REVOKED' ? 'active' : ''}`}
            onClick={() => setActiveTab('REVOKED')}
          >
            <span>Revoked ({revokedCount})</span>
          </button>
        </div>

        {/* Search */}
        <div className="figma-mobile-search-pill" style={{ marginBottom: '14px' }}>
          <Search size={18} color="#979798" />
          <input
            type="text"
            placeholder="Search device, user name, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="figma-search-input"
          />
        </div>

        {/* Device Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDevices.length === 0 ? (
            <div className="figma-empty-state-card">
              <ShieldCheck size={36} color="#979798" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#4A4A4C', margin: '0 0 4px 0' }}>
                No {activeTab.toLowerCase()} devices
              </p>
              <p style={{ fontSize: '12px', color: '#979798', margin: 0 }}>
                {activeTab === 'PENDING'
                  ? 'All requested mobile hardware sessions are verified.'
                  : 'No devices found matching your criteria.'}
              </p>
            </div>
          ) : (
            filteredDevices.map((dev) => (
              <div
                key={dev.id}
                className="figma-device-card"
                onClick={() => setSelectedDevice(dev)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="figma-device-icon-box">
                      {getDeviceIcon(dev.deviceType)}
                    </div>
                    <div>
                      <h4 className="figma-device-name">{dev.deviceName}</h4>
                      <span className="figma-device-user">
                        {dev.userName} • {dev.userRole.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`figma-status-badge ${
                      dev.status === 'TRUSTED' ? 'cleared' : dev.status === 'PENDING' ? 'pending' : 'revision'
                    }`}
                  >
                    {dev.status}
                  </span>
                </div>

                <div className="figma-device-meta-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={13} color="#979798" />
                    <span>{dev.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} color="#979798" />
                    <span>{dev.requestedAt}</span>
                  </div>
                </div>

                {/* Quick Action buttons for Admin */}
                {userRole === 'ADMIN' && dev.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid #F0F0F2', paddingTop: '10px' }}>
                    <button
                      className="figma-btn-sm figma-btn-danger"
                      style={{ flex: 1 }}
                      onClick={(e) => handleRevoke(dev.id, e)}
                    >
                      Reject Access
                    </button>
                    <button
                      className="figma-btn-sm figma-btn-gold"
                      style={{ flex: 1.5 }}
                      onClick={(e) => handleApprove(dev.id, e)}
                    >
                      Approve & Trust
                    </button>
                  </div>
                )}

                {userRole === 'ADMIN' && dev.status === 'TRUSTED' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px', borderTop: '1px solid #F0F0F2', paddingTop: '8px' }}>
                    <button
                      className="figma-btn-sm"
                      style={{ background: '#FEE4E2', color: '#D92D20' }}
                      onClick={(e) => handleRevoke(dev.id, e)}
                    >
                      Revoke Device Access
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Device Details Diagnostic Modal */}
      {selectedDevice && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedDevice(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="#BF935A" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
                  Hardware Security Profile
                </h3>
              </div>
              <button onClick={() => setSelectedDevice(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <div className="figma-receipt-card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#0C0C0D' }}>
                  {selectedDevice.deviceName}
                </span>
                <span
                  className={`figma-status-badge ${
                    selectedDevice.status === 'TRUSTED' ? 'cleared' : selectedDevice.status === 'PENDING' ? 'pending' : 'revision'
                  }`}
                >
                  {selectedDevice.status}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                {selectedDevice.os}
              </div>

              <div className="figma-receipt-divider" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#686869' }}>Registered User:</span>
                  <strong style={{ color: '#0C0C0D' }}>{selectedDevice.userName} ({selectedDevice.userRole})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#686869' }}>IP Address:</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0C0C0D' }}>
                    {selectedDevice.ipAddress}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#686869' }}>Geo-Location:</span>
                  <span style={{ color: '#0C0C0D' }}>{selectedDevice.location}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#686869' }}>Hardware Token:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#BF935A' }}>
                    {selectedDevice.fingerprint}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions in Modal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDevice.status === 'PENDING' && (
                <button
                  className="figma-btn-gold-full"
                  onClick={() => handleApprove(selectedDevice.id)}
                >
                  <CheckCircle2 size={18} />
                  <span>Approve & Authorize Device Session</span>
                </button>
              )}

              {selectedDevice.status !== 'REVOKED' && (
                <button
                  className="figma-btn-secondary-full"
                  onClick={() => handleRevoke(selectedDevice.id)}
                  style={{ color: '#D92D20', borderColor: '#FECDCA' }}
                >
                  <XCircle size={18} />
                  <span>Revoke Hardware Token</span>
                </button>
              )}

              <button className="figma-btn-secondary-full" onClick={() => setSelectedDevice(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

