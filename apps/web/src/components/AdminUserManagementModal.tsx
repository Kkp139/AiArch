import React, { useState, useEffect } from 'react';
import { UserPlus, X, CheckCircle2, AlertCircle, Shield, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserRecord {
  id: string;
  username: string;
  fullName: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';
  mobile: string;
  showPricing: boolean;
  status: string;
}

interface AdminUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUserManagementModal: React.FC<AdminUserManagementModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER'>('STAFF');
  const [mobile, setMobile] = useState('+91 ');
  const [password, setPassword] = useState('');

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

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !mobile.trim() || !password.trim()) {
      setFeedback({ type: 'error', message: 'Please complete all fields to onboard user.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          role,
          mobile: mobile.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Failed to onboard user.' });
        return;
      }

      setFeedback({
        type: 'success',
        message: `User '${data.user.fullName}' (${data.user.role}) created successfully! They can now log in via 2-Step WhatsApp OTP.`,
      });

      // Reset form
      setFullName('');
      setUsername('');
      setMobile('+91 ');
      setPassword('');
      fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: 'Network error communicating with studio API.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid #EAEAEA',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F9F9FB',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(191, 147, 90, 0.15)',
                color: '#BF935A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#111' }}>
                Studio Team & Client Onboarding
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                Create actual business accounts. Staff and Clients will verify via WhatsApp 2-Step OTP.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              padding: '6px',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
          {feedback && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: feedback.type === 'success' ? '#EDF7ED' : '#FDECEA',
                color: feedback.type === 'success' ? '#1E4620' : '#D32F2F',
                border: `1px solid ${feedback.type === 'success' ? '#C8E6C9' : '#FFCDD2'}`,
              }}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Onboarding Form */}
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Ar. Priya Sharma or Raj Patel"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D2D2D7',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
                Studio Role
              </label>
              <select
                value={role}
                onChange={(e: any) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D2D2D7',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                <option value="STAFF">Staff (Project Architect)</option>
                <option value="CLIENT_LEADER">Client Leader (Full Project Access)</option>
                <option value="CLIENT_VIEWER">Client Viewer (Read Only)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
                WhatsApp Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D2D2D7',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
                Username (for Login)
              </label>
              <input
                type="text"
                placeholder="e.g. priya.architect"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D2D2D7',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#333', marginBottom: '6px' }}>
                Initial Password
              </label>
              <input
                type="password"
                placeholder="Set an initial password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  border: '1px solid #D2D2D7',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                required
              />
            </div>

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#BF935A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isLoading ? 'Creating Account...' : 'Create Account & Enable 2-Step OTP'}
              </button>
            </div>
          </form>

          {/* Active Workspace Users Section */}
          <div style={{ marginTop: '32px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#444' }}>
              Active Workspace Members ({users.length})
            </h4>
            <div style={{ border: '1px solid #EAEAEA', borderRadius: '8px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8FA', borderBottom: '1px solid #EAEAEA', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', color: '#555' }}>Name</th>
                    <th style={{ padding: '10px 14px', color: '#555' }}>Username</th>
                    <th style={{ padding: '10px 14px', color: '#555' }}>Role</th>
                    <th style={{ padding: '10px 14px', color: '#555' }}>WhatsApp</th>
                    <th style={{ padding: '10px 14px', color: '#555' }}>Auth Flow</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#111' }}>{u.fullName}</td>
                      <td style={{ padding: '10px 14px', color: '#666' }}>{u.username}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: u.role === 'ADMIN' ? 'rgba(191, 147, 90, 0.15)' : '#F0F0F2',
                            color: u.role === 'ADMIN' ? '#A67C46' : '#555',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#666' }}>{u.mobile}</td>
                      <td style={{ padding: '10px 14px', color: '#888', fontSize: '12px' }}>
                        {u.role === 'ADMIN' ? 'Direct (No OTP)' : '2-Step OTP'}
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
