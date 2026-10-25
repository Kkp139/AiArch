import React, { useState, useEffect } from 'react';
import { UserPlus, X, CheckCircle2, AlertCircle, Shield, Users, Copy, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserRecord {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';
  mobile: string;
  email?: string;
  status: string;
  setupToken?: string;
  assignedProjects?: { id: string; projectCode: string; name: string }[];
}

interface ProjectOption {
  id: string;
  projectCode: string;
  name: string;
}

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [inviteResult, setInviteResult] = useState<{ setupLink: string; template: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state (NO PERMANENT PASSWORD!)
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER'>('STAFF');
  const [mobile, setMobile] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch user list', e);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      fetchProjects();
      setFeedback(null);
      setInviteResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobile.trim()) {
      setFeedback({ type: 'error', message: 'Full Name and WhatsApp Mobile number are required.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    setInviteResult(null);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.trim() || undefined,
          fullName: fullName.trim(),
          role,
          mobile: mobile.trim(),
          email: email.trim() || undefined,
          assignedProjectIds: selectedProjects,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to onboard user.' });
        return;
      }

      setFeedback({
        type: 'success',
        message: `User '${data.user.fullName}' (${data.user.role}) created successfully! A single-use setup link has been generated.`,
      });

      setInviteResult({
        setupLink: data.user.setupLink,
        template: data.user.invitationTemplate,
      });

      // Reset form
      setFullName('');
      setUsername('');
      setMobile('+91 ');
      setEmail('');
      setSelectedProjects([]);
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error communicating with studio API.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (inviteResult) {
      navigator.clipboard.writeText(inviteResult.template);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="var(--accent-gold)" />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Studio User Onboarding & Multi-Project Assignment
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {feedback && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                color: feedback.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                fontSize: '13px',
              }}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Invitation Link Box */}
          {inviteResult && (
            <div
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--accent-gold)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>
                  Secure Single-Use Setup Invitation Ready
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#0d0f12',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied Invitation!' : 'Copy Invitation Details'}</span>
                </button>
              </div>
              <pre
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  margin: 0,
                  fontFamily: 'monospace',
                }}
              >
                {inviteResult.template}
              </pre>
            </div>
          )}

          {/* Create User Form */}
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Farhaz Patel"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Role *
                </label>
                <select
                  value={role}
                  onChange={(e: any) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                >
                  <option value="ADMIN">Admin (Full System Access)</option>
                  <option value="STAFF">Staff Architect (All Active Projects by Default)</option>
                  <option value="CLIENT_LEADER">Client Leader (Drawings, Chat, Meetings & Approvals)</option>
                  <option value="CLIENT_VIEWER">Client Viewer (Read-only Drawing Access)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  WhatsApp Mobile Number *
                </label>
                <input
                  type="text"
                  placeholder="+91 98251 00000"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Username (Optional - auto-generated if blank)
                </label>
                <input
                  type="text"
                  placeholder="e.g. farhaz_p"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            {/* Multi-Project Assignment Section */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Multi-Project Assignment (Select one or more active studio projects)
              </label>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '12px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {projects.map(p => {
                  const isChecked = selectedProjects.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProjectSelection(p.id)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: isChecked ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                        backgroundColor: isChecked ? 'rgba(217, 119, 6, 0.15)' : 'var(--bg-tertiary)',
                        color: isChecked ? 'var(--accent-gold)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{isChecked ? '✓' : '+'}</span>
                      <span>{p.projectCode} — {p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#0d0f12',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <UserPlus size={16} />
                <span>{isLoading ? 'Creating Setup Link...' : 'Issue Setup Link & Onboard User'}</span>
              </button>
            </div>
          </form>

          {/* Existing Users Table */}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              Active Studio Users ({users.length})
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>User</th>
                    <th style={{ padding: '8px 12px' }}>Role</th>
                    <th style={{ padding: '8px 12px' }}>Mobile (WhatsApp OTP)</th>
                    <th style={{ padding: '8px 12px' }}>Assigned Projects</th>
                    <th style={{ padding: '8px 12px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '10px 12px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        <div>{u.fullName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{u.username}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--bg-tertiary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: u.role === 'ADMIN' ? 'var(--accent-gold)' : u.role === 'STAFF' ? 'var(--accent-emerald)' : 'var(--accent-indigo)',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{u.mobile}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                        {u.assignedProjects && u.assignedProjects.length > 0
                          ? u.assignedProjects.map(p => p.projectCode).join(', ')
                          : u.role === 'ADMIN' ? 'All Projects' : 'None'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, fontSize: '11px' }}>
                          ● {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
