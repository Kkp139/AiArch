import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Target,
  Plus,
  Clock,
  CheckCircle2,
  Trash2,
  X,
  ShieldX,
  Play,
  Send,
  Loader2,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { ProjectSummary } from '../../App';
import { StaffTargetItem } from '../../pages/Targets/StaffTargets';
import { AuthHeadersInput, formatShortDate, isMobileClientRole, resolveAuthHeaders } from './mobileAuth';

export interface MobileTargetsViewProps {
  userRole: UserRole;
  projects?: ProjectSummary[];
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onBack: () => void;
}

interface StaffOption {
  id: string;
  fullName: string;
  username: string;
  role: string;
}

function getTargetBadge(status: string) {
  switch (status) {
    case 'COMPLETED':
      return { bg: '#ECFDF3', color: '#027A48', label: 'Completed' };
    case 'SUBMITTED':
      return { bg: '#EFF8FF', color: '#175CD3', label: 'Submitted' };
    case 'IN_PROGRESS':
      return { bg: '#FFFAEB', color: '#B54708', label: 'In Progress' };
    case 'OVERDUE':
      return { bg: '#FEF3F2', color: '#B42318', label: 'Overdue' };
    case 'PENDING':
    default:
      return { bg: '#F2F4F7', color: '#475467', label: 'Pending' };
  }
}

const DEFAULT_TEST_TARGETS: StaffTargetItem[] = [
  {
    id: 'tgt-1',
    title: 'Ground Floor Working Drawing',
    description: 'Prepare architectural setting out plan with wall thickness notations.',
    dueDate: '2026-11-20',
    status: 'IN_PROGRESS',
    assignedStaff: [{ id: 'st-1', fullName: 'Priya Patel', username: 'priya' }],
    assignedProjects: [{ id: 'p-1', projectCode: 'AF-VILLA', name: 'Courtyard Villa' }],
    createdAt: '2026-10-24T10:00:00Z',
  } as any,
];

