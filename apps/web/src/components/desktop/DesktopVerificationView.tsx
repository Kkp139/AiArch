import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { VerificationItem, VerificationStatus } from '../../pages/Verification/VerificationList';
import {
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Search,
  Plus,
  RotateCcw,
  Stamp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Layers,
  ChevronRight,
  FileText,
  User,
  Clock,
  Send,
  Upload,
} from 'lucide-react';
import './desktop.css';

export interface DesktopVerificationViewProps {
  userRole: UserRole;
  projectCode?: string;
  items?: VerificationItem[];
  onApprove?: (id: string) => void;
  onRequestRevision?: (id: string, notes: string) => void;
  onSubmitDrawing?: (drawing: any) => void;
}

export const DesktopVerificationView: React.FC<DesktopVerificationViewProps> = ({
  userRole,
  projectCode = 'AF-VILLA',
  items: propItems,
  onApprove,
  onRequestRevision,
  onSubmitDrawing,
}) => {
  // 1. CLIENT ACCESS GATE: Verification is an internal studio workflow (Admin & Staff ONLY)
  if (userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER') {
    return (
      <div className="desk-restricted-card" data-testid="verification-client-restricted">
        <div className="desk-restricted-icon-box">
          <ShieldAlert size={36} style={{ color: 'var(--desk-gold)' }} />
        </div>
        <h2 className="desk-restricted-title">Internal Studio Verification Workflow</h2>
        <p className="desk-restricted-desc">
          Drawing Technical Verification and Architectural Seal Stamping are internal studio governance
          processes restricted to Admin and Staff Architects.
        </p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN';
  const isStaff = userRole === 'STAFF';

  const defaultVerificationQueue: VerificationItem[] = [
    {
      id: 'ver-101',
      drawingTitle: 'Ground Floor Setting Out Geometry & Column Centerlines',
      category: '01 Site Drawings & Topographic Layout',
      revisionNumber: 2,
      status: 'PENDING_APPROVAL',
      submittedAt: '2026-11-04T10:30:00Z',
      submittedBy: 'Rajesh Patel (Architect)',
      adminNotes: '',
    },
    {
      id: 'ver-102',
      drawingTitle: 'Courtyard Reflecting Pool Hydraulic Drainage Sump Section',
      category: '08 Plumbing & Drainage Schematics',
      revisionNumber: 1,
      status: 'PENDING_REVIEW',
      submittedAt: '2026-11-03T16:00:00Z',
      submittedBy: 'Karan Dave (MEP Lead)',
    },
    {
      id: 'ver-103',
      drawingTitle: 'Perimeter Boundary Wall Concrete Footing Schedule',
      category: '07 Civil Footing & Column Layouts',
      revisionNumber: 3,
      status: 'APPROVED',
      submittedAt: '2026-11-01T09:15:00Z',
      submittedBy: 'Sonu Sharma (BIM Lead)',
      adminNotes: 'Verified and signed with architectural seal.',
    },
    {
      id: 'ver-104',
      drawingTitle: 'Master Bedroom Smoked Oak Wardrobe Joinery Details',
      category: '15 Architectural Joinery & Element Details',
      revisionNumber: 1,
      status: 'REVISION_REQUIRED',
      submittedAt: '2026-10-31T14:40:00Z',
      submittedBy: 'Priya Mehta (Staff)',
      feedbackNote: 'Clearance between sliding wardrobe door and AC plenum is inadequate.',
    },
  ];

  const [queue, setQueue] = useState<VerificationItem[]>(propItems || defaultVerificationQueue);
  const [selectedItem, setSelectedItem] = useState<VerificationItem>(queue[0]);
  const [selectedRevision, setSelectedRevision] = useState(`Rev 0${queue[0]?.revisionNumber || 1}`);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  // Review Checklist State
  const [checklist, setChecklist] = useState({
    gridAlignment: true,
    dimensionsVerified: true,
    wallOpeningsChecked: false,
    mepClearance: true,
    codeCompliance: true,
  });

  // Modals
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Submit Drawing Form (Staff)
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('01 Site Drawings & Topographic Layout');
  const [newRevision, setNewRevision] = useState(1);
  const [newStaffNotes, setNewStaffNotes] = useState('');

  const filteredQueue = queue.filter(
    (item) =>
      item.drawingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectDrawing = (item: VerificationItem) => {
    setSelectedItem(item);
    setSelectedRevision(`Rev 0${item.revisionNumber}`);
  };

  const handleApproveSeal = () => {
    if (!selectedItem) return;

    setQueue((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              status: 'APPROVED',
              adminNotes: 'Officially certified with Studio Architectural Seal.',
            }
          : item
      )
    );

    setSelectedItem((prev) => ({
      ...prev,
      status: 'APPROVED',
      adminNotes: 'Officially certified with Studio Architectural Seal.',
    }));

    if (onApprove) onApprove(selectedItem.id);
  };

  const handleConfirmRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !revisionFeedback.trim()) return;

    setQueue((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              status: 'REVISION_REQUIRED',
              feedbackNote: revisionFeedback.trim(),
            }
          : item
      )
    );

    setSelectedItem((prev) => ({
      ...prev,
      status: 'REVISION_REQUIRED',
      feedbackNote: revisionFeedback.trim(),
    }));

    if (onRequestRevision) onRequestRevision(selectedItem.id, revisionFeedback.trim());

    setIsRevisionModalOpen(false);
    setRevisionFeedback('');
  };

  const handleStaffSubmitDrawing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newDrawing: VerificationItem = {
      id: `ver-${Date.now()}`,
      drawingTitle: newTitle.trim(),
      category: newCategory,
      revisionNumber: Number(newRevision),
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
      submittedBy: 'Current Staff Architect',
    };

    setQueue((prev) => [newDrawing, ...prev]);
    setSelectedItem(newDrawing);
    if (onSubmitDrawing) onSubmitDrawing(newDrawing);

    setIsSubmitModalOpen(false);
    setNewTitle('');
    setNewStaffNotes('');
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="desk-status-pill approved" data-testid="status-pill-approved">
            <CheckCircle2 size={12} /> Approved & Sealed
          </span>
        );
      case 'PENDING_APPROVAL':
      case 'PENDING_REVIEW':
        return (
          <span className="desk-status-pill pending" data-testid="status-pill-pending">
            <AlertCircle size={12} /> Pending Review
          </span>
        );
      case 'REVISION_REQUIRED':
      case 'REVISION_REQUESTED':
        return (
          <span className="desk-status-pill revision" data-testid="status-pill-revision">
            <RotateCcw size={12} /> Revision Required
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="desk-verification-view" data-testid="desktop-verification-view">
      {/* Top Header */}
      <div className="desk-verification-header">
        <div>
          <h1 className="desk-page-title">Drawing Verification & Architectural Seal</h1>
          <p className="desk-page-subtitle">
            Master-Detail Verification Inspector • Statutory Coordinates & Official Studio Stamp
          </p>
        </div>

        <div className="desk-header-actions">
          {isStaff && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={() => setIsSubmitModalOpen(true)}
              data-testid="staff-submit-drawing-btn"
            >
              <Plus size={16} />
              <span>Submit Drawing for Verification</span>
            </button>
          )}
        </div>
      </div>

      {/* 3-Column Master-Detail Layout: Left Queue (300px) + Center Viewport (Flex) + Right Inspector (400px) */}
      <div className="desk-verif-master-detail" data-testid="master-detail-split">
        {/* 1. Left Queue Panel: Drawings Awaiting Verification */}
        <div className="desk-verif-queue" data-testid="verification-queue-column">
          <div className="desk-queue-header">
            <span style={{ fontWeight: 700, fontSize: '13.5px' }}>Verification Queue</span>
            <span className="desk-badge-count">{queue.length}</span>
          </div>

          <div className="desk-queue-search">
            <Search size={15} style={{ color: 'var(--desk-text-muted)' }} />
            <input
              type="text"
              placeholder="Search drawings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="queue-search-input"
            />
          </div>

          <div className="desk-queue-list">
            {filteredQueue.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`desk-queue-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectDrawing(item)}
                  data-testid={`queue-item-${item.id}`}
                >
                  <div className="desk-queue-item-top">
                    <span className="desk-rev-tag">Rev 0{item.revisionNumber}</span>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="desk-queue-item-title">{item.drawingTitle}</div>
                  <div className="desk-queue-item-meta">
                    <span>{item.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Center CAD/PDF Blueprint Viewport with Revision Selector */}
        <div className="desk-verif-viewport" data-testid="verification-canvas-column">
          {/* Viewport Top Toolbar with Revision Selector */}
          <div className="desk-verif-toolbar">
            <div className="desk-rev-selector-group">
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--desk-text-muted)' }}>
                Active Revision:
              </span>
              <button
                type="button"
                className={`desk-rev-btn ${selectedRevision === 'Rev 01' ? 'active' : ''}`}
                onClick={() => setSelectedRevision('Rev 01')}
                data-testid="rev-select-01"
              >
                Rev 01
              </button>
              <button
                type="button"
                className={`desk-rev-btn ${selectedRevision === 'Rev 02' ? 'active' : ''}`}
                onClick={() => setSelectedRevision('Rev 02')}
                data-testid="rev-select-02"
              >
                Rev 02
              </button>
              {selectedItem?.revisionNumber >= 3 && (
                <button
                  type="button"
                  className={`desk-rev-btn ${selectedRevision === 'Rev 03' ? 'active' : ''}`}
                  onClick={() => setSelectedRevision('Rev 03')}
                  data-testid="rev-select-03"
                >
                  Rev 03
                </button>
              )}
            </div>

            <div className="desk-zoom-tools">
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={() => setZoomLevel((z) => Math.min(z + 25, 250))}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{zoomLevel}%</span>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
            </div>
          </div>

          {/* High-Resolution Blueprint CAD Viewport */}
          <div className="desk-verif-canvas-wrap">
            <div
              className="desk-verif-paper"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            >
              <div className="desk-cad-border">
                <div className="desk-cad-grid-pattern" />
                <div className="desk-cad-drawing-content">
                  <div className="desk-cad-watermark">
                    A&F DESIGN STUDIO • {selectedItem?.category.toUpperCase()}
                  </div>

                  {/* Official Architectural Seal Stamp Display (when Approved) */}
                  {selectedItem?.status === 'APPROVED' && (
                    <div className="desk-official-seal" data-testid="official-studio-seal">
                      <div className="seal-outer-circle">
                        <div className="seal-inner-circle">
                          <Stamp size={28} />
                          <div className="seal-text-title">A&F DESIGN STUDIO</div>
                          <div className="seal-text-sub">APPROVED FOR CONSTRUCTION</div>
                          <div className="seal-text-date">
                            SEAL: ARCH-IND-2026 • {new Date().toISOString().split('T')[0]}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="desk-cad-schematic-mock">
                    <div className="desk-cad-axis-x" />
                    <div className="desk-cad-axis-y" />
                    <div className="desk-cad-room room-living">{selectedItem?.drawingTitle}</div>
                  </div>
                </div>

                {/* Blueprint Title Block */}
                <div className="desk-cad-title-block">
                  <div className="title-block-row header">
                    <span>A&F DESIGN</span>
                    <span>{projectCode}</span>
                  </div>
                  <div className="title-block-row">
                    <span>STATUS: {selectedItem?.status}</span>
                    <span>REV: {selectedRevision}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Right Inspector Panel (400px persistent width) */}
        <div className="desk-verif-inspector" data-testid="verification-inspector-column">
          <div className="desk-inspector-header">
            <span style={{ fontWeight: 700, fontSize: '14px' }}>Verification Inspector</span>
            {getStatusBadge(selectedItem.status)}
          </div>

          <div className="desk-inspector-scroll">
            <div className="desk-meta-group">
              <span className="desk-meta-label">Drawing Sheet Title</span>
              <span className="desk-meta-value" style={{ fontWeight: 600 }}>
                {selectedItem.drawingTitle}
              </span>
            </div>

            <div className="desk-meta-group">
              <span className="desk-meta-label">Vault Category</span>
              <span className="desk-meta-value">{selectedItem.category}</span>
            </div>

            <div className="desk-meta-group">
              <span className="desk-meta-label">Submitted By & Date</span>
              <span className="desk-meta-value">
                {selectedItem.submittedBy || 'Studio Architect'} •{' '}
                {new Date(selectedItem.submittedAt).toLocaleDateString()}
              </span>
            </div>

            {selectedItem.feedbackNote && (
              <div className="desk-feedback-box">
                <span className="feedback-label">Revision Instructions:</span>
                <p className="feedback-text">{selectedItem.feedbackNote}</p>
              </div>
            )}

            {/* Verification Checklist */}
            <div className="desk-checklist-box">
              <span className="desk-meta-label" style={{ marginBottom: '10px', display: 'block' }}>
                Architectural Technical Checklist
              </span>
              <label className="desk-checklist-item">
                <input
                  type="checkbox"
                  checked={checklist.gridAlignment}
                  onChange={(e) => setChecklist({ ...checklist, gridAlignment: e.target.checked })}
                />
                <span>Grid & Centerline Coordinates Verified</span>
              </label>
              <label className="desk-checklist-item">
                <input
                  type="checkbox"
                  checked={checklist.dimensionsVerified}
                  onChange={(e) => setChecklist({ ...checklist, dimensionsVerified: e.target.checked })}
                />
                <span>Dimension Strings & Datum Levels Reconciled</span>
              </label>
              <label className="desk-checklist-item">
                <input
                  type="checkbox"
                  checked={checklist.wallOpeningsChecked}
                  onChange={(e) => setChecklist({ ...checklist, wallOpeningsChecked: e.target.checked })}
                />
                <span>Fenestration & Lintel Heights Checked</span>
              </label>
              <label className="desk-checklist-item">
                <input
                  type="checkbox"
                  checked={checklist.mepClearance}
                  onChange={(e) => setChecklist({ ...checklist, mepClearance: e.target.checked })}
                />
                <span>MEP Sleeve & Plumbing Route Clearance</span>
              </label>
              <label className="desk-checklist-item">
                <input
                  type="checkbox"
                  checked={checklist.codeCompliance}
                  onChange={(e) => setChecklist({ ...checklist, codeCompliance: e.target.checked })}
                />
                <span>Municipal Fire & NBC Code Compliant</span>
              </label>
            </div>
          </div>

          {/* Admin Action Bar (Apply Studio Seal / Request Revision) */}
          {isAdmin && (
            <div className="desk-inspector-actions" data-testid="admin-action-bar">
              <button
                type="button"
                className="desk-btn desk-btn-primary"
                onClick={handleApproveSeal}
                data-testid="approve-seal-btn"
                title="Apply Official Architectural Seal"
              >
                <Stamp size={16} />
                <span>Approve & Apply Studio Seal</span>
              </button>

              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setIsRevisionModalOpen(true)}
                data-testid="request-revision-btn"
                title="Request Technical Revision"
              >
                <RotateCcw size={15} />
                <span>Request Revision</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Revision Modal Dialog */}
      {isRevisionModalOpen && (
        <div className="desk-modal-overlay" data-testid="revision-modal">
          <div className="desk-modal-dialog">
            <div className="desk-modal-header">
              <h2 className="desk-modal-title">Request Drawing Revision</h2>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsRevisionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRevision} className="desk-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--desk-text-secondary)', marginBottom: '12px' }}>
                Item: <strong>{selectedItem?.drawingTitle}</strong> ({selectedRevision})
              </p>

              <div className="desk-form-group">
                <label>Technical Revision Notes & Required Fixes</label>
                <textarea
                  className="desk-form-textarea"
                  rows={4}
                  placeholder="Specify coordinate corrections, conduit conflicts, or dimension fixes..."
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  required
                  data-testid="textarea-revision-feedback"
                />
              </div>

              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setIsRevisionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="desk-btn desk-btn-primary"
                  style={{ background: 'var(--desk-danger)', borderColor: 'var(--desk-danger)' }}
                  data-testid="submit-revision-btn"
                >
                  Submit Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Submit Drawing Centered Modal Dialog */}
      {isSubmitModalOpen && (
        <div className="desk-modal-overlay" data-testid="staff-submit-drawing-modal">
          <div className="desk-modal-dialog">
            <div className="desk-modal-header">
              <h2 className="desk-modal-title">Submit Drawing for Verification</h2>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsSubmitModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStaffSubmitDrawing} className="desk-modal-body">
              <div className="desk-form-group">
                <label>Drawing Sheet Title</label>
                <input
                  type="text"
                  className="desk-form-input"
                  placeholder="e.g. Reflected False Ceiling Cove Details"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  data-testid="input-submit-title"
                />
              </div>

              <div className="desk-form-group">
                <label>16-Folder Vault Category</label>
                <select
                  className="desk-form-input"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  data-testid="select-submit-category"
                >
                  <option value="01 Site Drawings & Topographic Layout">01 Site Drawings & Topographic Layout</option>
                  <option value="02 Zoning & Space Planning">02 Zoning & Space Planning</option>
                  <option value="03 Space & Object Studies">03 Space & Object Studies</option>
                  <option value="04 Complete Architectural Schematic Package">04 Complete Architectural Schematic Package</option>
                  <option value="05 Material Selection & Moodboards">05 Material Selection & Moodboards</option>
                  <option value="06 3D Photorealistic CGI Renders">06 3D Photorealistic CGI Renders</option>
                  <option value="07 Civil Footing & Column Layouts">07 Civil Footing & Column Layouts</option>
                  <option value="08 Plumbing & Drainage Schematics">08 Plumbing & Drainage Schematics</option>
                  <option value="09 Fire Hydrant & Life Safety Plans">09 Fire Hydrant & Life Safety Plans</option>
                  <option value="10 HVAC Chilled Water & Ducting">10 HVAC Chilled Water & Ducting</option>
                  <option value="11 Marble & Tile Flooring Layouts">11 Marble & Tile Flooring Layouts</option>
                  <option value="12 Reflected Ceiling & Lighting Drops">12 Reflected Ceiling & Lighting Drops</option>
                  <option value="13 Electrical SLD & Power Conduit Routes">13 Electrical SLD & Power Conduit Routes</option>
                  <option value="14 Internal & External Wall Elevations">14 Internal & External Wall Elevations</option>
                  <option value="15 Architectural Joinery & Element Details">15 Architectural Joinery & Element Details</option>
                  <option value="03 Other / Miscellaneous Reference">03 Other / Miscellaneous Reference</option>
                </select>
              </div>

              <div className="desk-form-group">
                <label>Revision Number</label>
                <input
                  type="number"
                  className="desk-form-input"
                  min={1}
                  max={99}
                  value={newRevision}
                  onChange={(e) => setNewRevision(Number(e.target.value))}
                />
              </div>

              <div className="desk-form-group">
                <label>Staff Submitter Notes</label>
                <textarea
                  className="desk-form-textarea"
                  rows={3}
                  placeholder="Checked against structural consultant revisions dated Nov 3..."
                  value={newStaffNotes}
                  onChange={(e) => setNewStaffNotes(e.target.value)}
                />
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
                  type="submit"
                  className="desk-btn desk-btn-primary"
                  data-testid="confirm-staff-submit-btn"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
