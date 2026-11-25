import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Target,
  Plus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Send,
  Calendar,
  Briefcase,
  User,
  ShieldCheck,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';

export interface StaffTargetItem {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'OVERDUE';
  submissionNotes?: string | null;
  submittedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
  approvedBy?: string | null;
  assignedStaff: { id: string; fullName: string; username: string }[];
  assignedProjects: { id: string; projectCode: string; name: string }[];
}

export interface StaffTargetsProps {
  userRole: UserRole;
  authHeaders: Record<string, string> | (() => Record<string, string>);
  projects?: { id: string; projectCode: string; name: string }[];
}

interface StaffOption {
  id: string;
  fullName: string;
  username: string;
}

function resolveHeaders(
  authHeaders: Record<string, string> | (() => Record<string, string>),
): Record<string, string> {
  const raw = typeof authHeaders === 'function' ? authHeaders() : authHeaders;
  return {
    'Content-Type': 'application/json',
    ...raw,
  };
}

function normalizeTargetItem(raw: any): StaffTargetItem {
  const staffList: any[] = Array.isArray(raw?.assignedStaff)
    ? raw.assignedStaff
    : Array.isArray(raw?.staff)
      ? raw.staff
      : [];
  const projectList: any[] = Array.isArray(raw?.assignedProjects)
    ? raw.assignedProjects
    : Array.isArray(raw?.projects)
      ? raw.projects
      : [];

  return {
    id: String(raw?.id || ''),
    title: raw?.title || 'Untitled Target',
    description: raw?.description ?? null,
    dueDate: String(raw?.dueDate || new Date().toISOString()).slice(0, 10),
    status: raw?.status || 'PENDING',
    submissionNotes: raw?.submissionNotes ?? null,
    submittedAt: raw?.submittedAt ?? null,
    completedAt: raw?.completedAt ?? null,
    createdBy: raw?.createdBy?.fullName || raw?.createdBy || 'Studio Admin',
    approvedBy: raw?.approvedBy?.fullName || raw?.approvedBy || null,
    assignedStaff: staffList.map((s) => ({
      id: String(s?.id || s?.userId || ''),
      fullName: s?.fullName || s?.user?.fullName || 'Staff Member',
      username: s?.username || s?.user?.username || '',
    })),
    assignedProjects: projectList.map((p) => ({
      id: String(p?.id || p?.projectId || ''),
      projectCode: p?.projectCode || p?.project?.projectCode || '',
      name: p?.name || p?.project?.name || '',
    })),
  };
}