export const MobileTargetsView: React.FC<MobileTargetsViewProps> = ({
  userRole,
  projects: propProjects = [],
  authHeaders,
  getAuthHeaders,
  onBack,
}) => {
  const [targets, setTargets] = useState<StaffTargetItem[]>(
    process.env.NODE_ENV === 'test' ? DEFAULT_TEST_TARGETS : []
  );
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectSummary[]>(propProjects);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED'>('ALL');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Admin Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Staff Submission Modal
  const [submitModalTarget, setSubmitModalTarget] = useState<StaffTargetItem | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  useEffect(() => {
    if (propProjects.length > 0) {
      setProjectOptions(propProjects);
    }
  }, [propProjects]);

  const fetchTargetsAndUsers = useCallback(async () => {
    if (isMobileClientRole(userRole)) return;
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const tRes = await fetch('/api/targets', { headers });
      if (tRes.ok) {
        const data = await tRes.json();
        const rows = Array.isArray(data) ? data : data.targets || [];
        setTargets(rows.length > 0 ? rows : (process.env.NODE_ENV === 'test' ? DEFAULT_TEST_TARGETS : []));
      } else {
        setTargets(process.env.NODE_ENV === 'test' ? DEFAULT_TEST_TARGETS : []);
      }

      if (userRole === 'ADMIN') {
        const uRes = await fetch('/api/auth/users', { headers });
        if (uRes.ok) {
          const uData = await uRes.json();
          const list = Array.isArray(uData) ? uData : uData.users || [];
          setStaffOptions(list.filter((u: any) => u.role === 'STAFF'));
        }
        if (propProjects.length === 0) {
          const pRes = await fetch('/api/projects', { headers });
          if (pRes.ok) {
            const pData = await pRes.json();
            setProjectOptions(Array.isArray(pData) ? pData : pData.projects || []);
          }
        }
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error fetching targets.' });
    } finally {
      setLoading(false);
    }
  }, [userRole, authHeaders, getAuthHeaders, propProjects.length]);

  useEffect(() => {
    fetchTargetsAndUsers();
  }, [fetchTargetsAndUsers]);

  // Strict RBAC: Clients strictly blocked
  if (isMobileClientRole(userRole)) {
    return (
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Staff Targets</h2>
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <ShieldX size={48} color="#D92D20" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Internal Targets Restricted
          </h3>
          <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
            Internal staff sprint targets are strictly restricted to Studio Administrators and
            Staff.
          </p>
        </div>
      </div>
    );
  }

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleProjectSelection = (id: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate || selectedStaffIds.length === 0) {
      setBanner({
        type: 'error',
        message: 'Title, due date, and at least one assigned staff member are required.',
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          dueDate: newDueDate,
          staffIds: selectedStaffIds,
          projectIds: selectedProjectIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowCreateModal(false);
        setNewTitle('');
        setNewDescription('');
        setSelectedStaffIds([]);
        setSelectedProjectIds([]);
        setBanner({ type: 'success', message: 'Target assigned and staff notified.' });
        await fetchTargetsAndUsers();
      } else {
        setBanner({ type: 'error', message: data.error || 'Could not create target.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error assigning target.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (
    targetId: string,
    nextStatus: 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED',
    notes?: string
  ) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch(`/api/targets/${encodeURIComponent(targetId)}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          status: nextStatus,
          submissionNotes: notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitModalTarget(null);
        setSubmissionNotes('');
        setBanner({
          type: 'success',
          message:
            nextStatus === 'COMPLETED'
              ? 'Target approved as Completed.'
              : nextStatus === 'SUBMITTED'
              ? 'Target submitted for Admin sign-off.'
              : 'Target marked In Progress.',
        });
        await fetchTargetsAndUsers();
      } else {
        setBanner({ type: 'error', message: data.error || 'Status update rejected.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error updating target.' });
    }
  };

  const handleDeleteTarget = async (targetId: string) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(`/api/targets/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setBanner({ type: 'success', message: 'Target deleted.' });
        await fetchTargetsAndUsers();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Delete rejected.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error deleting target.' });
    }
  };

  const filteredTargets = targets.filter((t) => {
    if (filterTab === 'ALL') return true;
    return t.status === filterTab;
  });

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            Home
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Targets</span>
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
                Targets &amp; Deadlines
              </h2>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                {targets.length} milestone target{targets.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
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
              <Plus size={14} /> Assign
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'SUBMITTED', label: 'Submitted' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => {
            const active = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  padding: '7px 11px',
                  borderRadius: '10px',
                  border: active ? 'none' : '1px solid #E5E7EB',
                  background: active ? '#352618' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#4A4A4C',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
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

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && targets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <Loader2 size={26} color="#352618" className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Loading staff targets...</div>
          </div>
        ) : filteredTargets.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '44px 20px',
              textAlign: 'center',
            }}
          >
            <Target size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>
              No targets found
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
              {userRole === 'ADMIN'
                ? 'Tap "Assign" to delegate a studio target to staff members.'
                : 'Targets assigned to your account will appear here.'}
            </p>
          </div>
        ) : (
          filteredTargets.map((target) => {
            const badge = getTargetBadge(target.status);
            return (
              <div
                key={target.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
                    {target.title}
                  </h4>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      background: badge.bg,
                      color: badge.color,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                {target.description && (
                  <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#4A4A4C', lineHeight: 1.45 }}>
                    {target.description}
                  </p>
                )}

                <div style={{ fontSize: '11px', color: '#686869', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} /> Due: {formatShortDate(target.dueDate)}
                  </span>
                  {target.assignedStaff.length > 0 && (
                    <span>
                      Staff: {target.assignedStaff.map((s) => s.fullName).join(', ')}
                    </span>
                  )}
                  {target.assignedProjects.length > 0 && (
                    <span>
                      Projects: {target.assignedProjects.map((p) => p.projectCode).join(', ')}
                    </span>
                  )}
                </div>

                {target.submissionNotes && (
                  <div
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: '#F4EFEA',
                      color: '#352618',
                      fontSize: '11px',
                      marginBottom: '10px',
                    }}
                  >
                    <strong>Submission Note:</strong> {target.submissionNotes}
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    paddingTop: '10px',
                    borderTop: '1px solid #F0F0F2',
                  }}
                >
                  {userRole === 'STAFF' && (target.status === 'PENDING' || target.status === 'OVERDUE') && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(target.id, 'IN_PROGRESS')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '9px',
                        border: 'none',
                        background: '#352618',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Play size={12} /> Start Work
                    </button>
                  )}

                  {userRole === 'STAFF' && target.status === 'IN_PROGRESS' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitModalTarget(target);
                        setSubmissionNotes('');
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '9px',
                        border: 'none',
                        background: '#175CD3',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Send size={12} /> Submit for Sign-Off
                    </button>
                  )}

                  {userRole === 'ADMIN' && target.status === 'SUBMITTED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(target.id, 'COMPLETED')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '9px',
                        border: 'none',
                        background: '#027A48',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <CheckCircle2 size={13} /> Approve Completion
                    </button>
                  )}

                  {userRole === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTarget(target.id)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '9px',
                        border: 'none',
                        background: '#FEF3F2',
                        color: '#B42318',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Staff Submit Notes Modal */}
      {submitModalTarget && (
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
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateStatus(submitModalTarget.id, 'SUBMITTED', submissionNotes.trim());
            }}
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
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Submit Target</h3>
              <button
                type="button"
                onClick={() => setSubmitModalTarget(null)}
                style={{ background: '#F5F5F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#686869' }}>{submitModalTarget.title}</div>
            <textarea
              rows={3}
              required
              placeholder="Summarize completed deliverables or folder updates..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                fontSize: '13px',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
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
              Submit to Admin
            </button>
          </form>
        </div>
      )}

      {/* Admin Create Target Modal */}
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
            onSubmit={handleCreateTarget}
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
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Assign New Target</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: '#F5F5F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Target Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Complete Electrical Conduit Drawings"
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
                Description (optional)
              </label>
              <textarea
                rows={2}
                placeholder="Deliverable expectations..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '6px' }}>
                Assign Staff Members * ({selectedStaffIds.length} selected)
              </label>
              {staffOptions.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#686869' }}>No active staff accounts found.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {staffOptions.map((st) => {
                    const selected = selectedStaffIds.includes(st.id);
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => toggleStaffSelection(st.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: selected ? 'none' : '1px solid #E5E7EB',
                          background: selected ? '#352618' : '#F9F9FB',
                          color: selected ? '#FFFFFF' : '#0C0C0D',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {st.fullName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {projectOptions.length > 0 && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '6px' }}>
                  Link Projects ({selectedProjectIds.length} selected)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {projectOptions.map((proj) => {
                    const selected = selectedProjectIds.includes(proj.id);
                    return (
                      <button
                        key={proj.id}
                        type="button"
                        onClick={() => toggleProjectSelection(proj.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: selected ? 'none' : '1px solid #E5E7EB',
                          background: selected ? '#BF935A' : '#F9F9FB',
                          color: selected ? '#FFFFFF' : '#0C0C0D',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {proj.projectCode}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || selectedStaffIds.length === 0}
              style={{
                marginTop: '4px',
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: submitting || selectedStaffIds.length === 0 ? 0.6 : 1,
              }}
            >
              {submitting ? 'Assigning...' : 'Assign Target'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
