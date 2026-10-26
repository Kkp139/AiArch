import React, { useState, useEffect, useCallback } from 'react';
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
  authHeaders: Record<string, string>;
  projects?: { id: string; projectCode: string; name: string }[];
}

export function StaffTargets({ userRole, authHeaders, projects = [] }: StaffTargetsProps) {
  const [targets, setTargets] = useState<StaffTargetItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [targetToSubmit, setTargetToSubmit] = useState<StaffTargetItem | null>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Create Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [staffUsers, setStaffUsers] = useState<{ id: string; fullName: string }[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTargets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/targets', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch (err) {
      console.error('Failed to load targets', err);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  // Load Staff users for Admin assignment
  useEffect(() => {
    if (userRole === 'ADMIN') {
      fetch('/api/auth/users', { headers: authHeaders })
        .then((res) => (res.ok ? res.json() : { users: [] }))
        .then((data) => {
          const staffList = (data.users || []).filter((u: any) => u.role === 'STAFF');
          setStaffUsers(staffList);
          if (staffList.length > 0 && selectedStaffIds.length === 0) {
            setSelectedStaffIds([staffList[0].id]);
          }
        })
        .catch((err) => console.error('Failed to load staff for targets', err));
    }
  }, [userRole, authHeaders]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const handleCreateTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || selectedStaffIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
          staffIds: selectedStaffIds,
          projectIds: selectedProjectIds,
        }),
      });

      if (res.ok) {
        setTitle('');
        setDescription('');
        setDueDate('');
        setIsCreateModalOpen(false);
        await fetchTargets();
      } else {
        const err = await res.json();
        alert(`Failed to create target: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Create target error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartTarget = async (id: string) => {
    try {
      const res = await fetch(`/api/targets/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      });
      if (res.ok) {
        await fetchTargets();
      } else {
        const err = await res.json();
        alert(`Cannot start target: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Start target error', err);
    }
  };

  const handleSubmitForReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetToSubmit) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/targets/${targetToSubmit.id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'SUBMITTED',
          submissionNotes: submissionNotes.trim() || undefined,
        }),
      });

      if (res.ok) {
        setIsSubmitModalOpen(false);
        setTargetToSubmit(null);
        setSubmissionNotes('');
        await fetchTargets();
      } else {
        const err = await res.json();
        alert(`Submission failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Submit for review error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/targets/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) {
        await fetchTargets();
      } else {
        const err = await res.json();
        alert(`Approval failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Approve target error', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          color: 'var(--accent-emerald)',
          label: 'Completed',
          icon: CheckCircle,
        };
      case 'OVERDUE':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          label: 'Overdue',
          icon: AlertTriangle,
        };
      case 'SUBMITTED':
        return {
          bg: 'rgba(59, 130, 246, 0.15)',
          color: 'var(--accent-blue)',
          label: 'Under Review',
          icon: Clock,
        };
      case 'IN_PROGRESS':
        return {
          bg: 'rgba(224, 169, 109, 0.15)',
          color: 'var(--accent-gold)',
          label: 'In Progress',
          icon: Play,
        };
      default:
        return {
          bg: 'rgba(148, 163, 184, 0.15)',
          color: 'var(--text-muted)',
          label: 'Pending',
          icon: Clock,
        };
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700 }}>
            Productivity & Output Governance
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
            Staff Weekly & Monthly Targets
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Milestone goals, deliverables review, and administrative output completion tracking.
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              backgroundColor: 'var(--accent-gold)',
              color: '#1A1D20',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Plus size={16} />
            Create Target
          </button>
        )}
      </div>

      {/* Target Cards */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading targets and output milestones...
        </div>
      ) : targets.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
          <Target size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            {userRole === 'STAFF' ? 'No targets currently assigned to your account.' : 'No productivity targets established yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {targets.map((t) => {
            const badge = getStatusBadge(t.status);
            const BadgeIcon = badge.icon;
            return (
              <div
                key={t.id}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: t.status === 'OVERDUE' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: badge.bg,
                        color: badge.color,
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <BadgeIcon size={14} />
                      {badge.label}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <Calendar size={13} />
                      Due: {t.dueDate}
                    </span>
                  </div>

                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Created by {t.createdBy}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    {t.title}
                  </h3>
                  {t.description && (
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Assignment badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <User size={14} style={{ color: 'var(--accent-gold)' }} />
                    Assigned: {t.assignedStaff.map((s) => s.fullName).join(', ') || 'Unassigned'}
                  </div>

                  {t.assignedProjects.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Briefcase size={14} style={{ color: 'var(--accent-blue)' }} />
                      Projects: {t.assignedProjects.map((p) => p.projectCode).join(', ')}
                    </div>
                  )}
                </div>

                {/* Submission note callout */}
                {t.submissionNotes && (
                  <div style={{ backgroundColor: 'var(--bg-surface)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid var(--accent-gold)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-gold)', textTransform: 'uppercase' }}>Staff Submission Note:</span>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{t.submissionNotes}</p>
                  </div>
                )}

                {/* Action Bar */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  {/* Staff start target */}
                  {userRole === 'STAFF' && t.status === 'PENDING' && (
                    <button
                      onClick={() => handleStartTarget(t.id)}
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--accent-gold)',
                        border: '1px solid var(--accent-gold)',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Play size={14} /> Start Working
                    </button>
                  )}

                  {/* Staff submit for review */}
                  {userRole === 'STAFF' && (t.status === 'IN_PROGRESS' || t.status === 'OVERDUE') && (
                    <button
                      onClick={() => {
                        setTargetToSubmit(t);
                        setIsSubmitModalOpen(true);
                      }}
                      style={{
                        backgroundColor: 'var(--accent-gold)',
                        color: '#1A1D20',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Send size={14} /> Submit for Review
                    </button>
                  )}

                  {/* Admin review approval */}
                  {userRole === 'ADMIN' && t.status === 'SUBMITTED' && (
                    <button
                      onClick={() => handleAdminApprove(t.id)}
                      style={{
                        backgroundColor: 'var(--accent-emerald)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ShieldCheck size={14} /> Approve & Mark Complete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Create Target Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Create Productivity Target
            </h2>

            <form onSubmit={handleCreateTarget} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Target Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Complete HVAC Layout for AF-VILLA"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Due Date *
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Assign to Staff *
                </label>
                <select
                  multiple
                  value={selectedStaffIds}
                  onChange={(e) => setSelectedStaffIds(Array.from(e.target.selectedOptions, (option) => option.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                  }}
                >
                  {staffUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Assign to Projects (Optional)
                </label>
                <select
                  multiple
                  value={selectedProjectIds}
                  onChange={(e) => setSelectedProjectIds(Array.from(e.target.selectedOptions, (option) => option.value))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                  }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.projectCode} — {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Description / Milestone Requirements
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail scope, expected output, and drafting guidelines..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#1A1D20',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Target'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Submit Modal */}
      {isSubmitModalOpen && targetToSubmit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '500px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Submit Target for Review
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              {targetToSubmit.title}
            </p>

            <form onSubmit={handleSubmitForReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Completion Summary & Notes
                </label>
                <textarea
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="Explain work completed, file locations, or notes for Admin review..."
                  rows={4}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#1A1D20',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
