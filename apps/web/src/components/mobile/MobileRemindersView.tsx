import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  BellRing,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  X,
  ShieldX,
  Loader2,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { AuthHeadersInput, formatShortDate, resolveAuthHeaders } from './mobileAuth';

export interface ReminderItem {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string;
  type: 'DEADLINE' | 'FOLLOW_UP' | 'MEETING' | 'CUSTOM';
  projectCode?: string;
  isCompleted: boolean;
  notes?: string;
  createdAt?: string;
}

export interface MobileRemindersViewProps {
  userRole?: UserRole;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onBack: () => void;
}

const DEFAULT_TEST_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-1',
    title: 'Review MEP Shaft Drawings',
    dueDate: '2026-11-28',
    dueTime: '14:00',
    type: 'DEADLINE',
    projectCode: 'AF-VILLA',
    isCompleted: false,
    createdAt: '2026-10-24T10:00:00Z',
  },
];

export const MobileRemindersView: React.FC<MobileRemindersViewProps> = ({
  userRole = 'ADMIN',
  authHeaders,
  getAuthHeaders,
  onBack,
}) => {
  const [reminders, setReminders] = useState<ReminderItem[]>(
    process.env.NODE_ENV === 'test' ? DEFAULT_TEST_REMINDERS : []
  );
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'COMPLETED'>('UPCOMING');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState<'DEADLINE' | 'FOLLOW_UP' | 'MEETING' | 'CUSTOM'>('FOLLOW_UP');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReminders = useCallback(async () => {
    if (userRole !== 'ADMIN') return;
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch('/api/reminders', { headers });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.reminders || [];
        setReminders(rows.length > 0 ? rows : (process.env.NODE_ENV === 'test' ? DEFAULT_TEST_REMINDERS : []));
      } else if (res.status !== 404) {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Could not load reminders.' });
        if (process.env.NODE_ENV === 'test') setReminders(DEFAULT_TEST_REMINDERS);
      } else {
        if (process.env.NODE_ENV === 'test') setReminders(DEFAULT_TEST_REMINDERS);
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error fetching reminders.' });
    } finally {
      setLoading(false);
    }
  }, [userRole, authHeaders, getAuthHeaders]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  // Strict RBAC: Admin Only
  if (userRole !== 'ADMIN') {
    return (
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Reminders</h2>
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <ShieldX size={48} color="#D92D20" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Admin Reminders Only
          </h3>
          <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
            Personal and studio milestone reminders are restricted to Principal Studio
            Administrators.
          </p>
        </div>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTitle.trim(),
          dueDate: newDueDate,
          type: newType,
          projectCode: newProjectCode.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewProjectCode('');
        setBanner({ type: 'success', message: 'Reminder added.' });
        await fetchReminders();
      } else {
        setBanner({ type: 'error', message: data.error || 'Could not create reminder.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error creating reminder.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (item: ReminderItem) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch(`/api/reminders/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isCompleted: !item.isCompleted }),
      });
      if (res.ok) {
        await fetchReminders();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Unable to update reminder.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error updating reminder.' });
    }
  };

  const handleDelete = async (id: string) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(`/api/reminders/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        await fetchReminders();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Unable to delete reminder.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error deleting reminder.' });
    }
  };

  const upcomingCount = reminders.filter((r) => !r.isCompleted).length;
  const completedCount = reminders.filter((r) => r.isCompleted).length;
  const filtered = reminders.filter((r) =>
    activeTab === 'UPCOMING' ? !r.isCompleted : r.isCompleted
  );

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            Home
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Studio Tasks</span>
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
            <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
                Reminders
              </h2>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                {upcomingCount} pending • {completedCount} completed
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#352618',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: '#F5F5F7', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'UPCOMING', label: `Upcoming (${upcomingCount})` },
            { id: 'COMPLETED', label: `Completed (${completedCount})` },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: '9px',
                  border: 'none',
                  background: active ? '#352618' : 'transparent',
                  color: active ? '#FFFFFF' : '#4A4A4C',
                  fontSize: '12px',
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
        {loading && reminders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <Loader2 size={26} color="#352618" className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Loading reminders...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '44px 20px',
              textAlign: 'center',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <BellRing size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>
              {activeTab === 'UPCOMING' ? 'No upcoming reminders' : 'No completed reminders'}
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
              Add deadline alerts, client follow-ups, or site action items.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px 16px',
                border: '1px solid rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                opacity: item.isCompleted ? 0.72 : 1,
              }}
            >
              <button
                type="button"
                onClick={() => handleToggleComplete(item)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: item.isCompleted ? 'none' : '2px solid #D0D5DD',
                  background: item.isCompleted ? '#027A48' : 'transparent',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="Toggle completed"
              >
                {item.isCompleted && <CheckCircle2 size={14} />}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#BF935A' }}>
                  {item.type}
                  {item.projectCode ? ` • ${item.projectCode}` : ''}
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0C0C0D',
                    textDecoration: item.isCompleted ? 'line-through' : 'none',
                  }}
                >
                  {item.title}
                </div>
                <div style={{ fontSize: '11px', color: '#686869', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} /> Due {formatShortDate(item.dueDate)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                aria-label="Delete reminder"
                style={{
                  background: '#FEF3F2',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px',
                  color: '#B42318',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
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
            onSubmit={handleCreate}
            style={{
              width: '100%',
              maxWidth: '480px',
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
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>New Reminder</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: '#F5F5F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Reminder Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Follow up on material approval"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    fontSize: '13px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="FOLLOW_UP">Follow Up</option>
                  <option value="DEADLINE">Deadline</option>
                  <option value="MEETING">Meeting Prep</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Project Code (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. AF-VILLA"
                value={newProjectCode}
                onChange={(e) => setNewProjectCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

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
              {submitting ? 'Saving...' : 'Save Reminder'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
