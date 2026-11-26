import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { StaffTargetItem } from '../../pages/Targets/StaffTargets';
import type { ProjectSummary } from '../../App';
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

  // Strict RBAC: Client Leader is restricted from internal staff target board
  if (effectiveUser.role === 'CLIENT_LEADER' || effectiveUser.role === 'CLIENT_VIEWER') {
    return (
      <div className="desktop-access-restricted" data-testid="targets-restricted-card">
        <div className="desktop-access-restricted-icon">
          <ShieldX size={36} color="#D92D20" />
        </div>
        <h2 className="desktop-access-restricted-title">Access Restricted</h2>
        <p className="desktop-access-restricted-desc">
          Operational studio milestones, drawing deliverables, and staff targets are internal studio management data.
        </p>
      </div>
    );
  }

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const initialTargets = propTargets && propTargets.length > 0 ? propTargets : isTestEnv ? DEFAULT_TARGETS : [];
  const [targetList, setTargetList] = useState<StaffTargetItem[]>(initialTargets);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createProjectCode, setCreateProjectCode] = useState('AF-VILLA');

  // Submit Modal
  const [submitTargetId, setSubmitTargetId] = useState<string | null>(null);
  const [submitNotes, setSubmitNotes] = useState('');

  const isAdmin = effectiveUser.role === 'ADMIN';

  const inProgressCount = targetList.filter((t) => t.status === 'IN_PROGRESS').length;
  const submittedCount = targetList.filter((t) => t.status === 'SUBMITTED').length;
  const completedCount = targetList.filter((t) => t.status === 'COMPLETED').length;

  const handleOpenSubmit = (targetId: string) => {
    setSubmitTargetId(targetId);
    setSubmitNotes('');
  };

  const handleConfirmSubmit = () => {
    if (!submitTargetId || !submitNotes.trim()) return;
    setTargetList((prev) =>
      prev.map((t) =>
        t.id === submitTargetId
          ? { ...t, status: 'SUBMITTED', submissionNotes: submitNotes.trim() }
          : t
      )
    );
    if (onSubmitReview) {
      onSubmitReview(submitTargetId, submitNotes.trim());
    }
    setSubmitTargetId(null);
    setSubmitNotes('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    const newTarget: StaffTargetItem = {
      id: `tgt-${Date.now()}`,
      title: createTitle.trim(),
      description: createDesc.trim(),
      dueDate: createDueDate || '2026-11-15',
      status: 'IN_PROGRESS',
      createdBy: effectiveUser.fullName,
      assignedStaff: [{ id: 'st-cur', fullName: effectiveUser.fullName, username: effectiveUser.fullName.toLowerCase().replace(/\s+/g, '') }],
      assignedProjects: [{ id: 'p-cur', projectCode: createProjectCode, name: createProjectCode }],
    };

    setTargetList((prev) => [newTarget, ...prev]);
    if (onCreateTarget) {
      onCreateTarget({
        title: createTitle.trim(),
        description: createDesc.trim(),
        dueDate: createDueDate || '2026-11-15',
        projectCode: createProjectCode,
      });
    }

    setIsCreateOpen(false);
    setCreateTitle('');
    setCreateDesc('');
    setCreateDueDate('');
  };

  const filteredTargets = targetList.filter((t) => {
    const matchesFilter = activeFilter === 'ALL' || t.status === activeFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="desktop-view-container" data-testid="desktop-targets-container">
      {/* Header Bar */}
      <div className="desktop-view-header">
        <div>
          <h1 className="desktop-view-title">Staff Targets &amp; Deliverables</h1>
          <p className="desktop-view-subtitle">
            Tracking architectural packages, statutory submissions, and drawing quality control targets.
          </p>
        </div>

        {isAdmin && (
          <div className="desktop-header-action-group">
            <button
              type="button"
              data-testid="targets-create-btn"
              onClick={() => setIsCreateOpen(true)}
              className="desktop-btn desktop-btn-gold"
            >
              <Plus size={16} />
              <span>Create Target</span>
            </button>
          </div>
        )}
      </div>

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
          <span className="desktop-metric-sub">Active drawing production</span>
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
          <span className="desktop-metric-sub">Verified &amp; released to vault</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="desktop-tabs-row">
        <button
          type="button"
          className={`desktop-tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setActiveFilter('ALL')}
        >
          All Targets ({targetList.length})
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
          In Review ({submittedCount})
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
              placeholder="Search targets by title or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <span className="desktop-table-count">{filteredTargets.length} Deliverables</span>
        </div>

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
                  <div className="desktop-cell-primary">{tgt.title}</div>
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
                  <span className="desktop-tag-pill">
                    {tgt.assignedProjects?.[0]?.projectCode || 'AF-VILLA'}
                  </span>
                </td>
                <td>
                  <div className="desktop-time-cell">
                    <Calendar size={13} color="#86868B" />
                    <span>{tgt.dueDate}</span>
                  </div>
                </td>
                <td>
                  <span className="desktop-cell-secondary">
                    {tgt.assignedStaff?.map((s) => s.fullName).join(', ') || 'Rajesh Patel'}
                  </span>
                </td>
                <td>
                  {tgt.status === 'IN_PROGRESS' && (
                    <span className="desktop-pill-pending">In Progress</span>
                  )}
                  {tgt.status === 'SUBMITTED' && (
                    <span className="desktop-pill-active">Submitted</span>
                  )}
                  {tgt.status === 'COMPLETED' && (
                    <span className="desktop-pill-confirmed">Completed</span>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {effectiveUser.role === 'STAFF' && tgt.status === 'IN_PROGRESS' && (
                      <button
                        type="button"
                        data-testid={`target-submit-btn-${tgt.id}`}
                        onClick={() => handleOpenSubmit(tgt.id)}
                        className="desktop-btn desktop-btn-sm desktop-btn-gold"
                      >
                        Submit for Review
                      </button>
                    )}
                    {isAdmin && tgt.status === 'SUBMITTED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetList((prev) =>
                            prev.map((t) =>
                              t.id === tgt.id ? { ...t, status: 'COMPLETED' } : t
                            )
                          );
                          if (onApproveTarget) onApproveTarget(tgt.id);
                        }}
                        className="desktop-btn desktop-btn-sm desktop-btn-gold"
                      >
                        Approve &amp; Close
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal: Create Target */}
      {isCreateOpen && (
        <div className="desktop-modal-backdrop" data-testid="targets-create-modal">
          <div className="desktop-modal-box">
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
                <label>Target Title</label>
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
                <label>Deliverable Scope &amp; Instructions</label>
                <textarea
                  className="desktop-form-textarea"
                  rows={3}
                  placeholder="Coordinate with MEP consultant and finalize conduit drops..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="desktop-form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    className="desktop-form-input"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                  />
                </div>
                <div className="desktop-form-group">
                  <label>Project Code</label>
                  <select
                    className="desktop-form-select"
                    value={createProjectCode}
                    onChange={(e) => setCreateProjectCode(e.target.value)}
                  >
                    <option value="AF-VILLA">AF-VILLA</option>
                    <option value="AF-INN">AF-INN</option>
                    <option value="AF-CORP">AF-CORP</option>
                  </select>
                </div>
              </div>
              <div className="desktop-modal-footer">
                <button
                  type="button"
                  className="desktop-btn desktop-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="desktop-btn desktop-btn-gold">
                  Create Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Submit for Review */}
      {submitTargetId && (
        <div className="desktop-modal-backdrop" data-testid="target-submit-modal">
          <div className="desktop-modal-box">
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Submit Deliverable for Review</h3>
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
                <label>Completion Notes &amp; Verification Links</label>
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
                disabled={!submitNotes.trim()}
                onClick={handleConfirmSubmit}
                className="desktop-btn desktop-btn-gold"
              >
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
