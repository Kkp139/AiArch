import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  Edit3,
  Lock,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';

export type ReminderPriority = 'HIGH' | 'MEDIUM' | 'NORMAL';

export interface StudioReminderItem {
  id: string;
  title: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  dueDate: string;
  dueTime?: string;
  priority: ReminderPriority;
  isCompleted: boolean;
  notes?: string;
  createdAt?: string;
}

export interface DesktopRemindersViewProps {
  userRole: UserRole;
  projects?: ProjectSummary[];
  getAuthHeaders?: () => Record<string, string>;
  onRefreshCounts?: () => void;
}

function normalizeReminder(raw: any): StudioReminderItem {
  return {
    id: String(raw?.id || ''),
    title: raw?.title || 'Untitled Reminder',
    projectId: raw?.projectId || undefined,
    projectCode: raw?.projectCode || raw?.project?.projectCode || undefined,
    projectName: raw?.projectName || raw?.project?.name || undefined,
    dueDate: String(raw?.dueDate || new Date().toISOString()).slice(0, 10),
    dueTime: raw?.dueTime || '',
    priority: (raw?.priority || 'NORMAL') as ReminderPriority,
    isCompleted: Boolean(raw?.isCompleted),
    notes: raw?.notes || '',
    createdAt: raw?.createdAt,
  };
}

function getPriorityPillClass(priority: ReminderPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'red';
    case 'MEDIUM':
      return 'amber';
    default:
      return 'neutral';
  }
}

