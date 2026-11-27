import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BellRing,
  CheckCircle2,
  Clock,
  Calendar,
  FolderClosed,
  Plus,
  Search,
  Trash2,
  Edit3,
  Lock,
  RefreshCw,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
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
  dueAt?: string;
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

const PAGE_SIZE = 8;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDateInput(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function toLocalTimeInput(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function normalizeReminder(raw: any): StudioReminderItem {
  const rawDueAt = raw?.dueAt;
  let dueDate = String(raw?.dueDate || '').slice(0, 10);
  let dueTime = raw?.dueTime || '';

  if (rawDueAt) {
    const parsed = new Date(rawDueAt);
    if (!Number.isNaN(parsed.getTime())) {
      dueDate = toLocalDateInput(parsed);
      dueTime = toLocalTimeInput(parsed);
    }
  }

  if (!dueDate) {
    dueDate = toLocalDateInput(new Date());
  }

  return {
    id: String(raw?.id || ''),
    title: raw?.title || 'Untitled Reminder',
    projectId: raw?.projectId || undefined,
    projectCode: raw?.projectCode || raw?.project?.projectCode || undefined,
    projectName: raw?.projectName || raw?.project?.name || undefined,
    dueDate,
    dueTime,
    dueAt: rawDueAt || undefined,
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

function formatDisplayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDisplayTime(timeStr?: string): string {
  if (!timeStr) return '';
  const [hhStr, mmStr] = timeStr.split(':');
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return timeStr;
  const period = hh >= 12 ? 'PM' : 'AM';
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${pad2(hour12)}:${pad2(mm)} ${period}`;
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

  // Filters & sorting
  const [tab, setTab] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | ReminderPriority>('ALL');
  const [projectFilter, setProjectFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);

  // Create / Edit Modal
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formProjectId, setFormProjectId] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>(toLocalDateInput(new Date()));
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

  useEffect(() => {
    setPage(1);
  }, [tab, priorityFilter, projectFilter, searchQuery]);

  const todayIso = toLocalDateInput(new Date());
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekIso = toLocalDateInput(nextWeekDate);

  const stats = useMemo(() => {
    const pending = reminders.filter((r) => !r.isCompleted);
    const completed = reminders.filter((r) => r.isCompleted);
    const dueThisWeek = pending.filter((r) => r.dueDate <= nextWeekIso);
    const highPriority = pending.filter((r) => r.priority === 'HIGH');
    return {
      total: reminders.length,
      pending: pending.length,
      completed: completed.length,
      dueThisWeek: dueThisWeek.length,
      highPriority: highPriority.length,
    };
  }, [reminders, nextWeekIso]);

  const filteredReminders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reminders
      .filter((r) => {
        if (tab === 'PENDING' && r.isCompleted) return false;
        if (tab === 'COMPLETED' && !r.isCompleted) return false;
        if (priorityFilter !== 'ALL' && r.priority !== priorityFilter) return false;
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
        const cmp = `${a.dueDate}T${a.dueTime || '00:00'}`.localeCompare(
          `${b.dueDate}T${b.dueTime || '00:00'}`,
        );
        return sortAsc ? cmp : -cmp;
      });
  }, [reminders, tab, priorityFilter, projectFilter, searchQuery, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredReminders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedReminders = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredReminders.slice(start, start + PAGE_SIZE);
  }, [filteredReminders, safePage]);

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
    setFormDueTime(r.dueTime || '10:30');
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

    const timePart = formDueTime.trim() || '09:00';
    const dueAtDate = new Date(`${formDueDate}T${timePart}`);
    const dueAtIso = Number.isNaN(dueAtDate.getTime())
      ? new Date().toISOString()
      : dueAtDate.toISOString();

    const payload = {
      title: formTitle.trim(),
      projectId: formProjectId || null,
      dueAt: dueAtIso,
      priority: formPriority,
      notes: formNotes.trim() || null,
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
      {/* Page Header matching Figma 934:48127 */}
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">Reminders</h1>
          <p className="desk-page-subtitle">
            Manage and track important tasks, deadlines and follow-ups.
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
            <span>Create Reminder</span>
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

      {/* 4 Summary Tiles matching Figma 934:48132 */}
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
            <div className="desk-metric-tile-sub">
              {stats.highPriority > 0 ? `${stats.highPriority} high priority` : 'Open action items'}
            </div>
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
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon blue">
            <Calendar size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Due This Week</div>
            <div className="desk-metric-tile-value">{stats.dueThisWeek}</div>
            <div className="desk-metric-tile-sub">Upcoming &amp; overdue</div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar matching Figma 934:48161 */}
      <div className="desk-tabs-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
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

        <div className="desk-header-actions" style={{ flexWrap: 'wrap' }}>
          <select
            aria-label="Filter by priority"
            className="desk-form-select"
            style={{ width: 150 }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | ReminderPriority)}
          >
            <option value="ALL">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="NORMAL">Normal Priority</option>
          </select>
          <select
            aria-label="Filter by project"
            className="desk-form-select"
            style={{ width: 190 }}
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
                color: 'var(--desk-text-muted)',
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

      {/* Reminders Table matching Figma 934:48183 */}
      {loading && filteredReminders.length === 0 ? (
        <div className="desk-empty-card">Loading reminders...</div>
      ) : filteredReminders.length === 0 ? (
        <div className="desk-empty-card">
          <BellRing size={28} style={{ color: 'var(--desk-gold)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>No reminders found</div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--desk-text-secondary)' }}>
            Create an Admin reminder for upcoming site follow-ups, billing dates, or regulatory filings.
          </p>
          <button type="button" className="desk-btn desk-btn-primary" onClick={openCreateModal}>
            <Plus size={15} />
            <span>Create Reminder</span>
          </button>
        </div>
      ) : (
        <div className="desk-table-card">
          <div className="desk-table-scroll">
            <table className="desk-data-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>Done</th>
                  <th>Reminder</th>
                  <th>Category</th>
                  <th>
                    <button
                      type="button"
                      onClick={() => setSortAsc((prev) => !prev)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        font: 'inherit',
                        color: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      <span>Due Date &amp; Time</span>
                      <ArrowUpDown size={13} />
                    </button>
                  </th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReminders.map((r) => {
                  const isOverdue = !r.isCompleted && r.dueDate < todayIso;
                  const categoryLabel = r.projectName || r.projectCode || 'General';
                  return (
                    <tr key={r.id}>
                      <td>
                        <button
                          type="button"
                          className={`desk-btn desk-btn-sm ${
                            r.isCompleted ? 'desk-btn-primary' : 'desk-btn-secondary'
                          }`}
                          style={{
                            width: 26,
                            height: 26,
                            padding: 0,
                            justifyContent: 'center',
                            borderRadius: 6,
                          }}
                          disabled={submitting}
                          onClick={() => void handleToggleComplete(r)}
                          aria-label={r.isCompleted ? 'Mark pending' : 'Mark completed'}
                        >
                          {r.isCompleted && <Check size={14} />}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            className="desk-soft-icon-box"
                            style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
                          >
                            {r.projectId || r.projectCode ? (
                              <FolderClosed size={18} />
                            ) : (
                              <BellRing size={18} />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 14.5,
                                fontWeight: 600,
                                textDecoration: r.isCompleted ? 'line-through' : 'none',
                                color: r.isCompleted
                                  ? 'var(--desk-text-muted)'
                                  : 'var(--desk-text-primary)',
                              }}
                            >
                              {r.title}
                            </div>
                            {r.notes && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: 'var(--desk-text-secondary)',
                                  marginTop: 2,
                                }}
                              >
                                {r.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          <span className="desk-pill gold">{categoryLabel}</span>
                          <span className={`desk-pill ${getPriorityPillClass(r.priority)}`}>
                            {r.priority}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Calendar
                            size={16}
                            style={{
                              color: isOverdue ? 'var(--desk-danger)' : 'var(--desk-text-muted)',
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 13.5,
                                fontWeight: 500,
                                color: isOverdue ? 'var(--desk-danger)' : 'var(--desk-text-primary)',
                              }}
                            >
                              {formatDisplayDate(r.dueDate)}
                            </div>
                            {r.dueTime && (
                              <div style={{ fontSize: 12, color: 'var(--desk-text-secondary)' }}>
                                {formatDisplayTime(r.dueTime)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`desk-pill ${
                            r.isCompleted ? 'green' : isOverdue ? 'red' : 'amber'
                          }`}
                        >
                          {r.isCompleted ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="desk-table-pagination"
            style={{ justifyContent: 'space-between', padding: '14px 24px' }}
          >
            <span style={{ fontSize: 13, color: 'var(--desk-text-secondary)' }}>
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredReminders.length)} of{' '}
              {filteredReminders.length} reminders
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="desk-btn desk-btn-sm desk-btn-secondary"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--desk-gold-soft)',
                  border: '1px solid var(--desk-gold)',
                  color: 'var(--desk-gold-dark)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {safePage}
              </span>
              <button
                type="button"
                className="desk-btn desk-btn-sm desk-btn-secondary"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
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
              <p style={{ margin: 0, fontSize: 13, color: 'var(--desk-text-secondary)' }}>
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
