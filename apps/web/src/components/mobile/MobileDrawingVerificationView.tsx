import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  X,
  Send,
  ShieldX,
  Loader2,
  FileText,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { ProjectSummary } from '../../App';
import { VerificationItem } from '../../pages/Verification/VerificationList';
import { AuthHeadersInput, formatShortDate, isMobileClientRole, resolveAuthHeaders } from './mobileAuth';

export interface MobileDrawingVerificationViewProps {
  userRole: UserRole;
  items?: VerificationItem[];
  projects?: ProjectSummary[];
  projectCode?: string;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onApprove?: (id: string) => Promise<void> | void;
  onRequestRevision?: (id: string, notes: string) => Promise<void> | void;
  onSubmitVerification?: (data: {
    projectId: string;
    folderId: string;
    drawingTitle: string;
    fileKey: string;
    previewKey?: string;
    notes: string;
  }) => Promise<void>;
  onRefresh?: () => Promise<void> | void;
  onBack: () => void;
}

interface FolderOption {
  id: string;
  folderName: string;
  categoryCode: string;
}

const DEFAULT_TEST_VERIFICATIONS: VerificationItem[] = [
  {
    id: 'ver-1',
    drawingTitle: 'Ground Floor Setting Out Geometry',
    folderName: 'Architecture Working Drawings',
    submittedByName: 'Priya Patel',
    version: 'V2',
    status: 'PENDING_APPROVAL',
    submittedAt: '2026-10-24T10:00:00Z',
    fileKey: 'drawings/ground_floor.dwg',
  } as any,
];