export const DesktopRemindersView: React.FC<DesktopRemindersViewProps> = ({
  userRole,
  projects = [],
  getAuthHeaders,
  onRefreshCounts,
}) => {
  const isAdmin = userRole === 'ADMIN';

  const [reminders, setReminders] = useState<StudioReminderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  // Filters
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create / Edit Modal
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formDueTime, setFormDueTime] = useState<string>('10:30');
  const [formPriority, setFormPriority] = useState<ReminderPriority>('MEDIUM');
  const [formNotes, setFormNotes] = useState<string>('');

  // Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<StudioReminderItem | null>(null);

  const authHeaders = useCallback(
    () => (getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
    [getAuthHeaders],
  );

  const fetchReminders = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reminders', { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load reminders');
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.reminders || data.items || [];
      setReminders(rows.map(normalizeReminder));
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to load reminders.' });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, authHeaders]);

  useEffect(() => {
    void fetchReminders();
  }, [fetchReminders]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const pending = reminders.filter((r) => !r.isCompleted);
    const completed = reminders.filter((r) => r.isCompleted);
    const highOrDue = pending.filter((r) => r.priority === 'HIGH' || r.dueDate <= todayIso);
    return {
      total: reminders.length,
      pending: pending.length,
      highOrDue: highOrDue.length,
      completed: completed.length,
    };
  }, [reminders, todayIso]);

  const filteredReminders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reminders
      .filter((r) => {
        if (tab === 'PENDING' && r.isCompleted) return false;
        if (tab === 'COMPLETED' && !r.isCompleted) return false;
        if (projectFilter !== 'ALL' && r.projectCode !== projectFilter) return false;
        if (q) {
          const hay = [r.title, r.notes || '', r.projectCode || '', r.projectName || '']
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [reminders, tab, projectFilter, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="desk-restricted-card">
        <div className="desk-restricted-icon-box">
          <Lock size={28} />
        </div>
        <h2 className="desk-restricted-title">Admin Reminders Restricted</h2>
        <p className="desk-restricted-desc">
          Shared studio follow-up reminders are visible exclusively to Studio Admin accounts.
        </p>
      </div>
    );
  }

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormTitle('');
    setFormProjectId('');
    setFormDueDate(todayIso);
    setFormDueTime('10:30');
    setFormPriority('MEDIUM');
    setFormNotes('');
  };

  const openEditModal = (r: StudioReminderItem) => {
    setModalMode('edit');
    setEditingId(r.id);
    setFormTitle(r.title);
    setFormProjectId(r.projectId || '');
    setFormDueDate(r.dueDate);
    setFormDueTime(r.dueTime || '');
    setFormPriority(r.priority);
    setFormNotes(r.notes || '');
  };

  const handleSaveReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setBanner({ type: 'error', text: 'Please enter a reminder title.' });
      return;
    }
    setSubmitting(true);
    setBanner(null);
    const payload = {
      title: formTitle.trim(),
      projectId: formProjectId || null,
      dueDate: formDueDate,
      dueTime: formDueTime.trim() || undefined,
      priority: formPriority,
      notes: formNotes.trim() || undefined,
    };

    try {
      const url = modalMode === 'edit' && editingId ? `/api/reminders/${editingId}` : '/api/reminders';
      const method = modalMode === 'edit' ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save reminder');
      }
      setModalMode(null);
      setBanner({
        type: 'success',
        text: modalMode === 'edit' ? 'Reminder updated.' : 'Admin reminder created.',
      });
      await fetchReminders();
      onRefreshCounts?.();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to save reminder.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (r: StudioReminderItem) => {
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/reminders/${r.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ isCompleted: !r.isCompleted }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update reminder');
      }
      await fetchReminders();
      onRefreshCounts?.();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to update reminder.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/reminders/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete reminder');
      }
      setDeleteTarget(null);
      setBanner({ type: 'info', text: 'Reminder deleted.' });
      await fetchReminders();
      onRefreshCounts?.();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to delete reminder.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">Admin Reminders</h1>
          <p className="desk-page-subtitle">
            Private leadership follow-ups for client approvals, municipal filings, and studio renewals.
          </p>
        </div>
        <div className="desk-header-actions">
          <button
            type="button"
            className="desk-btn desk-btn-secondary"
            onClick={() => void fetchReminders()}
            disabled={loading}
          >
            <RefreshCw size={15} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button type="button" className="desk-btn desk-btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            <span>New Reminder</span>
          </button>
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

      {/* 4 Summary Tiles matching Figma 932:46638 */}
      <div className="desk-metrics-row">
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon gold">
            <BellRing size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Total Reminders</div>
            <div className="desk-metric-tile-value">{stats.total}</div>
            <div className="desk-metric-tile-sub">Shared across Admins</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon amber">
            <Clock size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Pending</div>
            <div className="desk-metric-tile-value">{stats.pending}</div>
            <div className="desk-metric-tile-sub">Open action items</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon red">
            <AlertCircle size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Due / High Priority</div>
            <div className="desk-metric-tile-value">{stats.highOrDue}</div>
            <div className="desk-metric-tile-sub">Requires immediate attention</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon green">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Completed</div>
            <div className="desk-metric-tile-value">{stats.completed}</div>
            <div className="desk-metric-tile-sub">Checked off items</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="desk-tabs-bar">
        <div className="desk-tabs-group">
          {(
            [
              { id: 'ALL', label: `All (${stats.total})` },
              { id: 'PENDING', label: `Pending (${stats.pending})` },
              { id: 'COMPLETED', label: `Completed (${stats.completed})` },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`desk-tab-btn ${tab === item.id ? 'active' : ''}`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="desk-header-actions">
          <select
            className="desk-form-select"
            style={{ width: 200 }}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.projectCode}>
                {p.projectCode} · {p.name}
              </option>
            ))}
          </select>
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
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Reminders List */}
      {loading && filteredReminders.length === 0 ? (
        <div className="desk-empty-card">Loading reminders...</div>
      ) : filteredReminders.length === 0 ? (
        <div className="desk-empty-card">
          <BellRing size={28} style={{ color: 'var(--brand-gold)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No reminders found</div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
            Create an Admin reminder for upcoming site follow-ups, billing dates, or regulatory filings.
          </p>
          <button type="button" className="desk-btn desk-btn-primary" onClick={openCreateModal}>
            <Plus size={15} />
            <span>Add First Reminder</span>
          </button>
        </div>
      ) : (
        <div className="desk-list-stack">
          {filteredReminders.map((r) => {
            const isOverdue = !r.isCompleted && r.dueDate < todayIso;
            return (
              <div key={r.id} className="desk-list-row-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                  <button
                    type="button"
                    className={`desk-btn desk-btn-sm ${
                      r.isCompleted ? 'desk-btn-primary' : 'desk-btn-secondary'
                    }`}
                    style={{ width: 32, height: 32, padding: 0, justifyContent: 'center', marginTop: 2 }}
                    disabled={submitting}
                    onClick={() => void handleToggleComplete(r)}
                    aria-label={r.isCompleted ? 'Mark pending' : 'Mark completed'}
                  >
                    <Check size={15} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span className={`desk-pill ${getPriorityPillClass(r.priority)}`}>
                        {r.priority}
                      </span>
                      <span className={`desk-pill ${isOverdue ? 'red' : 'neutral'}`}>
                        {r.dueDate}
                        {r.dueTime ? ` · ${r.dueTime}` : ''}
                      </span>
                      {r.projectCode && <span className="desk-pill gold">{r.projectCode}</span>}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        marginTop: 6,
                        textDecoration: r.isCompleted ? 'line-through' : 'none',
                        color: r.isCompleted ? 'var(--text-muted)' : 'var(--text-primary)',
                      }}
                    >
                      {r.title}
                    </div>
                    {r.notes && (
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {r.notes}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-secondary"
                    onClick={() => openEditModal(r)}
                    aria-label="Edit reminder"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-danger-outline"
                    onClick={() => setDeleteTarget(r)}
                    aria-label="Delete reminder"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Reminder Modal */}
      {modalMode && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 480 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">
                {modalMode === 'edit' ? 'Edit Reminder' : 'Create Admin Reminder'}
              </h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setModalMode(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveReminder}>
              <div className="desk-modal-body">
                <div className="desk-form-group">
                  <label>Reminder Title</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    placeholder="e.g. Follow up with Municipal Architect on elevation approval"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="desk-form-group">
                  <label>Linked Project (Optional)</label>
                  <select
                    className="desk-form-select"
                    value={formProjectId}
                    onChange={(e) => setFormProjectId(e.target.value)}
                  >
                    <option value="">General Studio Reminder</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectCode} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  <div className="desk-form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      className="desk-form-input"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="desk-form-group">
                    <label>Time</label>
                    <input
                      type="time"
                      className="desk-form-input"
                      value={formDueTime}
                      onChange={(e) => setFormDueTime(e.target.value)}
                    />
                  </div>
                  <div className="desk-form-group">
                    <label>Priority</label>
                    <select
                      className="desk-form-select"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value as ReminderPriority)}
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="NORMAL">Normal</option>
                    </select>
                  </div>
                </div>
                <div className="desk-form-group">
                  <label>Notes (Optional)</label>
                  <textarea
                    className="desk-form-textarea"
                    rows={3}
                    placeholder="Add context, call numbers, or filing references..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setModalMode(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 420 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Delete Reminder</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setDeleteTarget(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="desk-modal-body">
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
                Remove reminder <strong>{deleteTarget.title}</strong> permanently?
              </p>
            </div>
            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="desk-btn desk-btn-danger"
                disabled={submitting}
                onClick={() => void handleDeleteConfirm()}
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
