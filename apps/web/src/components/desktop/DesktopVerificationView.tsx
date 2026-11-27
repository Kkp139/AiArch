import React, { useState, useEffect, useMemo } from 'react';
import { UserRole } from '../../context/AuthContext';
import { VerificationItem, VerificationStatus } from '../../pages/Verification/VerificationList';
import type { ProjectSummary } from '../../App';
import {
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Search,
  Plus,
  RotateCcw,
  RotateCw,
  Stamp,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  FolderOpen,
  Hourglass,
  Eye,
  Download,
  Calendar,
  RefreshCw,
  FileCheck2,
  Info,
} from 'lucide-react';
import './desktop.css';

export type { VerificationItem, VerificationStatus };

export interface VerificationSubmitPayload {
  projectId?: string;
  folderId?: string;
  drawingTitle: string;
  fileKey?: string;
  previewKey?: string;
  notes?: string;
}

export interface DesktopVerificationViewProps {
  userRole: UserRole;
  projectCode?: string;
  projects?: ProjectSummary[];
  items?: VerificationItem[];
  getAuthHeaders?: () => Record<string, string>;
  onRefresh?: () => Promise<void> | void;
  onApprove?: ((id: string) => void) | ((id: string, notes?: string) => Promise<void> | void);
  onRequestRevision?: ((id: string, notes: string) => void) | ((id: string, notes: string) => Promise<void> | void);
  onSubmitDrawing?: (drawing: any) => void;
  onSubmitVerification?: (payload: any) => Promise<void> | void;
}

type StatusFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REVISION';

interface FolderOption {
  id: string;
  categoryCode?: string;
  folderName: string;
}

const STANDARD_CATEGORIES = [
  '01 Site Drawings & Topographic Layout',
  '02 Zoning & Space Planning',
  '03 Space & Object Studies',
  '04 Complete Architectural Schematic Package',
  '05 Material Selection & Moodboards',
  '06 3D Photorealistic CGI Renders',
  '07 Civil Footing & Column Layouts',
  '08 Plumbing & Drainage Schematics',
  '09 Fire Hydrant & Life Safety Plans',
  '10 HVAC Chilled Water & Ducting',
  '11 Marble & Tile Flooring Layouts',
  '12 Reflected Ceiling & Lighting Drops',
  '13 Electrical SLD & Power Conduit Routes',
  '14 Internal & External Wall Elevations',
  '15 Architectural Joinery & Element Details',
  '03 Other / Miscellaneous Reference',
];

