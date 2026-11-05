import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { StaffTargetItem } from '../../pages/Targets/StaffTargets';
import {
  Target,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Send,
  Calendar,
  User,
  X,
  ShieldX,
  Search,
  Filter,
  Check,
} from 'lucide-react';
import './desktop.css';

export interface DesktopTargetsViewProps {
  user: {
    fullName: string;
    role: UserRole;
    email?: string;
  };
  targets?: StaffTargetItem[];
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

export const DesktopTargetsView: React.FC<DesktopTargetsViewProps> = ({
  user,
  targets: propTargets = DEFAULT_TARGETS,
  onCreateTarget,
  onSubmitReview,
  onApproveTarget,
}) => {
  // Strict RBAC: Client Leader is restricted from internal staff target board
  if (user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER') {
    return (
      <div className="desktop-access-restricted" data-testid="targets-restricted-card">
        <div className="desktop-access-restricted-icon">
          <ShieldX size={36} color="#D92D20" />
        </div>
        <h2 className="desktop-access-restricted-title">Access Restricted</h2>
        <p className="desktop-access-restricted-desc">
          Staff deliverables and milestone targets are internal studio operational objectives managed by architects and engineers.
        </p>
      </div>
    );
  }

  const [targetsList, setTargetsList] = useState<StaffTargetItem[]>(propTargets);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('2026-11-10');
  const [newProject, setNewProject] = useState('AF-VILLA');

  const [submittingTarget, setSubmittingTarget] = useState<StaffTargetItem | null>(null);
  const [submitNotes, setSubmitNotes] = useState('');

  const isAdmin = user.role === 'ADMIN';

  const inProgressCount = targetsList.filter((t) => t.status === 'IN_PROGRESS').length;
  const submittedCount = targetsList.filter((t) => t.status === 'SUBMITTED').length;
  const completedCount = targetsList.filter((t) => t.status === 'COMPLETED').length;

  const filteredTargets = targetsList.filter((t) => {
    const matchesFilter = activeFilter === 'ALL' || t.status === activeFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedStaff?.[0]?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assignedProjects?.[0]?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreateSubmit = () => {
    if (!newTitle.trim()) return;
    const newTgt: StaffTargetItem = {
      id: `tgt-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      dueDate: newDueDate,
      status: 'IN_PROGRESS',
      createdBy: user.fullName,
      assignedStaff: [{ id: 'st-new', fullName: 'Rajesh Patel', username: 'rajesh' }],
      assignedProjects: [{ id: 'p-new', projectCode: newProject, name: newProject }],
    };

    setTargetsList((prev) => [newTgt, ...prev]);
    if (onCreateTarget) {
      onCreateTarget({
        title: newTitle,
        description: newDesc,
        dueDate: newDueDate,
        projectCode: newProject,
      });
    }

    setNewTitle('');
    setNewDesc('');
    setIsCreateModalOpen(false);
  };

  const handleConfirmSubmitReview = () => {
    if (!submittingTarget) return;
    setTargetsList((prev) =>
      prev.map((t) =>
        t.id === submittingTarget.id
          ? { ...t, status: 'SUBMITTED', submissionNotes: submitNotes }
          : t
      )
    );

    if (onSubmitReview) {
      onSubmitReview(submittingTarget.id, submitNotes);
    }

    setSubmittingTarget(null);
    setSubmitNotes('');
  };

  const handleApprove = (targetId: string) => {
    setTargetsList((prev) =>
      prev.map((t) =>
        t.id === targetId ? { ...t, status: 'COMPLETED', completedAt: new Date().toISOString() } : t
      )
    );
    if (onApproveTarget) {
      onApproveTarget(targetId);
    }
    alert('Target signed off and marked completed by Studio Admin.');
  };

  return (
    <div className="desktop-view-container" data-testid="desktop-targets-container">
      {/* Header Bar */}
      <div className="desktop-view-header">
        <div>
          <h1 className="desktop-view-title">Staff Deliverables & Targets</h1>
          <p className="desktop-view-subtitle">
            Sprint milestones, drafting deadlines, and architectural peer-review workflows.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            data-testid="targets-create-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="desktop-btn desktop-btn-gold"
          >
            <Plus size={16} />
            <span>Create Target</span>
          </button>
        )}
      </div>

      {/* 4 Summary Metrics Cards */}
      <div className="desktop-metrics-grid">
        <div className="desktop-metric-card" data-testid="targets-metric-total">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Active Targets</span>
            <div className="desktop-metric-icon-wrap">
              <Target size={18} color="#0C0C0D" />
            </div>
          </div>
          <div className="desktop-metric-value">{targetsList.length}</div>
          <span className="desktop-metric-sub">Studio sprint total</span>
        </div>

        <div className="desktop-metric-card" data-testid="targets-metric-in-progress">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">In Progress</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#FEF0C7' }}>
              <Clock size={18} color="#B54708" />
            </div>
          </div>
          <div className="desktop-metric-value">{inProgressCount}</div>
          <span className="desktop-metric-sub">Active drafting</span>
        </div>

        <div className="desktop-metric-card" data-testid="targets-metric-submitted">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Submitted for Review</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#EFF8FF' }}>
              <Play size={18} color="#175CD3" />
            </div>
          </div>
          <div className="desktop-metric-value">{submittedCount}</div>
          <span className="desktop-metric-sub">Awaiting admin review</span>
        </div>

        <div className="desktop-metric-card" data-testid="targets-metric-completed">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Completed</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#E8F8EE' }}>
              <CheckCircle2 size={18} color="#087A48" />
            </div>
          </div>
          <div className="desktop-metric-value">{completedCount}</div>
          <span className="desktop-metric-sub">Signed off by Lead</span>
        </div>
      </div>

      {/* Targets Table Card */}
      <div className="desktop-table-card" data-testid="targets-data-table">
        <div className="desktop-table-header-tools">
          <div className="desktop-tabs-bar" style={{ marginBottom: 0, borderBottom: 'none' }}>
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`desktop-tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
            >
              All ({targetsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('IN_PROGRESS')}
              className={`desktop-tab-btn ${activeFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('SUBMITTED')}
              className={`desktop-tab-btn ${activeFilter === 'SUBMITTED' ? 'active' : ''}`}
            >
              Submitted ({submittedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('COMPLETED')}
              className={`desktop-tab-btn ${activeFilter === 'COMPLETED' ? 'active' : ''}`}
            >
              Completed ({completedCount})
            </button>
          </div>

          <div className="desktop-search-input-wrap">
            <Search size={16} className="desktop-search-icon" />
            <input
              type="text"
              placeholder="Search deliverables..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="desktop-search-input"
            />
          </div>
        </div>

        <table className="desktop-data-table">
          <thead>
            <tr>
              <th>Target Title & Scope</th>
              <th>Assigned Staff</th>
              <th>Project</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTargets.map((target) => (
              <tr key={target.id}>
                <td style={{ maxWidth: '340px' }}>
                  <div className="desktop-cell-primary">{target.title}</div>
                  <div className="desktop-cell-secondary" style={{ fontSize: '12px', marginTop: '2px' }}>
                    {target.description}
                  </div>
                  {target.submissionNotes && (
                    <div className="desktop-target-submission-pill">
                      Note: {target.submissionNotes}
                    </div>
                  )}
                </td>
                <td>
                  <div className="desktop-user-cell">
                    <User size={14} color="#BF935A" />
                    <span className="desktop-cell-primary">
                      {target.assignedStaff?.[0]?.fullName || 'Unassigned'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="desktop-tag-pill">
                    {target.assignedProjects?.[0]?.projectCode || 'AF-VILLA'}
                  </span>
                </td>
                <td>
                  <div className="desktop-time-cell">
                    <Calendar size={13} color="#86868B" />
                    <span>{target.dueDate}</span>
                  </div>
                </td>
                <td>
                  {target.status === 'IN_PROGRESS' && (
                    <span className="desktop-pill-pending">In Progress</span>
                  )}
                  {target.status === 'SUBMITTED' && (
                    <span className="desktop-pill-revision">Under Review</span>
                  )}
                  {target.status === 'COMPLETED' && (
                    <span className="desktop-pill-confirmed">Completed</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Staff action: Submit for review */}
                    {!isAdmin && target.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        data-testid={`target-submit-btn-${target.id}`}
                        className="desktop-btn desktop-btn-sm desktop-btn-gold"
                        onClick={() => setSubmittingTarget(target)}
                      >
                        Submit
                      </button>
                    )}

                    {/* Admin action: Approve & sign off */}
                    {isAdmin && target.status === 'SUBMITTED' && (
                      <button
                        type="button"
                        className="desktop-btn desktop-btn-sm desktop-btn-gold"
                        onClick={() => handleApprove(target.id)}
                      >
                        Sign-off
                      </button>
                    )}

                    {target.status === 'COMPLETED' && (
                      <span className="desktop-cell-secondary" style={{ fontSize: '12px' }}>
                        Signed Off
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Admin Create Target */}
      {isCreateModalOpen && (
        <div className="desktop-modal-backdrop" data-testid="targets-create-modal">
          <div className="desktop-modal-box">
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Create Deliverable Target</h3>
              <button
                type="button"
                className="desktop-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="desktop-modal-body">
              <div className="desktop-form-group">
                <label>Target Title</label>
                <input
                  type="text"
                  className="desktop-form-input"
                  placeholder="e.g. Electrical Conduit Layout Drawing Package"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="desktop-form-group">
                <label>Target Scope & Architectural Instructions</label>
                <textarea
                  className="desktop-form-textarea"
                  rows={3}
                  placeholder="Detail coordinate dimensions, MEP offsets, elevation callouts..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="desktop-form-group">
                  <label>Assigned Project</label>
                  <select
                    className="desktop-form-select"
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                  >
                    <option value="AF-VILLA">Courtyard Villa (AF-VILLA)</option>
                    <option value="AF-INN">Artilla Inn (AF-INN)</option>
                    <option value="AF-CORP">Zenith HQ (AF-CORP)</option>
                  </select>
                </div>
                <div className="desktop-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="desktop-form-input"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="desktop-modal-footer">
              <button
                type="button"
                className="desktop-btn desktop-btn-secondary"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="desktop-btn desktop-btn-gold"
                disabled={!newTitle.trim()}
                onClick={handleCreateSubmit}
              >
                <Plus size={14} style={{ marginRight: '6px' }} />
                Create Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Staff Submit For Review */}
      {submittingTarget && (
        <div className="desktop-modal-backdrop" data-testid="target-submit-modal">
          <div className="desktop-modal-box">
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Submit Deliverable for Review</h3>
              <button
                type="button"
                className="desktop-modal-close"
                onClick={() => setSubmittingTarget(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="desktop-modal-body">
              <p style={{ fontSize: '13.5px', color: 'var(--desk-text-secondary)', marginBottom: '16px' }}>
                Submitting <strong style={{ color: 'var(--desk-text-primary)' }}>{submittingTarget.title}</strong> for Principal Architect sign-off.
              </p>
              <div className="desktop-form-group">
                <label>Completion Notes & Vault Reference</label>
                <textarea
                  data-testid="target-submit-notes"
                  className="desktop-form-textarea"
                  rows={4}
                  placeholder="State sheets completed, folder uploaded into vault, drawing numbers..."
                  value={submitNotes}
                  onChange={(e) => setSubmitNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="desktop-modal-footer">
              <button
                type="button"
                className="desktop-btn desktop-btn-secondary"
                onClick={() => setSubmittingTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="target-submit-confirm"
                className="desktop-btn desktop-btn-gold"
                onClick={handleConfirmSubmitReview}
              >
                <Check size={14} style={{ marginRight: '6px' }} />
                Submit to Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
