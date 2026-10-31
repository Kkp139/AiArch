import React, { useState, useEffect } from 'react';
import { UserRole } from '../../context/AuthContext';
import { StaffTargetItem } from '../../pages/Targets/StaffTargets';
import {
  ChevronLeft,
  Target,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Send,
  Calendar,
  User,
  X,
  FolderKanban,
  Check,
} from 'lucide-react';
import './mobile.css';

export interface MobileTargetsViewProps {
  userRole: UserRole;
  authHeaders: Record<string, string>;
  projects?: { id: string; projectCode: string; name: string }[];
  onBack: () => void;
}

export const MobileTargetsView: React.FC<MobileTargetsViewProps> = ({
  userRole,
  authHeaders,
  projects = [],
  onBack,
}) => {
  const [targets, setTargets] = useState<StaffTargetItem[]>([
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
  ]);

  const [selectedTarget, setSelectedTarget] = useState<StaffTargetItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('AF-VILLA');
  const [newStaffName, setNewStaffName] = useState('Rajesh Patel');

  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const res = await fetch('/api/targets', { headers: authHeaders });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setTargets(data);
        }
      } catch {}
    };
    fetchRemote();
  }, [authHeaders]);

  const handleStartTarget = (id: string) => {
    setTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'IN_PROGRESS' } : t))
    );
    if (selectedTarget && selectedTarget.id === id) {
      setSelectedTarget({ ...selectedTarget, status: 'IN_PROGRESS' });
    }
  };

  const handleApproveTarget = (id: string) => {
    setTargets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: 'COMPLETED', completedAt: new Date().toISOString() } : t
      )
    );
    setSelectedTarget(null);
    alert('Target approved as COMPLETED.');
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarget) return;

    setTargets((prev) =>
      prev.map((t) =>
        t.id === selectedTarget.id
          ? { ...t, status: 'SUBMITTED', submissionNotes: submitNotes, submittedAt: new Date().toISOString() }
          : t
      )
    );
    setIsSubmitModalOpen(false);
    setSelectedTarget(null);
    setSubmitNotes('');
    alert('Target successfully submitted for Admin sign-off.');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTarget: StaffTargetItem = {
      id: `tgt-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      dueDate: newDueDate || new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      status: 'PENDING',
      createdBy: 'Admin',
      assignedStaff: [{ id: 'st-temp', fullName: newStaffName, username: newStaffName.toLowerCase().replace(' ', '') }],
      assignedProjects: [{ id: 'p-temp', projectCode: newProjectCode, name: newProjectCode }],
    };

    setTargets([newTarget, ...targets]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewDesc('');
  };

  const completedCount = targets.filter((t) => t.status === 'COMPLETED').length;
  const inProgressCount = targets.filter((t) => t.status === 'IN_PROGRESS').length;
  const submittedCount = targets.filter((t) => t.status === 'SUBMITTED').length;

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header matching Figma 405:21539 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Targets & Deadlines</h2>
        </div>
        {userRole === 'ADMIN' && (
          <button
            className="figma-primary-btn-sm"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Create</span>
          </button>
        )}
      </div>

      <div className="figma-subpage-body">
        {/* Metric Progress Summary (Figma: 405:4779) */}
        <div className="figma-attendance-metric-grid" style={{ marginBottom: '16px' }}>
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">Active</span>
            <span className="figma-att-metric-val" style={{ color: '#1D1D1F' }}>{targets.length}</span>
          </div>
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">In Progress</span>
            <span className="figma-att-metric-val" style={{ color: '#BF935A' }}>{inProgressCount}</span>
          </div>
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">Review</span>
            <span className="figma-att-metric-val" style={{ color: '#A35A13' }}>{submittedCount}</span>
          </div>
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">Done</span>
            <span className="figma-att-metric-val" style={{ color: '#087A48' }}>{completedCount}</span>
          </div>
        </div>

        {/* Target Cards List (Figma: 405:21539) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {targets.map((tgt) => {
            const isDone = tgt.status === 'COMPLETED';
            const isSub = tgt.status === 'SUBMITTED';
            const isProg = tgt.status === 'IN_PROGRESS';
            const projectName = tgt.assignedProjects[0]?.name || 'Villa Courtyard';

            return (
              <div
                key={tgt.id}
                className={`figma-target-card ${isDone ? 'completed' : ''}`}
                onClick={() => setSelectedTarget(tgt)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className="figma-target-project-tag">{projectName}</span>
                  <span
                    className={`figma-status-badge ${
                      isDone ? 'cleared' : isSub ? 'review' : isProg ? 'pending' : ''
                    }`}
                  >
                    {tgt.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="figma-target-title">{tgt.title}</h3>
                {tgt.description && <p className="figma-target-desc">{tgt.description}</p>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #F0F0F2', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="figma-avatar-xs">
                      {tgt.assignedStaff[0]?.fullName?.charAt(0) || 'S'}
                    </div>
                    <span style={{ fontSize: '12px', color: '#686869' }}>
                      {tgt.assignedStaff[0]?.fullName || 'Assigned Staff'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#BF935A', fontWeight: 600 }}>
                    <Calendar size={13} />
                    <span>{tgt.dueDate}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Details Bottom Sheet (Figma: 405:4860) */}
      {selectedTarget && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedTarget(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="figma-target-project-tag">
                {selectedTarget.assignedProjects[0]?.name || 'Project Target'}
              </span>
              <button onClick={() => setSelectedTarget(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 10px 0' }}>
              {selectedTarget.title}
            </h3>

            <p style={{ fontSize: '14px', color: '#4A4A4C', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              {selectedTarget.description || 'No description provided.'}
            </p>

            <div className="figma-receipt-divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '14px 0 20px 0', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#686869' }}>Assignee:</span>
                <span style={{ fontWeight: 600, color: '#0C0C0D' }}>
                  {selectedTarget.assignedStaff[0]?.fullName || 'Staff Member'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#686869' }}>Due Date:</span>
                <span style={{ fontWeight: 600, color: '#BF935A' }}>{selectedTarget.dueDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#686869' }}>Status:</span>
                <span className="figma-status-badge pending">{selectedTarget.status.replace('_', ' ')}</span>
              </div>
              {selectedTarget.submissionNotes && (
                <div style={{ background: '#F4EFEB', padding: '10px', borderRadius: '8px', color: '#352618', fontSize: '12px' }}>
                  <strong>Submission Note:</strong> {selectedTarget.submissionNotes}
                </div>
              )}
            </div>

            {/* Action Buttons based on Role & State */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {userRole === 'ADMIN' && selectedTarget.status === 'SUBMITTED' && (
                <button
                  className="figma-btn-gold-full"
                  onClick={() => handleApproveTarget(selectedTarget.id)}
                >
                  <CheckCircle2 size={18} />
                  <span>Approve & Sign-Off Target</span>
                </button>
              )}

              {selectedTarget.status === 'PENDING' && (
                <button
                  className="figma-btn-gold-full"
                  onClick={() => handleStartTarget(selectedTarget.id)}
                >
                  <Play size={18} />
                  <span>Start Work on Target</span>
                </button>
              )}

              {selectedTarget.status === 'IN_PROGRESS' && (
                <button
                  className="figma-btn-gold-full"
                  onClick={() => setIsSubmitModalOpen(true)}
                >
                  <Send size={18} />
                  <span>Submit for Review</span>
                </button>
              )}

              <button className="figma-btn-secondary-full" onClick={() => setSelectedTarget(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit for Review Modal */}
      {isSubmitModalOpen && (
        <div className="figma-bottom-sheet-overlay" style={{ zIndex: 110 }} onClick={() => setIsSubmitModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px 0', color: '#0C0C0D' }}>
              Submit Target for Review
            </h3>
            <p style={{ fontSize: '13px', color: '#686869', margin: '0 0 14px 0' }}>
              Provide handover notes or drawing sheet references for the administrator.
            </p>
            <form onSubmit={handleSubmitReview}>
              <textarea
                required
                rows={4}
                placeholder="e.g. Completed CAD drawing package v2.1 uploaded to Site Drawings folder..."
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                className="figma-modal-textarea"
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsSubmitModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Submit Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Create Target Modal (Figma: 405:21474) */}
      {isCreateModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Create Staff Target</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Target Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Layout Package"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Assignee</label>
                <select
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="figma-form-input"
                >
                  <option value="Rajesh Patel">Rajesh Patel (Architect)</option>
                  <option value="Sonu Sharma">Sonu Sharma (BIM Lead)</option>
                  <option value="Ananya Roy">Ananya Roy (Interior Designer)</option>
                </select>
              </div>

              <div>
                <label className="figma-form-label">Project</label>
                <select
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  className="figma-form-input"
                >
                  <option value="AF-VILLA">Courtyard Villa (AF-VILLA)</option>
                  <option value="AF-INN">Artilla Inn (AF-INN)</option>
                  <option value="AF-CORP">Zenith HQ (AF-CORP)</option>
                </select>
              </div>

              <div>
                <label className="figma-form-label">Due Date</label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Target Description</label>
                <textarea
                  rows={3}
                  placeholder="Scope of work, required deliverable sheets..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Create Target
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

