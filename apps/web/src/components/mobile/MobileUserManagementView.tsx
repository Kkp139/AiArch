import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  UserPlus,
  Search,
  ShieldCheck,
  ShieldX,
  Mail,
  Send,
  X,
  Loader2,
  CheckCircle2,
  Ban,
  FolderKanban,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { ProjectSummary } from '../../App';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileUserDirectoryItem {
  id: string;
  username: string;
  fullName: string;
  email?: string | null;
  mobile?: string | null;
  role: UserRole;
  status: string;
  assignedProjectIds?: string[];
  projects?: Array<{ id: string; projectCode: string; name: string }>;
}

export interface MobileUserManagementViewProps {
  userRole?: UserRole;
  projects?: ProjectSummary[];
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onAddUserClick?: () => void;
  onBack: () => void;
}

export const MobileUserManagementView: React.FC<MobileUserManagementViewProps> = ({
  userRole = 'ADMIN',
  projects = [],
  authHeaders,
  getAuthHeaders,
  onAddUserClick,
  onBack,
}) => {
  const [users, setUsers] = useState<MobileUserDirectoryItem[]>([]);
  const [projectList, setProjectList] = useState<ProjectSummary[]>(projects);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [role, setRole] = useState<UserRole>('CLIENT_LEADER');
  const [selectedProjIds, setSelectedProjIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Manage User Modal
  const [selectedUser, setSelectedUser] = useState<MobileUserDirectoryItem | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('STAFF');
  const [editProjectIds, setEditProjectIds] = useState<string[]>([]);

  useEffect(() => {
    if (projects.length > 0) setProjectList(projects);
  }, [projects]);

  const fetchUsersAndProjects = useCallback(async () => {
    if (userRole !== 'ADMIN') return;
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      let res = await fetch('/api/admin/users', { headers });
      if (!res.ok) {
        res = await fetch('/api/auth/users', { headers });
      }
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.users || [];
        setUsers(rows);
      }
      if (projects.length === 0) {
        const pRes = await fetch('/api/projects', { headers });
        if (pRes.ok) {
          const pData = await pRes.json();
          setProjectList(Array.isArray(pData) ? pData : pData.projects || []);
        }
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error fetching directory.' });
    } finally {
      setLoading(false);
    }
  }, [userRole, authHeaders, getAuthHeaders, projects.length]);

  useEffect(() => {
    fetchUsersAndProjects();
  }, [fetchUsersAndProjects]);

  if (userRole !== 'ADMIN') {
    return (
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>User Directory</h2>
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <ShieldX size={48} color="#D92D20" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Admin Access Only</h3>
          <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
            User provisioning and RBAC assignments are strictly restricted to Studio Admins.
          </p>
        </div>
      </div>
    );
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || mobile.trim().length < 10) {
      setBanner({ type: 'error', message: 'Full Name and valid Mobile Number (min 10 digits) are required.' });
      return;
    }
    setSubmitting(true);
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: fullName.trim(),
          mobile: mobile.trim(),
          username: username.trim() ? username.trim().toLowerCase() : undefined,
          email: email.trim() || undefined,
          role,
          assignedProjectIds: selectedProjIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowCreateModal(false);
        setFullName('');
        setUsername('');
        setEmail('');
        setMobile('');
        setSelectedProjIds([]);
        setBanner({ type: 'success', message: `User "${data.user?.fullName || fullName}" provisioned.` });
        await fetchUsersAndProjects();
      } else {
        setBanner({ type: 'error', message: data.error || 'Could not create user.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error provisioning user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openManageModal = (u: MobileUserDirectoryItem) => {
    setSelectedUser(u);
    setEditRole(u.role);
    const ids =
      u.assignedProjectIds ||
      (Array.isArray(u.projects) ? u.projects.map((p) => p.id) : []);
    setEditProjectIds(ids);
  };

  const handleSaveUserEdits = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      let res = await fetch(`/api/admin/users/${encodeURIComponent(selectedUser.id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          role: editRole,
          assignedProjectIds: editProjectIds,
        }),
      });
      if (res.status === 404) {
        res = await fetch(`/api/auth/users/${encodeURIComponent(selectedUser.id)}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            role: editRole,
            assignedProjectIds: editProjectIds,
          }),
        });
      }
      if (res.ok) {
        setSelectedUser(null);
        setBanner({ type: 'success', message: 'User role and project assignments updated.' });
        await fetchUsersAndProjects();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Update not supported on server.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error updating user.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserStatusAction = async (
    userId: string,
    action: 'toggle-status' | 'approve' | 'resend-invite',
    nextStatus?: string
  ) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const endpoint =
        action === 'approve'
          ? `/api/admin/users/${encodeURIComponent(userId)}/approve`
          : action === 'resend-invite'
          ? `/api/admin/users/${encodeURIComponent(userId)}/resend-invite`
          : `/api/admin/users/${encodeURIComponent(userId)}/status`;
      const res = await fetch(endpoint, {
        method: action === 'toggle-status' ? 'PATCH' : 'POST',
        headers,
        body: JSON.stringify(nextStatus ? { status: nextStatus } : {}),
      });
      if (res.ok) {
        setSelectedUser(null);
        setBanner({
          type: 'success',
          message:
            action === 'approve'
              ? 'Pending user access approved.'
              : action === 'resend-invite'
              ? 'Setup invitation dispatched.'
              : `User status updated to ${nextStatus}.`,
        });
        await fetchUsersAndProjects();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Operation failed.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error processing user action.' });
    }
  };

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            More
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Users</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
                User Directory
              </h2>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                {filtered.length} account{filtered.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onAddUserClick) {
                onAddUserClick();
              } else {
                setShowCreateModal(true);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#352618',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <UserPlus size={14} /> Add User
          </button>
        </div>

        <div className="figma-search-input-wrap">
          <Search size={18} />
          <input
            type="text"
            className="figma-search-input"
            placeholder="Search name, username or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
        {loading && users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <Loader2 size={26} color="#352618" className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Loading studio directory...</div>
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
            <ShieldCheck size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>No users found</h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
              Provision Staff or Client accounts using &quot;Add User&quot;.
            </p>
          </div>
        ) : (
          filtered.map((u) => {
            const isActive = u.status === 'ACTIVE';
            const isPending = u.status === 'PENDING' || u.status === 'INVITED';

            return (
              <div
                key={u.id}
                onClick={() => openManageModal(u)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  border: '1px solid rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
                      {u.fullName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#686869' }}>
                      @{u.username} • {u.role.replace('_', ' ')}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isActive ? '#ECFDF3' : isPending ? '#FFFAEB' : '#FEF3F2',
                      color: isActive ? '#027A48' : isPending ? '#B54708' : '#B42318',
                    }}
                  >
                    {u.status}
                  </span>
                </div>

                {u.email && (
                  <div style={{ fontSize: '11px', color: '#686869', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <Mail size={11} /> {u.email}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4500,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <form
            onSubmit={handleCreateUser}
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '88vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '22px 20px 30px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Provision New User</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: '#F5F5F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <input
              type="text"
              required
              placeholder="Full Name *"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <input
              type="tel"
              required
              placeholder="Mobile Number (+91...) *"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', boxSizing: 'border-box' }}
            />

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px', background: '#FFFFFF', boxSizing: 'border-box' }}
              >
                <option value="ADMIN">Admin</option>
                <option value="STAFF">Staff Architect</option>
                <option value="CLIENT_LEADER">Client Leader</option>
                <option value="CLIENT_VIEWER">Client Viewer</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '6px' }}>
                Assign Projects
              </label>
              {projectList.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#686869', padding: '4px 0' }}>
                  No projects created yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {projectList.map((p) => {
                    const picked = selectedProjIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setSelectedProjIds((prev) =>
                            prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          )
                        }
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: picked ? 'none' : '1px solid #E5E7EB',
                          background: picked ? '#352618' : '#F9F9FB',
                          color: picked ? '#FFFFFF' : '#0C0C0D',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {p.projectCode}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Username (Optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', boxSizing: 'border-box' }}
            />
            <input
              type="email"
              placeholder="Email Address (Optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '14px', boxSizing: 'border-box' }}
            />

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Creating User...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {/* Manage User Modal */}
      {selectedUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4500,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '88vh',
              overflowY: 'auto',
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '22px 20px 30px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                  {selectedUser.fullName}
                </h3>
                <div style={{ fontSize: '12px', color: '#686869' }}>
                  @{selectedUser.username} • {selectedUser.status}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{ background: '#F5F5F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Role Assignment
              </label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: '13px', background: '#FFFFFF' }}
              >
                <option value="ADMIN">Admin</option>
                <option value="STAFF">Staff Architect</option>
                <option value="CLIENT_LEADER">Client Leader</option>
                <option value="CLIENT_VIEWER">Client Viewer</option>
              </select>
            </div>

            {projectList.length > 0 && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <FolderKanban size={13} /> Project Access
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {projectList.map((p) => {
                    const picked = editProjectIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setEditProjectIds((prev) =>
                            prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          )
                        }
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: picked ? 'none' : '1px solid #E5E7EB',
                          background: picked ? '#352618' : '#F9F9FB',
                          color: picked ? '#FFFFFF' : '#0C0C0D',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {p.projectCode}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={submitting}
              onClick={handleSaveUserEdits}
              style={{
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Save Role &amp; Projects
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid #F0F0F2' }}>
              {selectedUser.status !== 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => handleUserStatusAction(selectedUser.id, 'approve')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ECFDF3',
                    color: '#027A48',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCircle2 size={13} /> Approve Access
                </button>
              )}

              <button
                type="button"
                onClick={() => handleUserStatusAction(selectedUser.id, 'resend-invite')}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  background: '#F9F9FB',
                  color: '#352618',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Send size={13} /> Resend Invite
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUserStatusAction(
                    selectedUser.id,
                    'toggle-status',
                    selectedUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                  )
                }
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: selectedUser.status === 'ACTIVE' ? '#FEF3F2' : '#ECFDF3',
                  color: selectedUser.status === 'ACTIVE' ? '#B42318' : '#027A48',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <Ban size={13} /> {selectedUser.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
