import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole } from '../../context/AuthContext';
import { StaffTargetItem } from '../../pages/Targets/StaffTargets';
import type { ProjectSummary } from '../../App';
import {
  Target,
  Plus,
  Clock,
  CheckCircle2,
  Play,
  Send,
  Calendar,
  X,
  ShieldX,
  Search,
  Check,
  Trash2,
  Eye,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import './desktop.css';

export type { StaffTargetItem };

export interface DesktopTargetsViewProps {
  userRole?: UserRole;
  user?: {
    fullName: string;
    role: UserRole;
    email?: string;
  };
  projects?: ProjectSummary[];
  targets?: StaffTargetItem[];
  getAuthHeaders?: () => Record<string, string>;
  onRefresh?: () => Promise<void> | void;
  onCreateTarget?: (data: {
    title: string;
    description: string;
    dueDate: string;
    assignedStaffId?: string;
    projectCode?: string;
  }) => void;
  onSubmitReview?: (targetId: string, notes: string) => void;
  onApproveTarget?: (targetId: string) => void;
}

interface StaffOption {
  id: string;
  fullName: string;
  username: string;
}

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const DEFAULT_TARGETS: StaffTargetItem[] = [
  {
    id: 'tgt-1',
    title: 'Complete Ground Floor Working Drawing Package',
    description: 'Prepare complete dimensioned floor plans, partition details, and door/window schedules for site execution.',
    dueDate: '2026-11-04',
    status: 'IN_PROGRESS',
    createdBy: 'Farhan Admani',
    assignedStaff: [{ id: 'st-1', fullName: 'Rajesh Patel', username: 'rajesh' }],
    assignedProjects: [{ id: 'p-1', projectCode: 'AF-VILLA', name: 'Courtyard Villa' }],
  },
  {
    id: 'tgt-2',
    title: 'Structural Footing & Column Load Verification',
    description: 'Review structural engineer calculation sheets against architectural column layouts.',
    dueDate: '2026-11-02',
    status: 'SUBMITTED',
    submissionNotes: 'All 24 column loads reconciled with structural drawings v1.2.',
    createdBy: 'Farhan Admani',
    assignedStaff: [{ id: 'st-2', fullName: 'Sonu Sharma', username: 'sonu' }],
    assignedProjects: [{ id: 'p-2', projectCode: 'AF-INN', name: 'Artilla Inn' }],
  },
  {
    id: 'tgt-3',
    title: 'Client Interior Moodboard Final Presentation',
    description: 'Compile finishes palette, stone samples, and 3D perspectives into client book.',
    dueDate: '2026-10-28',
    status: 'COMPLETED',
    completedAt: '2026-10-28T16:00:00Z',
    createdBy: 'Farhan Admani',
    assignedStaff: [{ id: 'st-3', fullName: 'Ananya Roy', username: 'ananya' }],
    assignedProjects: [{ id: 'p-1', projectCode: 'AF-VILLA', name: 'Courtyard Villa' }],
  },
  {
    id: 'tgt-4',
    title: 'HVAC Chilled Water Pipe Penetration Schedule',
    description: 'Coordinate duct risers and beam sleeves with MEP consultant for basement carpark.',
    dueDate: '2026-11-08',
    status: 'IN_PROGRESS',
    createdBy: 'Farhan Admani',
    assignedStaff: [{ id: 'st-5', fullName: 'Vikram Mehta', username: 'vikram' }],
    assignedProjects: [{ id: 'p-3', projectCode: 'AF-CORP', name: 'Zenith HQ' }],
  },
];

function formatDateLabel(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDefaultDueDate(): string {
  return new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
}

export const DesktopTargetsView: React.FC<DesktopTargetsViewProps> = ({
  userRole,
  user,
  projects = [],
  targets: propTargets,
  getAuthHeaders,
  onRefresh,
  onCreateTarget,
  onSubmitReview,
  onApproveTarget,
}) => {
  const effectiveUser = user || {
    fullName: 'Studio Member',
    role: userRole || 'STAFF',
  };

  const isClient =
    effectiveUser.role === 'CLIENT_LEADER' || effectiveUser.role === 'CLIENT_VIEWER';
  const isAdmin = effectiveUser.role === 'ADMIN';
  const isStaff = effectiveUser.role === 'STAFF';

  const initialTargets = useMemo(() => {
    if (propTargets && propTargets.length > 0) return propTargets;
    if (propTargets) return propTargets;
    return isTestEnv ? DEFAULT_TARGETS : [];
  }, [propTargets]);

  const [targetList, setTargetList] = useState<StaffTargetItem[]>(initialTargets);
  const [staffDirectory, setStaffDirectory] = useState<StaffOption[]>([]);
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  // Create Modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createDueDate, setCreateDueDate] = useState(getDefaultDueDate);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // Submit Update Modal state
  const [submitTargetId, setSubmitTargetId] = useState<string | null>(null);
  const [submitNotes, setSubmitNotes] = useState('');

  // Detail Modal state
  const [detailTarget, setDetailTarget] = useState<StaffTargetItem | null>(null);

  useEffect(() => {
    if (propTargets !== undefined) {
      setTargetList(propTargets);
    }
  }, [propTargets]);

  const buildHeaders = useCallback((): Record<string, string> => {
    const base = getAuthHeaders ? getAuthHeaders() : {};
    return {
      'Content-Type': 'application/json',
      ...base,
    };
  }, [getAuthHeaders]);

  const fetchTargetsFromApi = useCallback(async () => {
    if (isClient || !getAuthHeaders) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/targets', { headers: buildHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load targets');
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.targets || data.items || [];
      setTargetList(rows);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Unable to load targets.' });
    } finally {
      setIsLoading(false);
    }
  }, [isClient, getAuthHeaders, buildHeaders]);

  const fetchStaffDirectory = useCallback(async () => {
    if (!isAdmin || !getAuthHeaders) return;
    try {
      const res = await fetch('/api/auth/users', { headers: buildHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const list: any[] = Array.isArray(data) ? data : data.users || [];
      setStaffDirectory(
        list
          .filter((u) => u.role === 'STAFF' && u.status !== 'DEACTIVATED')
          .map((u) => ({
            id: String(u.id),
            fullName: u.fullName || u.username || 'Staff Member',
            username: u.username || '',
          })),
      );
    } catch {
      // Directory fetch is best-effort if endpoint unavailable
    }
  }, [isAdmin, getAuthHeaders, buildHeaders]);

  useEffect(() => {
    if (isClient) return;
    if (propTargets === undefined && !isTestEnv && getAuthHeaders) {
      void fetchTargetsFromApi();
    }
    if (isAdmin && !isTestEnv && getAuthHeaders) {
      void fetchStaffDirectory();
    }
  }, [isClient, isAdmin, propTargets, getAuthHeaders, fetchTargetsFromApi, fetchStaffDirectory]);

  // Strict RBAC: Client Leader and Client Viewer are restricted from internal staff target board
  if (isClient) {
    return (
      <div className="desktop-access-restricted" data-testid="targets-restricted-card">
        <div className="desktop-access-restricted-icon">
          <ShieldX size={36} color="#D92D20" />
        </div>
        <h2 className="desktop-access-restricted-title">Access Restricted</h2>
        <p className="desktop-access-restricted-desc">
          Operational studio milestones, drawing deliverables, and staff targets are internal studio
          management data.
        </p>
      </div>
    );
  }

  const inProgressCount = targetList.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'PENDING' || t.status === 'OVERDUE',
  ).length;
  const submittedCount = targetList.filter((t) => t.status === 'SUBMITTED').length;
  const completedCount = targetList.filter((t) => t.status === 'COMPLETED').length;

  const handleOpenCreate = () => {
    setCreateTitle('');
    setCreateDesc('');
    setCreateDueDate(getDefaultDueDate());
    setSelectedProjectIds(projects.length > 0 ? [projects[0].id] : []);
    setSelectedStaffIds(staffDirectory.length > 0 ? [staffDirectory[0].id] : []);
    setFeedback(null);
    setIsCreateOpen(true);
    if (isAdmin && getAuthHeaders && staffDirectory.length === 0) {
      void fetchStaffDirectory();
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    const firstProject = projects.find((p) => selectedProjectIds.includes(p.id));

    if (getAuthHeaders) {
      if (selectedStaffIds.length === 0) {
        setFeedback({ type: 'error', text: 'Please assign at least one staff member.' });
        return;
      }
      setSubmitting(true);
      setFeedback(null);
      try {
        const res = await fetch('/api/targets', {
          method: 'POST',
          headers: buildHeaders(),
          body: JSON.stringify({
            title: createTitle.trim(),
            description: createDesc.trim() || undefined,
            dueDate: createDueDate || getDefaultDueDate(),
            staffIds: selectedStaffIds,
            projectIds: selectedProjectIds,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create target');
        }
        setIsCreateOpen(false);
        setFeedback({ type: 'success', text: 'Target created and assigned.' });
        if (onRefresh) {
          await onRefresh();
        } else {
          await fetchTargetsFromApi();
        }
      } catch (err: any) {
        setFeedback({ type: 'error', text: err?.message || 'Unable to create target.' });
      } finally {
        setSubmitting(false);
      }
    } else {
      const assignedStaffObjs = staffDirectory.filter((s) => selectedStaffIds.includes(s.id));
      const assignedProjectObjs = projects.filter((p) => selectedProjectIds.includes(p.id));
      const newTarget: StaffTargetItem = {
        id: `tgt-${Date.now()}`,
        title: createTitle.trim(),
        description: createDesc.trim(),
        dueDate: createDueDate || getDefaultDueDate(),
        status: 'PENDING',
        createdBy: effectiveUser.fullName,
        assignedStaff:
          assignedStaffObjs.length > 0
            ? assignedStaffObjs
            : [
                {
                  id: 'st-cur',
                  fullName: effectiveUser.fullName,
                  username: effectiveUser.fullName.toLowerCase().replace(/\s+/g, ''),
                },
              ],
        assignedProjects: assignedProjectObjs.map((p) => ({
          id: p.id,
          projectCode: p.projectCode,
          name: p.name,
        })),
      };
      setTargetList((prev) => [newTarget, ...prev]);
      setIsCreateOpen(false);
    }

    if (onCreateTarget) {
      onCreateTarget({
        title: createTitle.trim(),
        description: createDesc.trim(),
        dueDate: createDueDate || getDefaultDueDate(),
        assignedStaffId: selectedStaffIds[0],
        projectCode: firstProject?.projectCode,
      });
    }
  };

  const handleStatusTransition = async (
    targetId: string,
    nextStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED',
    notes?: string,
  ) => {
    if (getAuthHeaders) {
      setSubmitting(true);
      setFeedback(null);
      try {
        const res = await fetch(`/api/targets/${targetId}/status`, {
          method: 'PATCH',
          headers: buildHeaders(),
          body: JSON.stringify({
            status: nextStatus,
            submissionNotes: notes,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update target status');
        }
        setFeedback({
          type: 'success',
          text:
            nextStatus === 'COMPLETED'
              ? 'Target approved and completed.'
              : nextStatus === 'SUBMITTED'
                ? 'Target submitted for Admin review.'
                : 'Target status updated.',
        });
        setDetailTarget(null);
        if (onRefresh) {
          await onRefresh();
        } else {
          await fetchTargetsFromApi();
        }
      } catch (err: any) {
        setFeedback({ type: 'error', text: err?.message || 'Unable to update target.' });
      } finally {
        setSubmitting(false);
      }
    } else {
      setTargetList((prev) =>
        prev.map((t) =>
          t.id === targetId
            ? {
                ...t,
                status: nextStatus,
                ...(notes !== undefined ? { submissionNotes: notes } : {}),
                ...(nextStatus === 'COMPLETED' ? { completedAt: new Date().toISOString() } : {}),
              }
            : t,
        ),
      );
      setDetailTarget(null);
    }

    if (nextStatus === 'SUBMITTED' && onSubmitReview && notes !== undefined) {
      onSubmitReview(targetId, notes);
    }
    if (nextStatus === 'COMPLETED' && onApproveTarget) {
      onApproveTarget(targetId);
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    if (getAuthHeaders) {
      setSubmitting(true);
      setFeedback(null);
      try {
        const res = await fetch(`/api/targets/${targetId}`, {
          method: 'DELETE',
          headers: buildHeaders(),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to delete target');
        }
        setDetailTarget(null);
        setFeedback({ type: 'success', text: 'Target deleted.' });
        if (onRefresh) {
          await onRefresh();
        } else {
          await fetchTargetsFromApi();
        }
      } catch (err: any) {
        setFeedback({ type: 'error', text: err?.message || 'Unable to delete target.' });
      } finally {
        setSubmitting(false);
      }
    } else {
      setTargetList((prev) => prev.filter((t) => t.id !== targetId));
      setDetailTarget(null);
    }
  };

  const handleOpenSubmit = (targetId: string) => {
    const existing = targetList.find((t) => t.id === targetId);
    setSubmitTargetId(targetId);
    setSubmitNotes(existing?.submissionNotes || '');
  };

  const handleConfirmSubmit = async () => {
    if (!submitTargetId || !submitNotes.trim()) return;
    const notes = submitNotes.trim();
    const id = submitTargetId;
    setSubmitTargetId(null);
    setSubmitNotes('');
    await handleStatusTransition(id, 'SUBMITTED', notes);
  };

  const filteredTargets = targetList.filter((t) => {
    const matchesFilter =
      activeFilter === 'ALL'
        ? true
        : activeFilter === 'IN_PROGRESS'
          ? t.status === 'IN_PROGRESS' || t.status === 'PENDING' || t.status === 'OVERDUE'
          : t.status === activeFilter;

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.submissionNotes || '').toLowerCase().includes(q) ||
      t.assignedProjects.some(
        (p) => p.projectCode.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      ) ||
      t.assignedStaff.some((s) => s.fullName.toLowerCase().includes(q));

    return matchesFilter && matchesSearch;
  });

  const renderStatusBadge = (status: StaffTargetItem['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span
            className="desktop-pill-pending"
            style={{ background: '#FBF3D5', color: '#B58116' }}
          >
            Pending
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            className="desktop-pill-pending"
            style={{ background: 'rgba(0, 207, 232, 0.14)', color: '#0097A7' }}
          >
            In Progress
          </span>
        );
      case 'OVERDUE':
        return (
          <span
            className="desktop-pill-pending"
            style={{ background: 'rgba(234, 84, 85, 0.14)', color: '#D92D20' }}
          >
            Overdue
          </span>
        );
      case 'SUBMITTED':
        return <span className="desktop-pill-active">Submitted</span>;
      case 'COMPLETED':
        return <span className="desktop-pill-confirmed">Completed</span>;
      default:
        return <span className="desktop-pill-pending">{status}</span>;
    }
  };

  return (
    <div className="desktop-view-container" data-testid="desktop-targets-container">
      {/* Header Bar */}
      <div className="desktop-view-header">
        <div>
          <h1 className="desktop-view-title">Targets</h1>
          <p className="desktop-view-subtitle">
            Set clear goals and keep your studio moving forward.
          </p>
        </div>

        <div className="desktop-header-action-group">
          {getAuthHeaders && (
            <button
              type="button"
              onClick={() => {
                if (onRefresh) void onRefresh();
                else void fetchTargetsFromApi();
              }}
              className="desktop-btn desktop-btn-secondary"
              disabled={isLoading}
            >
              <RefreshCw size={15} />
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              data-testid="targets-create-btn"
              onClick={handleOpenCreate}
              className="desktop-btn desktop-btn-gold"
            >
              <Plus size={16} />
              <span>Create Target</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '10px',
            marginBottom: '16px',
            fontSize: '13px',
            fontWeight: 500,
            background: feedback.type === 'error' ? '#FEF3F2' : '#ECFDF3',
            color: feedback.type === 'error' ? '#B42318' : '#027A48',
            border: `1px solid ${feedback.type === 'error' ? '#FECDCA' : '#ABEFC6'}`,
          }}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="desktop-metrics-grid">
        <div className="desktop-metric-card" data-testid="targets-metric-in-progress">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">In Progress</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#FBF3D5' }}>
              <Clock size={18} color="#B58116" />
            </div>
          </div>
          <div className="desktop-metric-value">{inProgressCount}</div>
          <span className="desktop-metric-sub">Active &amp; pending deliverables</span>
        </div>

        <div className="desktop-metric-card" data-testid="targets-metric-submitted">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Submitted for Review</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#EFF8FF' }}>
              <Send size={18} color="#175CD3" />
            </div>
          </div>
          <div className="desktop-metric-value">{submittedCount}</div>
          <span className="desktop-metric-sub">Awaiting Admin sign-off</span>
        </div>

        <div className="desktop-metric-card" data-testid="targets-metric-completed">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Completed &amp; Stamped</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#E8F8EE' }}>
              <CheckCircle2 size={18} color="#087A48" />
            </div>
          </div>
          <div className="desktop-metric-value">{completedCount}</div>
          <span className="desktop-metric-sub">Verified &amp; closed</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="desktop-tabs-row">
        <button
          type="button"
          className={`desktop-tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          All ({targetList.length})
        </button>
        <button
          type="button"
          className={`desktop-tab-btn ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
          onClick={() => setActiveFilter('IN_PROGRESS')}
        >
          In Progress ({inProgressCount})
        </button>
        <button
          type="button"
          className={`desktop-tab-btn ${activeFilter === 'SUBMITTED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('SUBMITTED')}
        >
          Submitted ({submittedCount})
        </button>
        <button
          type="button"
          className={`desktop-tab-btn ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
          onClick={() => setActiveFilter('COMPLETED')}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Data Table */}
      <div className="desktop-table-card" data-testid="targets-data-table">
        <div className="desktop-table-header-tools">
          <div className="desktop-search-input-wrap">
            <Search size={15} color="#86868B" />
            <input
              type="text"
              placeholder="Search targets by title, project, staff, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="desktop-table-count">{filteredTargets.length} Deliverables</span>
        </div>

        {isLoading && filteredTargets.length === 0 ? (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#686869', fontSize: '14px' }}>
            Loading studio targets...
          </div>
        ) : filteredTargets.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#686869' }}>
            <Target size={28} color="#BF935A" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, color: '#1D1D1F', marginBottom: '4px' }}>
              No targets found
            </div>
            <div style={{ fontSize: '13px' }}>
              {isAdmin
                ? 'Click "Create Target" to assign a new studio deliverable.'
                : 'No assigned targets match the current filter.'}
            </div>
          </div>
        ) : (
          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Target Title &amp; Scope</th>
                <th>Project</th>
                <th>Due Date</th>
                <th>Assigned Staff</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTargets.map((tgt) => (
                <tr key={tgt.id}>
                  <td style={{ maxWidth: '340px' }}>
                    <button
                      type="button"
                      onClick={() => setDetailTarget(tgt)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div className="desktop-cell-primary">{tgt.title}</div>
                    </button>
                    {tgt.description && (
                      <div className="desktop-cell-sub">{tgt.description}</div>
                    )}
                    {tgt.submissionNotes && (
                      <div style={{ fontSize: '11px', color: '#175CD3', marginTop: '4px' }}>
                        <strong>Staff Note:</strong> {tgt.submissionNotes}
                      </div>
                    )}
                  </td>
                  <td>
                    {tgt.assignedProjects && tgt.assignedProjects.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {tgt.assignedProjects.map((p) => (
                          <span key={p.id || p.projectCode} className="desktop-tag-pill">
                            {p.projectCode || p.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="desktop-cell-secondary">Studio</span>
                    )}
                  </td>
                  <td>
                    <div className="desktop-time-cell">
                      <Calendar size={13} color="#86868B" />
                      <span>{tgt.dueDate}</span>
                    </div>
                  </td>
                  <td>
                    <span className="desktop-cell-secondary">
                      {tgt.assignedStaff && tgt.assignedStaff.length > 0
                        ? tgt.assignedStaff.map((s) => s.fullName).join(', ')
                        : 'Unassigned'}
                    </span>
                  </td>
                  <td>{renderStatusBadge(tgt.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {isStaff && tgt.status === 'PENDING' && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleStatusTransition(tgt.id, 'IN_PROGRESS')}
                          className="desktop-btn desktop-btn-sm desktop-btn-secondary"
                        >
                          <Play size={13} />
                          <span>Start</span>
                        </button>
                      )}
                      {isStaff &&
                        (tgt.status === 'IN_PROGRESS' ||
                          tgt.status === 'PENDING' ||
                          tgt.status === 'OVERDUE') && (
                          <button
                            type="button"
                            data-testid={`target-submit-btn-${tgt.id}`}
                            disabled={submitting}
                            onClick={() => handleOpenSubmit(tgt.id)}
                            className="desktop-btn desktop-btn-sm desktop-btn-gold"
                          >
                            Submit Update
                          </button>
                        )}
                      {isAdmin && tgt.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => void handleStatusTransition(tgt.id, 'COMPLETED')}
                          className="desktop-btn desktop-btn-sm desktop-btn-gold"
                        >
                          <Check size={13} />
                          <span>Approve</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDetailTarget(tgt)}
                        className="desktop-btn desktop-btn-sm desktop-btn-secondary"
                        title="View Detail"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Create Target (Admin only) */}
      {isCreateOpen && (
        <div className="desktop-modal-backdrop" data-testid="targets-create-modal">
          <div className="desktop-modal-box" style={{ maxWidth: '580px' }}>
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Create Studio Target</h3>
              <button
                type="button"
                className="desktop-modal-close"
                onClick={() => setIsCreateOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="desktop-modal-body">
              <div className="desktop-form-group">
                <label>Target Title *</label>
                <input
                  type="text"
                  className="desktop-form-input"
                  placeholder="e.g. Complete Ground Floor Electrical Layouts"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
              </div>

              <div className="desktop-form-group">
                <label>Description</label>
                <textarea
                  className="desktop-form-textarea"
                  rows={3}
                  placeholder="Coordinate with MEP consultant and finalize conduit drops..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                />
              </div>

              <div className="desktop-form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  className="desktop-form-input"
                  value={createDueDate}
                  onChange={(e) => setCreateDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="desktop-form-group">
                <label>Projects</label>
                {projects.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#686869', padding: '6px 0' }}>
                    No studio projects available.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {projects.map((p) => {
                      const picked = selectedProjectIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            setSelectedProjectIds((prev) =>
                              prev.includes(p.id)
                                ? prev.filter((id) => id !== p.id)
                                : [...prev, p.id],
                            )
                          }
                          className={`desktop-btn desktop-btn-sm ${
                            picked ? 'desktop-btn-gold' : 'desktop-btn-secondary'
                          }`}
                        >
                          {p.projectCode} — {p.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="desktop-form-group">
                <label>Assign Staff *</label>
                {staffDirectory.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#686869', padding: '6px 0' }}>
                    No active staff members loaded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {staffDirectory.map((s) => {
                      const picked = selectedStaffIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            setSelectedStaffIds((prev) =>
                              prev.includes(s.id)
                                ? prev.filter((id) => id !== s.id)
                                : [...prev, s.id],
                            )
                          }
                          className={`desktop-btn desktop-btn-sm ${
                            picked ? 'desktop-btn-gold' : 'desktop-btn-secondary'
                          }`}
                        >
                          {s.fullName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="desktop-modal-footer">
                <button
                  type="button"
                  className="desktop-btn desktop-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="desktop-btn desktop-btn-gold"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit Update (Staff) */}
      {submitTargetId && (
        <div className="desktop-modal-backdrop" data-testid="target-submit-modal">
          <div className="desktop-modal-box">
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Submit Deliverable Update</h3>
              <button
                type="button"
                className="desktop-modal-close"
                onClick={() => setSubmitTargetId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="desktop-modal-body">
              <div className="desktop-form-group">
                <label>Completion Notes &amp; Verification Details</label>
                <textarea
                  className="desktop-form-textarea"
                  data-testid="target-submit-notes"
                  rows={4}
                  placeholder="e.g. All DWG layouts finalized. Layer standards checked against studio guidelines..."
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="desktop-modal-footer">
              <button
                type="button"
                className="desktop-btn desktop-btn-secondary"
                onClick={() => setSubmitTargetId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="target-submit-confirm"
                disabled={!submitNotes.trim() || submitting}
                onClick={() => void handleConfirmSubmit()}
                className="desktop-btn desktop-btn-gold"
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Target Detail (Admin & Staff) */}
      {detailTarget && (
        <div className="desktop-modal-backdrop" data-testid="target-detail-modal">
          <div className="desktop-modal-box" style={{ maxWidth: '560px' }}>
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Target Detail</h3>
              <button
                type="button"
                className="desktop-modal-close"
                onClick={() => setDetailTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="desktop-modal-body">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #E1E1E4',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>
                    {detailTarget.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4A4A4C', marginTop: '4px' }}>
                    {detailTarget.assignedProjects?.map((p) => p.name || p.projectCode).join(', ') ||
                      'Studio Deliverable'}
                  </div>
                </div>
                {renderStatusBadge(detailTarget.status)}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F1F3', paddingBottom: '8px' }}>
                  <span style={{ color: '#686869' }}>Assigned To</span>
                  <span style={{ fontWeight: 500, color: '#151516' }}>
                    {detailTarget.assignedStaff?.map((s) => s.fullName).join(', ') || 'Unassigned'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F1F3', paddingBottom: '8px' }}>
                  <span style={{ color: '#686869' }}>Created By</span>
                  <span style={{ fontWeight: 500, color: '#151516' }}>{detailTarget.createdBy}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F1F3', paddingBottom: '8px' }}>
                  <span style={{ color: '#686869' }}>Due Date</span>
                  <span style={{ fontWeight: 500, color: '#151516' }}>
                    {formatDateLabel(detailTarget.dueDate)}
                  </span>
                </div>
                {detailTarget.approvedBy && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F1F3', paddingBottom: '8px' }}>
                    <span style={{ color: '#686869' }}>Approved By</span>
                    <span style={{ fontWeight: 500, color: '#087A48' }}>
                      {detailTarget.approvedBy}
                    </span>
                  </div>
                )}
              </div>

              {detailTarget.description && (
                <div className="desktop-form-group">
                  <label>Description</label>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #E1E1E4',
                      fontSize: '13px',
                      color: '#1D1D1F',
                      background: '#FAFAFA',
                    }}
                  >
                    {detailTarget.description}
                  </div>
                </div>
              )}

              {detailTarget.submissionNotes && (
                <div className="desktop-form-group">
                  <label>Submission Notes</label>
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #D1E9FF',
                      fontSize: '13px',
                      color: '#175CD3',
                      background: '#EFF8FF',
                    }}
                  >
                    {detailTarget.submissionNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="desktop-modal-footer" style={{ justifyContent: 'space-between' }}>
              <div>
                {isAdmin && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleDeleteTarget(detailTarget.id)}
                    className="desktop-btn desktop-btn-secondary"
                    style={{ color: '#D92D20' }}
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {isAdmin && detailTarget.status === 'SUBMITTED' && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleStatusTransition(detailTarget.id, 'IN_PROGRESS')}
                    className="desktop-btn desktop-btn-secondary"
                  >
                    <AlertTriangle size={14} />
                    <span>Request Update</span>
                  </button>
                )}
                {isAdmin && detailTarget.status !== 'COMPLETED' && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void handleStatusTransition(detailTarget.id, 'COMPLETED')}
                    className="desktop-btn desktop-btn-gold"
                  >
                    <Check size={14} />
                    <span>Approve &amp; Complete</span>
                  </button>
                )}
                {isStaff && detailTarget.status !== 'COMPLETED' && detailTarget.status !== 'SUBMITTED' && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      const id = detailTarget.id;
                      setDetailTarget(null);
                      handleOpenSubmit(id);
                    }}
                    className="desktop-btn desktop-btn-gold"
                  >
                    <Send size={14} />
                    <span>Update Work</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