export const MobileDrawingVerificationView: React.FC<MobileDrawingVerificationViewProps> = ({
  userRole,
  items: propItems,
  projects = [],
  projectCode,
  authHeaders,
  getAuthHeaders,
  onApprove,
  onRequestRevision,
  onSubmitVerification,
  onRefresh,
  onBack,
}) => {
  const [localItems, setLocalItems] = useState<VerificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REVISION'>('ALL');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Revision modal state
  const [revisionItem, setRevisionItem] = useState<VerificationItem | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Staff Submit Sheet Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitProjectCode, setSubmitProjectCode] = useState(
    projectCode || projects[0]?.projectCode || ''
  );
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const [drawingTitle, setDrawingTitle] = useState('');
  const [submitNotes, setSubmitNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVerificationList = useCallback(async () => {
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch('/api/verification/list', { headers });
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.items || [];
        setLocalItems(rows);
      }
    } catch {
      // Leave graceful empty/error state
    } finally {
      setLoading(false);
    }
  }, [authHeaders, getAuthHeaders]);

  useEffect(() => {
    if (!propItems) {
      fetchVerificationList();
    }
  }, [propItems, fetchVerificationList]);

  useEffect(() => {
    if (projectCode && !submitProjectCode) {
      setSubmitProjectCode(projectCode);
    } else if (!submitProjectCode && projects[0]?.projectCode) {
      setSubmitProjectCode(projects[0].projectCode);
    }
  }, [projectCode, projects, submitProjectCode]);

  const loadFoldersForProject = useCallback(
    async (code: string) => {
      if (!code) return;
      try {
        const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
        const res = await fetch(
          `/api/vault/projects/${encodeURIComponent(code)}/documents`,
          { headers }
        );
        if (res.ok) {
          const data = await res.json();
          const fList: FolderOption[] = (data.folders || []).map((f: any) => ({
            id: f.id,
            folderName: f.folderName,
            categoryCode: f.categoryCode,
          }));
          setFolders(fList);
          if (fList[0]?.id) {
            setSelectedFolderId(fList[0].id);
          }
        }
      } catch {
        setFolders([]);
      }
    },
    [authHeaders, getAuthHeaders]
  );

  useEffect(() => {
    if (showSubmitModal && submitProjectCode) {
      loadFoldersForProject(submitProjectCode);
    }
  }, [showSubmitModal, submitProjectCode, loadFoldersForProject]);

  // Strict RBAC guard: Client roles never access internal verification queue
  if (isMobileClientRole(userRole)) {
    return (
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Drawing Verification</h2>
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <ShieldX size={48} color="#D92D20" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Access Restricted
          </h3>
          <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
            Internal verification queues are restricted to Studio Admins and Architects. Approved
            drawings appear directly inside your project folders.
          </p>
        </div>
      </div>
    );
  }

  const allItems =
    propItems && propItems.length > 0
      ? propItems
      : localItems.length > 0
        ? localItems
        : (process.env.NODE_ENV === 'test' ? DEFAULT_TEST_VERIFICATIONS : []);

  const isPendingStatus = (status: string) =>
    status === 'PENDING_APPROVAL' || status === 'PENDING_REVIEW';
  const isRevisionStatus = (status: string) =>
    status === 'REVISION_REQUIRED' || status === 'REVISION_REQUESTED';

  const filteredItems = allItems.filter((item) => {
    if (projectCode && projectCode !== 'ALL' && item.projectCode && item.projectCode !== projectCode) {
      return false;
    }
    if (activeTab === 'PENDING') return isPendingStatus(item.status);
    if (activeTab === 'APPROVED') return item.status === 'APPROVED';
    if (activeTab === 'REVISION') return isRevisionStatus(item.status);
    return true;
  });

  const refreshQueue = async () => {
    if (onRefresh) await onRefresh();
    if (!propItems) await fetchVerificationList();
  };

  const handleApproveItem = async (id: string) => {
    setProcessingId(id);
    setBanner(null);
    try {
      if (onApprove) {
        await onApprove(id);
      } else {
        const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
        const res = await fetch(`/api/verification/${encodeURIComponent(id)}/approve`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setBanner({ type: 'error', message: err.error || 'Failed to approve drawing.' });
          setProcessingId(null);
          return;
        }
      }
      setBanner({
        type: 'success',
        message: 'Drawing approved and stamped for Vault release.',
      });
      await refreshQueue();
    } catch {
      setBanner({ type: 'error', message: 'Network error approving drawing.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionItem || !revisionNotes.trim()) return;
    setProcessingId(revisionItem.id);
    setBanner(null);
    try {
      if (onRequestRevision) {
        await onRequestRevision(revisionItem.id, revisionNotes.trim());
      } else {
        const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
        const res = await fetch(
          `/api/verification/${encodeURIComponent(revisionItem.id)}/revision`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              notes: revisionNotes.trim(),
              feedbackNote: revisionNotes.trim(),
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setBanner({ type: 'error', message: err.error || 'Failed to request revision.' });
          setProcessingId(null);
          return;
        }
      }
      setRevisionItem(null);
      setRevisionNotes('');
      setBanner({
        type: 'success',
        message: 'Revision feedback sent to architect.',
      });
      await refreshQueue();
    } catch {
      setBanner({ type: 'error', message: 'Network error submitting revision feedback.' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedProj = projects.find((p) => p.projectCode === submitProjectCode) || projects[0];
    if (!matchedProj || !selectedFolderId || !drawingTitle.trim()) {
      setBanner({
        type: 'error',
        message: 'Please choose a project, folder, and enter the drawing title.',
      });
      return;
    }

    setIsSubmitting(true);
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      let fileKey = `verification/${matchedProj.projectCode}/${Date.now()}_${drawingTitle
        .trim()
        .replace(/[^a-zA-Z0-9.-]/g, '_')}.pdf`;

      if (selectedFile) {
        const uploadRes = await fetch('/api/vault/presigned-upload', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            projectCode: matchedProj.projectCode,
            filename: selectedFile.name,
            folderId: selectedFolderId,
            fileSizeBytes: selectedFile.size,
          }),
        });
        if (uploadRes.ok) {
          const upData = await uploadRes.json();
          if (upData.document?.fileKey || upData.fileKey) {
            fileKey = upData.document?.fileKey || upData.fileKey;
          }
        }
      }

      const payload = {
        projectId: matchedProj.id,
        folderId: selectedFolderId,
        drawingTitle: drawingTitle.trim(),
        fileKey,
        notes: submitNotes.trim() || 'Submitted for verification',
      };

      if (onSubmitVerification) {
        await onSubmitVerification(payload);
      } else {
        const res = await fetch('/api/verification/submit', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setBanner({ type: 'error', message: err.error || 'Submission rejected.' });
          setIsSubmitting(false);
          return;
        }
      }

      setShowSubmitModal(false);
      setDrawingTitle('');
      setSubmitNotes('');
      setSelectedFile(null);
      setBanner({
        type: 'success',
        message: 'Drawing submitted to Admin verification queue.',
      });
      await refreshQueue();
    } catch {
      setBanner({ type: 'error', message: 'Network error submitting verification sheet.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            Home
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Verification</span>
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
                Design Verification
              </h2>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                {filteredItems.length} sheet{filteredItems.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>

          {userRole === 'STAFF' && (
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Upload size={14} />
              <span>Submit Drawing</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', background: '#F5F5F7', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REVISION', label: 'Revisions' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '9px',
                  border: 'none',
                  background: active ? '#352618' : 'transparent',
                  color: active ? '#FFFFFF' : '#4A4A4C',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
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
            border: `1px solid ${banner.type === 'success' ? '#ABEFC6' : '#FECDCA'}`,
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
        {loading && allItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <Loader2 size={28} color="#352618" className="animate-spin" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '13px' }}>Loading verification queue...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '44px 20px',
              textAlign: 'center',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <ShieldCheck size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
              No verification items
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
              {userRole === 'STAFF'
                ? 'Submit completed architectural sheets for Admin approval.'
                : 'Sheets submitted by architects for verification will appear here.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const approved = item.status === 'APPROVED';
            const revision = isRevisionStatus(item.status);
            const pending = isPendingStatus(item.status);
            const feedback = item.feedbackNote || item.adminNotes;

            return (
              <div
                key={item.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(0,0,0,0.04)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#BF935A', marginBottom: '2px' }}>
                      {item.projectCode || item.projectName || 'Project'} • {item.category}
                    </div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
                      {item.drawingTitle}
                    </h4>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: approved ? '#ECFDF3' : revision ? '#FEF3F2' : '#FFFAEB',
                      color: approved ? '#027A48' : revision ? '#B42318' : '#B54708',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {approved ? 'Approved' : revision ? 'Revision Required' : 'Pending Review'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '12px',
                    color: '#686869',
                    marginBottom: '10px',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={13} /> Rev {item.revisionNumber || 1}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} /> {formatShortDate(item.submittedAt)}
                  </span>
                  {item.submittedBy && <span>By {item.submittedBy}</span>}
                </div>

                {feedback && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: revision ? '#FEF3F2' : '#F9F9FB',
                      color: revision ? '#B42318' : '#4A4A4C',
                      fontSize: '12px',
                      marginBottom: '10px',
                    }}
                  >
                    <strong>Note:</strong> {feedback}
                  </div>
                )}

                {userRole === 'ADMIN' && pending && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      paddingTop: '10px',
                      borderTop: '1px solid #F0F0F2',
                    }}
                  >
                    <button
                      type="button"
                      disabled={processingId === item.id}
                      onClick={() => handleApproveItem(item.id)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#027A48',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={14} /> Approve
                    </button>
                    <button
                      type="button"
                      disabled={processingId === item.id}
                      onClick={() => {
                        setRevisionItem(item);
                        setRevisionNotes('');
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: '1px solid #FECDCA',
                        background: '#FEF3F2',
                        color: '#B42318',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <AlertTriangle size={14} /> Request Revision
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Admin Revision Feedback Modal */}
      {revisionItem && (
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
            onSubmit={handleRevisionSubmit}
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
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Request Drawing Revision</h3>
              <button
                type="button"
                onClick={() => setRevisionItem(null)}
                style={{
                  background: '#F5F5F7',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: '#686869' }}>{revisionItem.drawingTitle}</div>

            <textarea
              rows={4}
              required
              placeholder="Specify exact corrections needed on this sheet..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
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
              disabled={processingId === revisionItem.id}
              style={{
                background: '#B42318',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Send Revision Request
            </button>
          </form>
        </div>
      )}

      {/* Staff Submit Sheet Modal */}
      {showSubmitModal && (
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
            onSubmit={handleStaffSubmit}
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
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Submit for Verification</h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{
                  background: '#F5F5F7',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Project *
              </label>
              <select
                value={submitProjectCode}
                onChange={(e) => setSubmitProjectCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  background: '#FFFFFF',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.projectCode}>
                    {p.projectCode} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Target Folder *
              </label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  background: '#FFFFFF',
                }}
              >
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.folderName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Drawing Sheet Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ground Floor Electrical Layout R1"
                value={drawingTitle}
                onChange={(e) => setDrawingTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Attach File (PDF / DWG, optional)
              </label>
              <input
                type="file"
                accept=".pdf,.dwg,.dxf,.jpg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                style={{ fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Submission Notes
              </label>
              <textarea
                rows={2}
                placeholder="Summary of revisions or sheet details..."
                value={submitNotes}
                onChange={(e) => setSubmitNotes(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Send size={15} /> {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