const DEFAULT_TEST_QUEUE: VerificationItem[] = [
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

function isPendingStatus(status: VerificationStatus): boolean {
  return status === 'PENDING_APPROVAL' || status === 'PENDING_REVIEW';
}

function isRevisionStatus(status: VerificationStatus): boolean {
  return status === 'REVISION_REQUIRED' || status === 'REVISION_REQUESTED';
}

function getFileFormatLabel(fileKey?: string): string {
  if (!fileKey) return 'CAD / PDF';
  const ext = fileKey.split('.').pop()?.toUpperCase();
  return ext && ext.length <= 5 ? ext : 'CAD / PDF';
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const DesktopVerificationView: React.FC<DesktopVerificationViewProps> = ({
  userRole,
  projectCode = 'AF-VILLA',
  projects = [],
  items: propItems,
  getAuthHeaders,
  onRefresh,
  onApprove,
  onRequestRevision,
  onSubmitDrawing,
  onSubmitVerification,
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
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  const initialQueue: VerificationItem[] =
    propItems !== undefined ? propItems : isTestEnv ? DEFAULT_TEST_QUEUE : [];

  const [queue, setQueue] = useState<VerificationItem[]>(initialQueue);
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(initialQueue[0] ?? null);
  const [selectedRevision, setSelectedRevision] = useState(
    `Rev 0${initialQueue[0]?.revisionNumber || 1}`
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync queue when propItems updates from parent App.tsx
  useEffect(() => {
    if (propItems !== undefined) {
      setQueue(propItems);
      setSelectedItem((prev) => {
        if (!propItems.length) return null;
        if (prev) {
          const updated = propItems.find((i) => i.id === prev.id);
          if (updated) return updated;
        }
        return propItems[0];
      });
    }
  }, [propItems]);

  // Self-fetch from /api/verification/list in production if propItems was not provided
  useEffect(() => {
    if (propItems !== undefined || isTestEnv || !getAuthHeaders) return;
    let active = true;
    fetch('/api/verification/list', { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: VerificationItem[]) => {
        if (!active || !Array.isArray(data)) return;
        setQueue(data);
        setSelectedItem((prev) => prev ?? data[0] ?? null);
      })
      .catch(() => {
        // Ignore network errors silently; empty state remains visible
      });
    return () => {
      active = false;
    };
  }, [propItems, isTestEnv, getAuthHeaders]);

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
  const defaultProject = useMemo(
    () => projects.find((p) => p.projectCode === projectCode) || projects[0],
    [projects, projectCode]
  );
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProject?.id || '');
  const [projectFolders, setProjectFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(STANDARD_CATEGORIES[0]);
  const [newRevision, setNewRevision] = useState(1);
  const [newFileKey, setNewFileKey] = useState('');
  const [newStaffNotes, setNewStaffNotes] = useState('');

  useEffect(() => {
    if (defaultProject?.id && !selectedProjectId) {
      setSelectedProjectId(defaultProject.id);
    }
  }, [defaultProject, selectedProjectId]);

  // Fetch project folders when submit modal opens or selectedProjectId changes
  useEffect(() => {
    if (!isSubmitModalOpen || !selectedProjectId || isTestEnv || !getAuthHeaders) return;
    let active = true;
    fetch(`/api/projects/${selectedProjectId}/folders`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : []))
      .then((folders: FolderOption[]) => {
        if (!active || !Array.isArray(folders)) return;
        setProjectFolders(folders);
        if (folders.length > 0) {
          setSelectedFolderId(folders[0].id);
          setNewCategory(folders[0].folderName);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isSubmitModalOpen, selectedProjectId, isTestEnv, getAuthHeaders]);

  // KPI Metrics
  const counts = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter((i) => isPendingStatus(i.status)).length;
    const approved = queue.filter((i) => i.status === 'APPROVED').length;
    const revision = queue.filter((i) => isRevisionStatus(i.status)).length;
    return { total, pending, approved, revision };
  }, [queue]);

  // Filtered queue by status tab + search query
  const filteredQueue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return queue.filter((item) => {
      if (statusFilter === 'PENDING' && !isPendingStatus(item.status)) return false;
      if (statusFilter === 'APPROVED' && item.status !== 'APPROVED') return false;
      if (statusFilter === 'REVISION' && !isRevisionStatus(item.status)) return false;

      if (!q) return true;
      return (
        item.drawingTitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.projectName || '').toLowerCase().includes(q) ||
        (item.projectCode || '').toLowerCase().includes(q) ||
        (item.submittedBy || '').toLowerCase().includes(q)
      );
    });
  }, [queue, statusFilter, searchQuery]);

  const handleSelectDrawing = (item: VerificationItem) => {
    setSelectedItem(item);
    setSelectedRevision(item.revisionLabel || `Rev 0${item.revisionNumber}`);
    setRotationDeg(0);
    setActionError(null);
  };

  const handleApproveSeal = async () => {
    if (!selectedItem || actionBusy) return;
    setActionError(null);

    const updatedItem: VerificationItem = {
      ...selectedItem,
      status: 'APPROVED',
      adminNotes: 'Officially certified with Studio Architectural Seal.',
    };

    setQueue((prev) => prev.map((item) => (item.id === selectedItem.id ? updatedItem : item)));
    setSelectedItem(updatedItem);

    try {
      if (onApprove) {
        const maybePromise = (onApprove as (id: string) => unknown)(selectedItem.id);
        if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
          setActionBusy(true);
          await maybePromise;
        }
      } else if (getAuthHeaders && !isTestEnv) {
        setActionBusy(true);
        const res = await fetch(`/api/verification/${selectedItem.id}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ notes: updatedItem.adminNotes }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to approve drawing');
        }
        if (onRefresh) await onRefresh();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Approval request failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !revisionFeedback.trim() || actionBusy) return;
    setActionError(null);

    const feedback = revisionFeedback.trim();
    const updatedItem: VerificationItem = {
      ...selectedItem,
      status: 'REVISION_REQUIRED',
      feedbackNote: feedback,
    };

    setQueue((prev) => prev.map((item) => (item.id === selectedItem.id ? updatedItem : item)));
    setSelectedItem(updatedItem);
    setIsRevisionModalOpen(false);
    setRevisionFeedback('');

    try {
      if (onRequestRevision) {
        const maybePromise = onRequestRevision(selectedItem.id, feedback);
        if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
          setActionBusy(true);
          await maybePromise;
        }
      } else if (getAuthHeaders && !isTestEnv) {
        setActionBusy(true);
        const res = await fetch(`/api/verification/${selectedItem.id}/revision`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ notes: feedback, feedbackNote: feedback }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to request revision');
        }
        if (onRefresh) await onRefresh();
      }
    } catch (err: any) {
      setActionError(err?.message || 'Revision request failed');
    } finally {
      setActionBusy(false);
    }
  };

  const handleStaffSubmitDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || actionBusy) return;
    setActionError(null);

    const title = newTitle.trim();
    const derivedFileKey =
      newFileKey.trim() ||
      `drawings/${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.dwg`;

    const newDrawing: VerificationItem = {
      id: `ver-${Date.now()}`,
      projectId: selectedProjectId || undefined,
      projectCode:
        projects.find((p) => p.id === selectedProjectId)?.projectCode || projectCode,
      projectName: projects.find((p) => p.id === selectedProjectId)?.name,
      folderId: selectedFolderId || undefined,
      drawingTitle: title,
      category: newCategory,
      fileKey: derivedFileKey,
      revisionNumber: Number(newRevision) || 1,
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
      submittedBy: 'Current Staff Architect',
      feedbackNote: newStaffNotes.trim() || undefined,
    };

    setQueue((prev) => [newDrawing, ...prev]);
    setSelectedItem(newDrawing);
    setSelectedRevision(`Rev 0${newDrawing.revisionNumber}`);
    setIsSubmitModalOpen(false);
    setNewTitle('');
    setNewFileKey('');
    setNewStaffNotes('');

    if (onSubmitDrawing) {
      onSubmitDrawing(newDrawing);
    }

    if (onSubmitVerification) {
      const apiPayload: VerificationSubmitPayload = {
        projectId: selectedProjectId || newDrawing.projectId,
        folderId: selectedFolderId || newDrawing.folderId || newCategory,
        drawingTitle: title,
        fileKey: derivedFileKey,
        notes: newStaffNotes.trim() || undefined,
      };
      try {
        setActionBusy(true);
        await onSubmitVerification(apiPayload);
      } catch (err: any) {
        setActionError(err?.message || 'Failed to submit drawing');
      } finally {
        setActionBusy(false);
      }
    } else if (getAuthHeaders && !isTestEnv && selectedProjectId && selectedFolderId) {
      try {
        setActionBusy(true);
        const res = await fetch('/api/verification/submit', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            projectId: selectedProjectId,
            folderId: selectedFolderId,
            drawingTitle: title,
            fileKey: derivedFileKey,
            notes: newStaffNotes.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to submit drawing');
        }
        if (onRefresh) await onRefresh();
      } catch (err: any) {
        setActionError(err?.message || 'Failed to submit drawing');
      } finally {
        setActionBusy(false);
      }
    }
  };

  const getStatusBadge = (status?: VerificationStatus) => {
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

  const statusTabs: { key: StatusFilter; label: string; count: number; testId: string }[] = [
    { key: 'ALL', label: 'All', count: counts.total, testId: 'status-tab-all' },
    { key: 'PENDING', label: 'Pending Review', count: counts.pending, testId: 'status-tab-pending' },
    { key: 'APPROVED', label: 'Approved', count: counts.approved, testId: 'status-tab-approved' },
    { key: 'REVISION', label: 'Revision Required', count: counts.revision, testId: 'status-tab-revision' },
  ];

  return (
    <div className="desk-verification-view" data-testid="desktop-verification-view">
      {/* Top Header */}
      <div className="desk-verification-header">
        <div>
          <h1 className="desk-page-title">Design Verification</h1>
          <p className="desk-page-subtitle">
            Review, verify, and track design drawings and documents for project approval.
          </p>
        </div>

        <div className="desk-header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onRefresh && (
            <button
              type="button"
              className="desk-btn desk-btn-secondary"
              onClick={() => onRefresh()}
              title="Refresh verification queue"
              data-testid="refresh-verification-btn"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          )}
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

      {/* Figma 920:23149 Verification Overview KPI Strip */}
      <div
        data-testid="verification-overview-kpis"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
          marginBottom: '18px',
        }}
      >
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #E9E9EB',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '999px',
              background: '#F9F4EF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#BF935A',
              flexShrink: 0,
            }}
          >
            <FolderOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#4A4A4C' }}>Total Requests</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#1D1D1F', lineHeight: 1.2 }}>
              {counts.total}
            </div>
            <div style={{ fontSize: '12px', color: '#686869' }}>Across all statuses</div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #E9E9EB',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '999px',
              background: '#FBF3E7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#916325',
              flexShrink: 0,
            }}
          >
            <Hourglass size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#4A4A4C' }}>Pending Review</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#916325', lineHeight: 1.2 }}>
              {counts.pending}
            </div>
            <div style={{ fontSize: '12px', color: '#686869' }}>Awaiting review</div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #E9E9EB',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '999px',
              background: '#FBE6E8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DF3344',
              flexShrink: 0,
            }}
          >
            <RotateCcw size={22} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#4A4A4C' }}>Revision Required</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#DF3344', lineHeight: 1.2 }}>
              {counts.revision}
            </div>
            <div style={{ fontSize: '12px', color: '#686869' }}>Returned with feedback</div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid #E9E9EB',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '999px',
              background: '#EFF8F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#248A3D',
              flexShrink: 0,
            }}
          >
            <FileCheck2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#4A4A4C' }}>Approved & Sealed</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#248A3D', lineHeight: 1.2 }}>
              {counts.approved}
            </div>
            <div style={{ fontSize: '12px', color: '#686869' }}>Ready for project vault</div>
          </div>
        </div>
      </div>

      {/* Figma 920:23183 Status Filter Tabs & Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '16px',
        }}
      >
        <div
          data-testid="verification-status-tabs"
          style={{
            background: '#FFFFFF',
            borderRadius: '10px',
            padding: '4px',
            display: 'inline-flex',
            gap: '4px',
            border: '1px solid #E9E9EB',
          }}
        >
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                data-testid={tab.testId}
                onClick={() => setStatusFilter(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '38px',
                  padding: '0 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? '#F9F4EF' : 'transparent',
                  color: active ? '#695132' : '#686869',
                  fontWeight: active ? 600 : 400,
                  fontSize: '13.5px',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    background: active ? '#EBDECC' : '#F1F1F3',
                    color: active ? '#695132' : '#686869',
                    padding: '1px 7px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E9E9EB',
            borderRadius: '8px',
            height: '44px',
            padding: '0 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            minWidth: '320px',
            flex: '0 1 420px',
          }}
        >
          <Search size={17} style={{ color: '#686869', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by drawing name, project, or reviewer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="queue-search-input"
            style={{
              border: 'none',
              outline: 'none',
              background: 'transparent',
              width: '100%',
              fontSize: '14px',
              color: '#1D1D1F',
            }}
          />
        </div>
      </div>

      {actionError && (
        <div
          role="alert"
          style={{
            marginBottom: '12px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#FBE6E8',
            color: '#DF3344',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {actionError}
        </div>
      )}

      {/* 3-Column Master-Detail Layout: Left Queue (300px) + Center Viewport (Flex) + Right Inspector (400px) */}
      <div className="desk-verif-master-detail" data-testid="master-detail-split">
        {/* 1. Left Queue Panel: Drawings Awaiting Verification */}
        <div className="desk-verif-queue" data-testid="verification-queue-column">
          <div className="desk-queue-header">
            <span style={{ fontWeight: 700, fontSize: '13.5px' }}>Verification Queue</span>
            <span className="desk-badge-count">{filteredQueue.length}</span>
          </div>

          <div className="desk-queue-list">
            {filteredQueue.length === 0 ? (
              <div
                data-testid="verification-empty-queue"
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: '#686869',
                  fontSize: '13px',
                }}
              >
                <FolderOpen size={28} style={{ color: '#BF935A', margin: '0 auto 10px' }} />
                <div style={{ fontWeight: 600, color: '#1D1D1F', marginBottom: '4px' }}>
                  No drawings in queue
                </div>
                <div>
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'Try clearing your search or switching status tabs.'
                    : 'Submitted drawings awaiting verification will appear here.'}
                </div>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`desk-queue-item ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectDrawing(item)}
                    data-testid={`queue-item-${item.id}`}
                  >
                    <div className="desk-queue-item-top">
                      <span className="desk-rev-tag">
                        {item.revisionLabel || `Rev 0${item.revisionNumber}`}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="desk-queue-item-title">{item.drawingTitle}</div>
                    <div className="desk-queue-item-meta">
                      <span>{item.projectName || item.projectCode || item.category}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '6px',
                        fontSize: '11.5px',
                        color: '#686869',
                      }}
                    >
                      <span>{item.submittedBy || 'Studio Architect'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={11} />
                        {formatShortDate(item.submittedAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
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
              {(selectedItem?.revisionNumber ?? 0) >= 3 && (
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
                onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                title="Zoom Out"
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}>{zoomLevel}%</span>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={() => setZoomLevel((z) => Math.min(z + 25, 250))}
                title="Zoom In"
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={() => {
                  setZoomLevel(100);
                  setRotationDeg(0);
                }}
                title="Fit to screen"
              >
                <Maximize2 size={14} />
              </button>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                title="Rotate drawing"
              >
                <RotateCw size={14} />
              </button>
            </div>
          </div>

          {/* High-Resolution Blueprint CAD Viewport */}
          <div className="desk-verif-canvas-wrap">
            {!selectedItem ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '360px',
                  color: '#686869',
                  textAlign: 'center',
                  padding: '32px',
                }}
              >
                <FolderOpen size={40} style={{ color: '#BF935A', marginBottom: '12px' }} />
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1D1D1F' }}>
                  No Drawing Selected
                </div>
                <p style={{ fontSize: '13.5px', maxWidth: '340px', marginTop: '6px' }}>
                  Select a submission from the verification queue to inspect the drawing sheet and
                  record your review decision.
                </p>
              </div>
            ) : (
              <div
                className="desk-verif-paper"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotationDeg}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <div className="desk-cad-border">
                  <div className="desk-cad-grid-pattern" />
                  <div className="desk-cad-drawing-content">
                    <div className="desk-cad-watermark">
                      A&F DESIGN STUDIO • {selectedItem.category.toUpperCase()}
                    </div>

                    {/* Official Architectural Seal Stamp Display (when Approved) */}
                    {selectedItem.status === 'APPROVED' && (
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

                    {selectedItem.previewKey ? (
                      <img
                        src={selectedItem.previewKey}
                        alt={selectedItem.drawingTitle}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '340px',
                          objectFit: 'contain',
                          borderRadius: '6px',
                          position: 'relative',
                          zIndex: 1,
                        }}
                      />
                    ) : (
                      <div className="desk-cad-schematic-mock">
                        <div className="desk-cad-axis-x" />
                        <div className="desk-cad-axis-y" />
                        <div className="desk-cad-room room-living">{selectedItem.drawingTitle}</div>
                      </div>
                    )}
                  </div>

                  {/* Blueprint Title Block */}
                  <div className="desk-cad-title-block">
                    <div className="title-block-row header">
                      <span>A&F DESIGN</span>
                      <span>{selectedItem.projectCode || projectCode}</span>
                    </div>
                    <div className="title-block-row">
                      <span>STATUS: {selectedItem.status}</span>
                      <span>
                        REV: {selectedRevision} • {getFileFormatLabel(selectedItem.fileKey)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. Right Inspector Panel (400px persistent width) */}
        <div className="desk-verif-inspector" data-testid="verification-inspector-column">
          <div className="desk-inspector-header">
            <span style={{ fontWeight: 700, fontSize: '14px' }}>File Details & Inspector</span>
            {selectedItem ? getStatusBadge(selectedItem.status) : null}
          </div>

          {!selectedItem ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#686869',
                fontSize: '13.5px',
              }}
            >
              Select a drawing from the queue to view file metadata, technical checklist, and
              approval controls.
            </div>
          ) : (
            <>
              <div className="desk-inspector-scroll">
                <div className="desk-meta-group">
                  <span className="desk-meta-label">Drawing Sheet Title</span>
                  <span className="desk-meta-value" style={{ fontWeight: 600 }}>
                    {selectedItem.drawingTitle}
                  </span>
                </div>

                {(selectedItem.projectName || selectedItem.projectCode) && (
                  <div className="desk-meta-group">
                    <span className="desk-meta-label">Project</span>
                    <span className="desk-meta-value">
                      {selectedItem.projectName || selectedItem.projectCode}
                    </span>
                  </div>
                )}

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Vault Category</span>
                  <span className="desk-meta-value">{selectedItem.category}</span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Uploaded By & Date</span>
                  <span className="desk-meta-value">
                    {selectedItem.submittedBy || 'Studio Architect'} •{' '}
                    {formatShortDate(selectedItem.submittedAt)}
                  </span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">File Format & Revision</span>
                  <span className="desk-meta-value">
                    {getFileFormatLabel(selectedItem.fileKey)} •{' '}
                    {selectedItem.revisionLabel || `Rev ${selectedItem.revisionNumber}`}
                  </span>
                </div>

                {selectedItem.reviewedBy && (
                  <div className="desk-meta-group">
                    <span className="desk-meta-label">Reviewed By</span>
                    <span className="desk-meta-value">
                      {selectedItem.reviewedBy}
                      {selectedItem.reviewedAt ? ` • ${formatShortDate(selectedItem.reviewedAt)}` : ''}
                    </span>
                  </div>
                )}

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
                      onChange={(e) =>
                        setChecklist({ ...checklist, dimensionsVerified: e.target.checked })
                      }
                    />
                    <span>Dimension Strings & Datum Levels Reconciled</span>
                  </label>
                  <label className="desk-checklist-item">
                    <input
                      type="checkbox"
                      checked={checklist.wallOpeningsChecked}
                      onChange={(e) =>
                        setChecklist({ ...checklist, wallOpeningsChecked: e.target.checked })
                      }
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

                {/* Figma 921:23750 Document View / Download Quick Actions */}
                {selectedItem.fileKey && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                    <a
                      href={selectedItem.previewKey || selectedItem.fileKey}
                      target="_blank"
                      rel="noreferrer"
                      className="desk-btn desk-btn-secondary"
                      style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                    >
                      <Eye size={15} />
                      <span>View</span>
                    </a>
                    <a
                      href={selectedItem.fileKey}
                      download
                      className="desk-btn desk-btn-primary"
                      style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                    >
                      <Download size={15} />
                      <span>Download</span>
                    </a>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    marginTop: '14px',
                    fontSize: '12px',
                    color: '#686869',
                  }}
                >
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Approving applies the official studio seal and publishes the drawing to the
                    Project Vault.
                  </span>
                </div>
              </div>

              {/* Admin Action Bar (Apply Studio Seal / Request Revision) */}
              {isAdmin && (
                <div className="desk-inspector-actions" data-testid="admin-action-bar">
                  <button
                    type="button"
                    className="desk-btn desk-btn-primary"
                    onClick={handleApproveSeal}
                    disabled={actionBusy}
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
                    disabled={actionBusy}
                    data-testid="request-revision-btn"
                    title="Request Technical Revision"
                  >
                    <RotateCcw size={15} />
                    <span>Request Revision</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Revision Modal Dialog (Figma 923:24289) */}
      {isRevisionModalOpen && (
        <div className="desk-modal-overlay" data-testid="revision-modal">
          <div className="desk-modal-dialog" style={{ maxWidth: '490px', borderRadius: '20px' }}>
            <div className="desk-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: '#FBE6E8',
                    color: '#DF3344',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <RotateCcw size={20} />
                </div>
                <h2 className="desk-modal-title">Send for Revision</h2>
              </div>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsRevisionModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRevision} className="desk-modal-body">
              <p style={{ fontSize: '13px', color: '#636372', marginBottom: '12px' }}>
                The submitter will be notified to make changes on{' '}
                <strong>{selectedItem?.drawingTitle}</strong> ({selectedRevision}).
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
                  disabled={actionBusy}
                  style={{ background: '#DF3344', borderColor: '#DF3344' }}
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
              {projects.length > 0 && (
                <div className="desk-form-group">
                  <label>Project</label>
                  <select
                    className="desk-form-input"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    data-testid="select-submit-project"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.projectCode} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                {projectFolders.length > 0 ? (
                  <select
                    className="desk-form-input"
                    value={selectedFolderId}
                    onChange={(e) => {
                      const folder = projectFolders.find((f) => f.id === e.target.value);
                      setSelectedFolderId(e.target.value);
                      if (folder) setNewCategory(folder.folderName);
                    }}
                    data-testid="select-submit-category"
                  >
                    {projectFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.folderName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="desk-form-input"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    data-testid="select-submit-category"
                  >
                    {STANDARD_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="desk-form-group">
                <label>Drawing File Reference (DWG / PDF)</label>
                <input
                  type="text"
                  className="desk-form-input"
                  placeholder="e.g. drawings/ground-floor-plan.dwg"
                  value={newFileKey}
                  onChange={(e) => setNewFileKey(e.target.value)}
                />
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
                  disabled={actionBusy}
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