export function StaffTargets({ userRole, authHeaders, projects = [] }: StaffTargetsProps) {
  const isAdmin = userRole === 'ADMIN';
  const isStaff = userRole === 'STAFF';
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';

  const [targets, setTargets] = useState<StaffTargetItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  // Admin Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Staff Submit Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Admin Delete Confirmation Modal
  const [deleteTarget, setDeleteTarget] = useState<StaffTargetItem | null>(null);

  const fetchTargets = useCallback(async () => {
    if (isClient) return;
    setIsLoading(true);
    try {
      const headers = resolveHeaders(authHeaders);
      const res = await fetch('/api/targets', { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load targets');
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.targets || data.items || [];
      setTargets(rows.map(normalizeTargetItem));
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to load targets.' });
    } finally {
      setIsLoading(false);
    }
  }, [isClient, authHeaders]);

  const fetchStaffDirectory = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const headers = resolveHeaders(authHeaders);
      const res = await fetch('/api/auth/users', { headers });
      if (!res.ok) return;
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : data.users || [];
      setStaffUsers(
        list
          .filter((u) => u.role === 'STAFF' && u.status !== 'DEACTIVATED')
          .map((u) => ({
            id: String(u.id),
            fullName: u.fullName || u.username || 'Staff Member',
            username: u.username || '',
          })),
      );
    } catch {
      // Optional list
    }
  }, [isAdmin, authHeaders]);

  useEffect(() => {
    void fetchTargets();
    void fetchStaffDirectory();
  }, [fetchTargets, fetchStaffDirectory]);

  const todayIso = new Date().toISOString().slice(0, 10);

  const metrics = useMemo(() => {
    const active = targets.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length;
    const submitted = targets.filter((t) => t.status === 'SUBMITTED').length;
    const completed = targets.filter((t) => t.status === 'COMPLETED').length;
    const overdue = targets.filter(
      (t) => t.status !== 'COMPLETED' && (t.status === 'OVERDUE' || t.dueDate < todayIso),
    ).length;
    return { total: targets.length, active, submitted, completed, overdue };
  }, [targets, todayIso]);

  const filteredTargets = useMemo(() => {
    if (statusFilter === 'ALL') return targets;
    return targets.filter((t) => t.status === statusFilter);
  }, [targets, statusFilter]);

  if (isClient) {
    return (
      <div className="desk-restricted-card">
        <div className="desk-restricted-icon-box">
          <ShieldCheck size={28} />
        </div>
        <h2 className="desk-restricted-title">Target Management Restricted</h2>
        <p className="desk-restricted-desc">
          Internal production quotas are accessible only to Studio Admin and Staff members.
        </p>
      </div>
    );
  }

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: resolveHeaders(authHeaders),
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          dueDate: newDueDate,
          staffIds: selectedStaffIds,
          projectIds: selectedProjectIds,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign target');
      }
      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setSelectedStaffIds([]);
      setSelectedProjectIds([]);
      setBanner({ type: 'success', text: 'Target created and assigned cleanly.' });
      await fetchTargets();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to assign target.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransition = async (
    targetId: string,
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED',
    notes?: string,
  ) => {
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/targets/${targetId}/status`, {
        method: 'PATCH',
        headers: resolveHeaders(authHeaders),
        body: JSON.stringify({ status, submissionNotes: notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Status update failed');
      }
      setIsSubmitModalOpen(false);
      setActiveTargetId(null);
      setSubmissionNotes('');
      setBanner({ type: 'success', text: `Target updated to ${status.replace(/_/g, ' ')}.` });
      await fetchTargets();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to update target status.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/targets/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: resolveHeaders(authHeaders),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      setDeleteTarget(null);
      setBanner({ type: 'info', text: 'Target deleted.' });
      await fetchTargets();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Delete failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getPillTone = (status: StaffTargetItem['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'green';
      case 'SUBMITTED':
        return 'blue';
      case 'IN_PROGRESS':
        return 'gold';
      case 'OVERDUE':
        return 'red';
      default:
        return 'amber';
    }
  };

  return (
    <div>
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">Staff Deliverables &amp; Targets</h1>
          <p className="desk-page-subtitle">
            Assign CAD/interior milestones and monitor timely architectural delivery.
          </p>
        </div>
        <div className="desk-header-actions">
          <button
            type="button"
            className="desk-btn desk-btn-secondary"
            onClick={() => void fetchTargets()}
            disabled={isLoading}
          >
            <RefreshCw size={15} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} />
              <span>Assign Target</span>
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

      <div className="desk-metrics-row">
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon gold">
            <Target size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Total Targets</div>
            <div className="desk-metric-tile-value">{metrics.total}</div>
            <div className="desk-metric-tile-sub">Studio milestones</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon blue">
            <Clock size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Active / Submitted</div>
            <div className="desk-metric-tile-value">
              {metrics.active} / {metrics.submitted}
            </div>
            <div className="desk-metric-tile-sub">Open vs review queue</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon red">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Overdue</div>
            <div className="desk-metric-tile-value">{metrics.overdue}</div>
            <div className="desk-metric-tile-sub">Past target deadline</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon green">
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Completed</div>
            <div className="desk-metric-tile-value">{metrics.completed}</div>
            <div className="desk-metric-tile-sub">Approved deliverables</div>
          </div>
        </div>
      </div>

      <div className="desk-tabs-bar">
        <div className="desk-tabs-group">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              type="button"
              className={`desk-tab-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading && filteredTargets.length === 0 ? (
        <div className="desk-empty-card">Loading studio targets...</div>
      ) : filteredTargets.length === 0 ? (
        <div className="desk-empty-card">
          <Target size={28} style={{ color: 'var(--brand-gold)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, marginBottom: 4 }}>No deliverable targets found</div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            {isAdmin
              ? 'Click "Assign Target" to delegate deliverables to your architectural staff.'
              : 'You have no deliverable targets matching this filter.'}
          </p>
        </div>
      ) : (
        <div className="desk-list-stack">
          {filteredTargets.map((item) => (
            <div key={item.id} className="desk-list-row-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                  <span className={`desk-pill ${getPillTone(item.status)}`}>
                    {item.status.replace(/_/g, ' ')}
                  </span>
                  <span className="desk-pill neutral">
                    <Calendar size={11} /> Due {item.dueDate}
                  </span>
                  {item.assignedProjects.map((p) => (
                    <span key={p.id || p.projectCode} className="desk-pill gold">
                      <Briefcase size={11} /> {p.projectCode}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6 }}>{item.title}</div>
                {item.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                    {item.description}
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    marginTop: 6,
                  }}
                >
                  <User size={12} />
                  <span>
                    {item.assignedStaff.length > 0
                      ? item.assignedStaff.map((s) => s.fullName).join(', ')
                      : 'Studio Team'}
                  </span>
                </div>
                {item.submissionNotes && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      borderRadius: 10,
                      background: 'var(--bg-canvas)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <strong>Note:</strong> {item.submissionNotes}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {isStaff && item.status === 'PENDING' && (
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-soft-gold"
                    disabled={submitting}
                    onClick={() => void handleTransition(item.id, 'IN_PROGRESS')}
                  >
                    <Play size={13} />
                    <span>Start</span>
                  </button>
                )}
                {(isStaff || isAdmin) &&
                  (item.status === 'PENDING' || item.status === 'IN_PROGRESS') && (
                    <button
                      type="button"
                      className="desk-btn desk-btn-sm desk-btn-primary"
                      disabled={submitting}
                      onClick={() => {
                        setActiveTargetId(item.id);
                        setSubmissionNotes(item.submissionNotes || '');
                        setIsSubmitModalOpen(true);
                      }}
                    >
                      <Send size={13} />
                      <span>Submit</span>
                    </button>
                  )}
                {isAdmin && item.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-primary"
                    disabled={submitting}
                    onClick={() => void handleTransition(item.id, 'COMPLETED')}
                  >
                    <ShieldCheck size={13} />
                    <span>Complete</span>
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-danger-outline"
                    onClick={() => setDeleteTarget(item)}
                    aria-label="Delete target"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Create Target Modal */}
      {isCreateModalOpen && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 520 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Assign Production Target</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTarget}>
              <div className="desk-modal-body">
                <div className="desk-form-group">
                  <label>Deliverable Title</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Issue GFC Joinery Detail Pack"
                    required
                  />
                </div>
                <div className="desk-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="desk-form-input"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    required
                  />
                </div>
                <div className="desk-form-group">
                  <label>Notes</label>
                  <textarea
                    className="desk-form-textarea"
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                  />
                </div>
                <div className="desk-form-group">
                  <label>Assign Staff</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {staffUsers.map((u) => {
                      const picked = selectedStaffIds.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          className={`desk-btn desk-btn-sm ${
                            picked ? 'desk-btn-primary' : 'desk-btn-secondary'
                          }`}
                          onClick={() =>
                            setSelectedStaffIds((prev) =>
                              prev.includes(u.id) ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                            )
                          }
                        >
                          {u.fullName}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="desk-form-group">
                  <label>Link Projects</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {projects.map((p) => {
                      const picked = selectedProjectIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`desk-btn desk-btn-sm ${
                            picked ? 'desk-btn-primary' : 'desk-btn-secondary'
                          }`}
                          onClick={() =>
                            setSelectedProjectIds((prev) =>
                              prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id],
                            )
                          }
                        >
                          {p.projectCode}
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
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                  {submitting ? 'Assigning...' : 'Assign Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit Notes Modal */}
      {isSubmitModalOpen && activeTargetId && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 440 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Submit Target Deliverable</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsSubmitModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="desk-modal-body">
              <div className="desk-form-group">
                <label>Submission Notes</label>
                <textarea
                  className="desk-form-textarea"
                  rows={3}
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Reference CAD/PDF uploads or review remarks..."
                />
              </div>
            </div>
            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setIsSubmitModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="desk-btn desk-btn-primary"
                disabled={submitting}
                onClick={() =>
                  void handleTransition(
                    activeTargetId,
                    'SUBMITTED',
                    submissionNotes.trim() || undefined,
                  )
                }
              >
                {submitting ? 'Submitting...' : 'Submit Deliverable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 420 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Delete Target</h3>
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
                Permanently remove <strong>{deleteTarget.title}</strong>?
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
}
