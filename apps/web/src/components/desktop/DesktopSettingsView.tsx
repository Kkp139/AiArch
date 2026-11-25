import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Sliders,
  Activity,
  Laptop,
  UserPlus,
  Search,
  Copy,
  CheckCircle2,
  ShieldAlert,
  Lock,
  RefreshCw,
  Edit3,
  Power,
  X,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';

export type GovernanceTab = 'users' | 'studio' | 'audit' | 'devices';

export interface DesktopSettingsViewProps {
  userRole: UserRole;
  projects?: ProjectSummary[];
  initialTab?: GovernanceTab;
  getAuthHeaders?: () => Record<string, string>;
  onProjectsRefresh?: () => Promise<void> | void;
}

interface ManagedUserItem {
  id: string;
  fullName: string;
  username?: string;
  mobile: string;
  email?: string;
  role: UserRole;
  status: 'ACTIVE' | 'DEACTIVATED' | 'PENDING_APPROVAL';
  approvalPending?: boolean;
  assignedProjectIds: string[];
  createdAt?: string;
}

interface StudioSettingsState {
  studioName: string;
  requireDrawingVerification: boolean;
  allowClientWatermarkDownload: boolean;
  dailyUpdateTriggerMode: 'FIXED_SLOTS' | 'END_OF_SHIFT';
  maxUploadSizeMb: number;
  allowedFileExtensions: string;
}

interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary: string;
  createdAt: string;
}

interface DeviceSessionItem {
  id: string;
  userId?: string;
  userName: string;
  userRole?: string;
  deviceLabel: string;
  ipAddress?: string;
  status: 'PENDING' | 'APPROVED' | 'REVOKED';
  lastSeenAt?: string;
  createdAt?: string;
}

export const DesktopSettingsView: React.FC<DesktopSettingsViewProps> = ({
  userRole,
  projects = [],
  initialTab = 'users',
  getAuthHeaders,
  onProjectsRefresh,
}) => {
  const isAdmin = userRole === 'ADMIN';

  const [activeTab, setActiveTab] = useState<GovernanceTab>(initialTab);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  // Tab 1: Users
  const [users, setUsers] = useState<ManagedUserItem[]>([]);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'PENDING' | 'DEACTIVATED'
  >('ALL');
  const [showInviteModal, setShowInviteModal] = useState<boolean>(false);
  const [inviteFullName, setInviteFullName] = useState<string>('');
  const [inviteUsername, setInviteUsername] = useState<string>('');
  const [inviteMobile, setInviteMobile] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<UserRole>('STAFF');
  const [inviteProjects, setInviteProjects] = useState<string[]>([]);
  const [generatedInvite, setGeneratedInvite] = useState<{
    setupLink: string;
    invitationTemplate?: string;
    emailSent?: boolean;
  } | null>(null);

  // Edit User Modal (role + assigned projects)
  const [editUserTarget, setEditUserTarget] = useState<ManagedUserItem | null>(null);
  const [editUserRole, setEditUserRole] = useState<UserRole>('STAFF');
  const [editUserProjectIds, setEditUserProjectIds] = useState<string[]>([]);

  // Tab 2: Studio Configuration
  const [studioSettings, setStudioSettings] = useState<StudioSettingsState>({
    studioName: 'A&F Design',
    requireDrawingVerification: true,
    allowClientWatermarkDownload: true,
    dailyUpdateTriggerMode: 'FIXED_SLOTS',
    maxUploadSizeMb: 50,
    allowedFileExtensions: '.pdf,.dwg,.dxf,.jpg,.jpeg,.png,.rvt',
  });

  // Tab 3: Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditEntityFilter, setAuditEntityFilter] = useState<string>('ALL');

  // Tab 4: Devices
  const [devices, setDevices] = useState<DeviceSessionItem[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const authHeaders = useCallback(
    () => (getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
    [getAuthHeaders],
  );

  const loadTabData = useCallback(
    async (tab: GovernanceTab) => {
      if (!isAdmin) return;
      setLoading(true);
      try {
        if (tab === 'users') {
          const res = await fetch('/api/auth/users', { headers: authHeaders() });
          if (!res.ok) throw new Error('Failed to load users directory');
          const data = await res.json();
          const list: any[] = Array.isArray(data) ? data : data.users || [];
          setUsers(
            list.map((u) => ({
              id: String(u.id),
              fullName: u.fullName || u.username || 'Studio User',
              username: u.username,
              mobile: u.mobile || '',
              email: u.email || '',
              role: (u.role || 'STAFF') as UserRole,
              status: u.approvalPending
                ? 'PENDING_APPROVAL'
                : (u.status || 'ACTIVE') as ManagedUserItem['status'],
              approvalPending: Boolean(u.approvalPending || u.status === 'PENDING_APPROVAL'),
              assignedProjectIds: Array.isArray(u.assignedProjectIds)
                ? u.assignedProjectIds.map(String)
                : Array.isArray(u.projects)
                  ? u.projects.map((p: any) => String(p.projectId || p.id))
                  : [],
              createdAt: u.createdAt,
            })),
          );
        } else if (tab === 'studio') {
          const res = await fetch('/api/settings', { headers: authHeaders() });
          if (res.ok) {
            const s = await res.json();
            const cfg = s.settings || s;
            setStudioSettings((prev) => ({
              studioName: cfg.studioName || prev.studioName,
              requireDrawingVerification:
                cfg.requireDrawingVerification ?? prev.requireDrawingVerification,
              allowClientWatermarkDownload:
                cfg.allowClientWatermarkDownload ?? prev.allowClientWatermarkDownload,
              dailyUpdateTriggerMode:
                cfg.dailyUpdateTriggerMode || prev.dailyUpdateTriggerMode,
              maxUploadSizeMb: Number(cfg.maxUploadSizeMb) || prev.maxUploadSizeMb,
              allowedFileExtensions:
                cfg.allowedFileExtensions || prev.allowedFileExtensions,
            }));
          }
        } else if (tab === 'audit') {
          const res = await fetch('/api/audit-logs', { headers: authHeaders() });
          if (!res.ok) throw new Error('Failed to load activity audit log');
          const data = await res.json();
          const rows: any[] = Array.isArray(data) ? data : data.logs || data.items || [];
          setAuditLogs(
            rows.map((l) => ({
              id: String(l.id),
              actorName: l.actorName || l.actor?.fullName || l.userName || 'System',
              actorRole: l.actorRole || l.actor?.role || 'SYSTEM',
              action: l.action || 'UPDATED',
              entityType: l.entityType || l.resource || 'SYSTEM',
              entityId: l.entityId,
              summary: l.summary || l.details || `${l.action || 'Action'} on ${l.entityType || 'item'}`,
              createdAt: l.createdAt || new Date().toISOString(),
            })),
          );
        } else if (tab === 'devices') {
          const res = await fetch('/api/auth/devices', { headers: authHeaders() });
          if (!res.ok) throw new Error('Failed to load active devices');
          const data = await res.json();
          const rows: any[] = Array.isArray(data) ? data : data.devices || data.sessions || [];
          setDevices(
            rows.map((d) => ({
              id: String(d.id),
              userId: d.userId,
              userName: d.userName || d.user?.fullName || 'Studio Account',
              userRole: d.userRole || d.user?.role,
              deviceLabel: d.deviceLabel || d.userAgent || d.deviceName || 'Registered Browser',
              ipAddress: d.ipAddress || d.lastIp,
              status: (d.status || (d.isApproved === false ? 'PENDING' : 'APPROVED')) as DeviceSessionItem['status'],
              lastSeenAt: d.lastSeenAt || d.updatedAt,
              createdAt: d.createdAt,
            })),
          );
        }
      } catch (err: any) {
        setBanner({ type: 'error', text: err?.message || 'Unable to load governance data.' });
      } finally {
        setLoading(false);
      }
    },
    [isAdmin, authHeaders],
  );

  useEffect(() => {
    void loadTabData(activeTab);
  }, [activeTab, loadTabData]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userStatusFilter === 'PENDING' && !u.approvalPending) return false;
      if (userStatusFilter === 'ACTIVE' && (u.status !== 'ACTIVE' || u.approvalPending)) {
        return false;
      }
      if (userStatusFilter === 'DEACTIVATED' && u.status !== 'DEACTIVATED') return false;
      if (q) {
        const hay = [u.fullName, u.username || '', u.mobile, u.email || '', u.role]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [users, userSearch, userStatusFilter]);

  const filteredLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    return auditLogs.filter((l) => {
      if (auditEntityFilter !== 'ALL' && l.entityType !== auditEntityFilter) return false;
      if (q) {
        const hay = [l.actorName, l.action, l.entityType, l.summary].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [auditLogs, auditSearch, auditEntityFilter]);

  if (!isAdmin) {
    return (
      <div className="desk-restricted-card">
        <div className="desk-restricted-icon-box">
          <Lock size={28} />
        </div>
        <h2 className="desk-restricted-title">Admin Governance Restricted</h2>
        <p className="desk-restricted-desc">
          Studio governance, user provisioning, device security, and audit logs are reserved for
          Studio Admin accounts.
        </p>
      </div>
    );
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFullName.trim() || !inviteMobile.trim()) {
      setBanner({ type: 'error', text: 'Full Name and Mobile Number are required.' });
      return;
    }
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          fullName: inviteFullName.trim(),
          username: inviteUsername.trim() || undefined,
          mobile: inviteMobile.trim(),
          email: inviteEmail.trim() || undefined,
          role: inviteRole,
          assignedProjectIds: inviteProjects,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }
      setGeneratedInvite({
        setupLink: data.setupLink || '',
        invitationTemplate: data.invitationTemplate,
        emailSent: data.emailSent,
      });
      setInviteFullName('');
      setInviteUsername('');
      setInviteMobile('');
      setInviteEmail('');
      setInviteProjects([]);
      setBanner({
        type: 'success',
        text: 'User account provisioned with single-use invitation link.',
      });
      await loadTabData('users');
      await onProjectsRefresh?.();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to provision user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setBanner({ type: 'success', text: 'Copied invitation link to clipboard.' });
    } catch {
      setBanner({ type: 'info', text: 'Copy manually from the invitation box.' });
    }
  };

  const handleApproveUser = async (user: ManagedUserItem) => {
    setSubmitting(true);
    setBanner(null);
    try {
      let res = await fetch(`/api/auth/users/${user.id}/approve`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (res.status === 404) {
        res = await fetch(`/api/auth/users/${user.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ approvalPending: false, status: 'ACTIVE' }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to approve user');
      }
      setBanner({ type: 'success', text: `Approved access for ${user.fullName}.` });
      await loadTabData('users');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Approval failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: ManagedUserItem) => {
    const nextStatus = user.status === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';
    setSubmitting(true);
    setBanner(null);
    try {
      let res = await fetch(`/api/auth/users/${user.id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.status === 404) {
        res = await fetch(`/api/auth/users/${user.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: nextStatus }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update status');
      }
      setBanner({
        type: 'info',
        text: `${user.fullName} marked as ${nextStatus.toLowerCase()}.`,
      });
      await loadTabData('users');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Status toggle failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserTarget) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const roleRes = await fetch(`/api/auth/users/${editUserTarget.id}/role`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ role: editUserRole }),
      });
      if (!roleRes.ok && roleRes.status !== 404) {
        const err = await roleRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update role');
      }
      const projRes = await fetch(`/api/auth/users/${editUserTarget.id}/projects`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ assignedProjectIds: editUserProjectIds }),
      });
      if (!projRes.ok && projRes.status !== 404) {
        const err = await projRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update assigned projects');
      }
      setEditUserTarget(null);
      setBanner({ type: 'success', text: `Updated permissions for ${editUserTarget.fullName}.` });
      await loadTabData('users');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to update user assignments.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStudioSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(studioSettings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save studio settings');
      }
      setBanner({ type: 'success', text: 'Studio configuration updated.' });
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to save studio settings.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeviceAction = async (device: DeviceSessionItem, action: 'approve' | 'revoke') => {
    setSubmitting(true);
    setBanner(null);
    try {
      let res = await fetch(`/api/auth/devices/${device.id}/${action}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (res.status === 404 || res.status === 405) {
        res = await fetch(`/api/auth/devices/${device.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ status: action === 'approve' ? 'APPROVED' : 'REVOKED' }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to ${action} device`);
      }
      setBanner({
        type: action === 'approve' ? 'success' : 'info',
        text: `Device ${action === 'approve' ? 'approved' : 'revoked'} for ${device.userName}.`,
      });
      await loadTabData('devices');
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Device update failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">Settings &amp; Studio Governance</h1>
          <p className="desk-page-subtitle">
            Manage team &amp; client access invitations, studio QA rules, audit trail, and registered devices.
          </p>
        </div>
        <div className="desk-header-actions">
          <button
            type="button"
            className="desk-btn desk-btn-secondary"
            onClick={() => void loadTabData(activeTab)}
            disabled={loading}
          >
            <RefreshCw size={15} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {activeTab === 'users' && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={() => {
                setGeneratedInvite(null);
                setShowInviteModal(true);
              }}
            >
              <UserPlus size={16} />
              <span>Provision User</span>
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div className={`desk-banner ${banner.type}`}>
          <span>{banner.text}</span>
          <button type="button" className="desk-btn-close" onClick={() => setBanner(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Governance Sub-Tabs */}
      <div className="desk-tabs-bar">
        <div className="desk-tabs-group">
          <button
            type="button"
            className={`desk-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            User Directory ({users.length})
          </button>
          <button
            type="button"
            className={`desk-tab-btn ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={() => setActiveTab('studio')}
          >
            <Sliders size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Studio Configuration
          </button>
          <button
            type="button"
            className={`desk-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Activity size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Activity Audit Log
          </button>
          <button
            type="button"
            className={`desk-tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveTab('devices')}
          >
            <Laptop size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Device Approvals
          </button>
        </div>
      </div>

      {/* TAB 1: User Directory */}
      {activeTab === 'users' && (
        <div>
          <div className="desk-tabs-bar" style={{ marginBottom: 14 }}>
            <div className="desk-pill-tabs">
              {(
                [
                  { id: 'ALL', label: 'All Accounts' },
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'PENDING', label: 'Pending Approval' },
                  { id: 'DEACTIVATED', label: 'Deactivated' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`desk-pill-tab ${userStatusFilter === f.id ? 'active' : ''}`}
                  onClick={() => setUserStatusFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="desk-inline-search"
                style={{ paddingLeft: 32 }}
                placeholder="Search name, mobile, role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
          </div>

          {loading && filteredUsers.length === 0 ? (
            <div className="desk-empty-card">Loading studio users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="desk-empty-card">No users match the selected filter.</div>
          ) : (
            <div className="desk-table-card">
              <div className="desk-table-scroll">
                <table className="desk-data-table">
                  <thead>
                    <tr>
                      <th>Full Name</th>
                      <th>Role</th>
                      <th>Contact</th>
                      <th>Assigned Projects</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{u.fullName}</div>
                          {u.username && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              @{u.username}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="desk-pill gold">{u.role.replace('_', ' ')}</span>
                        </td>
                        <td>
                          <div>{u.mobile}</div>
                          {u.email && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                          )}
                        </td>
                        <td>{u.assignedProjectIds.length} projects</td>
                        <td>
                          <span
                            className={`desk-pill ${
                              u.approvalPending
                                ? 'amber'
                                : u.status === 'DEACTIVATED'
                                  ? 'red'
                                  : 'green'
                            }`}
                          >
                            {u.approvalPending ? 'PENDING APPROVAL' : u.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                            {u.approvalPending && (
                              <button
                                type="button"
                                className="desk-btn desk-btn-sm desk-btn-primary"
                                disabled={submitting}
                                onClick={() => void handleApproveUser(u)}
                              >
                                <CheckCircle2 size={13} />
                                <span>Approve</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="desk-btn desk-btn-sm desk-btn-secondary"
                              onClick={() => {
                                setEditUserTarget(u);
                                setEditUserRole(u.role);
                                setEditUserProjectIds(u.assignedProjectIds);
                              }}
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className={`desk-btn desk-btn-sm ${
                                u.status === 'DEACTIVATED'
                                  ? 'desk-btn-soft-gold'
                                  : 'desk-btn-danger-outline'
                              }`}
                              disabled={submitting}
                              onClick={() => void handleToggleUserStatus(u)}
                            >
                              <Power size={13} />
                              <span>{u.status === 'DEACTIVATED' ? 'Activate' : 'Disable'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Studio Configuration */}
      {activeTab === 'studio' && (
        <div className="desk-card" style={{ maxWidth: 720 }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>
            Studio Operational Policies
          </h3>
          <form onSubmit={handleSaveStudioSettings}>
            <div className="desk-form-group">
              <label>Studio Brand Title</label>
              <input
                type="text"
                className="desk-form-input"
                value={studioSettings.studioName}
                onChange={(e) =>
                  setStudioSettings((prev) => ({ ...prev, studioName: e.target.value }))
                }
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="desk-form-group">
                <label>Daily Work Update Trigger</label>
                <select
                  className="desk-form-select"
                  value={studioSettings.dailyUpdateTriggerMode}
                  onChange={(e) =>
                    setStudioSettings((prev) => ({
                      ...prev,
                      dailyUpdateTriggerMode:
                        e.target.value === 'END_OF_SHIFT' ? 'END_OF_SHIFT' : 'FIXED_SLOTS',
                    }))
                  }
                >
                  <option value="FIXED_SLOTS">Fixed Slots (12:30, 4:30, 7:30)</option>
                  <option value="END_OF_SHIFT">End of Shift Summary</option>
                </select>
              </div>
              <div className="desk-form-group">
                <label>Max Vault Upload Size (MB)</label>
                <input
                  type="number"
                  min={5}
                  max={500}
                  className="desk-form-input"
                  value={studioSettings.maxUploadSizeMb}
                  onChange={(e) =>
                    setStudioSettings((prev) => ({
                      ...prev,
                      maxUploadSizeMb: Number(e.target.value) || 50,
                    }))
                  }
                />
              </div>
            </div>

            <div className="desk-form-group">
              <label>Allowed CAD / Document Extensions</label>
              <input
                type="text"
                className="desk-form-input"
                value={studioSettings.allowedFileExtensions}
                onChange={(e) =>
                  setStudioSettings((prev) => ({ ...prev, allowedFileExtensions: e.target.value }))
                }
              />
            </div>

            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={studioSettings.requireDrawingVerification}
                  onChange={(e) =>
                    setStudioSettings((prev) => ({
                      ...prev,
                      requireDrawingVerification: e.target.checked,
                    }))
                  }
                />
                <span>Require Admin Design Verification before drawings go live to clients</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={studioSettings.allowClientWatermarkDownload}
                  onChange={(e) =>
                    setStudioSettings((prev) => ({
                      ...prev,
                      allowClientWatermarkDownload: e.target.checked,
                    }))
                  }
                />
                <span>Permit Client Leaders to download approved sheets (Viewers stay view-only)</span>
              </label>
            </div>

            <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Studio Settings'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: Activity Audit Log */}
      {activeTab === 'audit' && (
        <div>
          <div className="desk-tabs-bar" style={{ marginBottom: 14 }}>
            <div className="desk-header-actions">
              <select
                className="desk-form-select"
                style={{ width: 200 }}
                value={auditEntityFilter}
                onChange={(e) => setAuditEntityFilter(e.target.value)}
              >
                <option value="ALL">All Entities</option>
                <option value="PROJECT">Projects</option>
                <option value="DOCUMENT">Documents</option>
                <option value="PAYMENT">Payments</option>
                <option value="MEETING">Meetings</option>
                <option value="USER">Users</option>
              </select>
            </div>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="desk-inline-search"
                style={{ paddingLeft: 32 }}
                placeholder="Search actor, action, details..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>
          </div>

          {loading && filteredLogs.length === 0 ? (
            <div className="desk-empty-card">Loading activity audit logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="desk-empty-card">No audit trail entries recorded yet.</div>
          ) : (
            <div className="desk-table-card">
              <div className="desk-table-scroll">
                <table className="desk-data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Entity</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{log.actorName}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {log.actorRole}
                          </div>
                        </td>
                        <td>
                          <span className="desk-pill gold">{log.action}</span>
                        </td>
                        <td>{log.entityType}</td>
                        <td style={{ fontSize: 13 }}>{log.summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Device Approvals */}
      {activeTab === 'devices' && (
        <div>
          {loading && devices.length === 0 ? (
            <div className="desk-empty-card">Loading registered devices...</div>
          ) : devices.length === 0 ? (
            <div className="desk-empty-card">
              <Laptop size={26} style={{ color: 'var(--brand-gold)', marginBottom: 8 }} />
              <div style={{ fontWeight: 700, marginBottom: 4 }}>No pending device approvals</div>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Device fingerprinting requests from new staff or client browsers will appear here.
              </p>
            </div>
          ) : (
            <div className="desk-list-stack">
              {devices.map((d) => (
                <div key={d.id} className="desk-list-row-card">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        className={`desk-pill ${
                          d.status === 'APPROVED'
                            ? 'green'
                            : d.status === 'REVOKED'
                              ? 'red'
                              : 'amber'
                        }`}
                      >
                        {d.status}
                      </span>
                      {d.userRole && <span className="desk-pill gold">{d.userRole}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{d.userName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      {d.deviceLabel} {d.ipAddress ? `· IP ${d.ipAddress}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {d.status !== 'APPROVED' && (
                      <button
                        type="button"
                        className="desk-btn desk-btn-sm desk-btn-primary"
                        disabled={submitting}
                        onClick={() => void handleDeviceAction(d, 'approve')}
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve Device</span>
                      </button>
                    )}
                    {d.status !== 'REVOKED' && (
                      <button
                        type="button"
                        className="desk-btn desk-btn-sm desk-btn-danger-outline"
                        disabled={submitting}
                        onClick={() => void handleDeviceAction(d, 'revoke')}
                      >
                        <ShieldAlert size={14} />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Provision User Modal */}
      {showInviteModal && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 540 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Provision User &amp; Single-Use Invite</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setShowInviteModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleInviteSubmit}>
              <div className="desk-modal-body">
                {generatedInvite ? (
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--brand-gold)',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>
                      Single-Use Invitation Ready
                    </div>
                    <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      Share this private onboarding link with the user so they can set their
                      password:
                    </p>
                    <div
                      style={{
                        padding: 10,
                        background: 'var(--bg-surface)',
                        borderRadius: 8,
                        fontSize: 12,
                        wordBreak: 'break-all',
                        marginBottom: 10,
                      }}
                    >
                      {generatedInvite.setupLink || generatedInvite.invitationTemplate}
                    </div>
                    <button
                      type="button"
                      className="desk-btn desk-btn-sm desk-btn-primary"
                      onClick={() =>
                        void handleCopyText(
                          generatedInvite.invitationTemplate || generatedInvite.setupLink,
                        )
                      }
                    >
                      <Copy size={13} />
                      <span>Copy Invitation Details</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="desk-form-group">
                        <label>Full Name</label>
                        <input
                          type="text"
                          className="desk-form-input"
                          placeholder="Full Name"
                          value={inviteFullName}
                          onChange={(e) => setInviteFullName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="desk-form-group">
                        <label>Username (Optional)</label>
                        <input
                          type="text"
                          className="desk-form-input"
                          placeholder="e.g. a.sharma"
                          value={inviteUsername}
                          onChange={(e) => setInviteUsername(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="desk-form-group">
                        <label>Mobile Number</label>
                        <input
                          type="text"
                          className="desk-form-input"
                          placeholder="+91 98XXXXXXXX"
                          value={inviteMobile}
                          onChange={(e) => setInviteMobile(e.target.value)}
                          required
                        />
                      </div>
                      <div className="desk-form-group">
                        <label>Email (Optional)</label>
                        <input
                          type="email"
                          className="desk-form-input"
                          placeholder="name@domain.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="desk-form-group">
                      <label>Role</label>
                      <select
                        className="desk-form-select"
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as UserRole)}
                      >
                        <option value="STAFF">Studio Staff</option>
                        <option value="CLIENT_LEADER">Client Leader</option>
                        <option value="CLIENT_VIEWER">Client Viewer</option>
                        <option value="ADMIN">Studio Admin</option>
                      </select>
                    </div>
                    <div className="desk-form-group">
                      <label>Assign Projects</label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {projects.map((p) => {
                          const picked = inviteProjects.includes(p.id);
                          return (
                            <button
                              key={p.id}
                              type="button"
                              className={`desk-btn desk-btn-sm ${
                                picked ? 'desk-btn-primary' : 'desk-btn-secondary'
                              }`}
                              onClick={() =>
                                setInviteProjects((prev) =>
                                  prev.includes(p.id)
                                    ? prev.filter((id) => id !== p.id)
                                    : [...prev, p.id],
                                )
                              }
                            >
                              {p.projectCode}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setShowInviteModal(false)}
                >
                  Close
                </button>
                {!generatedInvite && (
                  <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                    {submitting ? 'Provisioning...' : 'Create & Generate Invite'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUserTarget && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 500 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Edit Access · {editUserTarget.fullName}</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setEditUserTarget(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveUserEdit}>
              <div className="desk-modal-body">
                <div className="desk-form-group">
                  <label>Role</label>
                  <select
                    className="desk-form-select"
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                  >
                    <option value="ADMIN">Studio Admin</option>
                    <option value="STAFF">Studio Staff</option>
                    <option value="CLIENT_LEADER">Client Leader</option>
                    <option value="CLIENT_VIEWER">Client Viewer</option>
                  </select>
                </div>
                <div className="desk-form-group">
                  <label>Assigned Projects</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {projects.map((p) => {
                      const picked = editUserProjectIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`desk-btn desk-btn-sm ${
                            picked ? 'desk-btn-primary' : 'desk-btn-secondary'
                          }`}
                          onClick={() =>
                            setEditUserProjectIds((prev) =>
                              prev.includes(p.id)
                                ? prev.filter((id) => id !== p.id)
                                : [...prev, p.id],
                            )
                          }
                        >
                          {p.projectCode} · {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setEditUserTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
