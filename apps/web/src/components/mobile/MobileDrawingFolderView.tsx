import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  Search,
  FileText,
  ChevronRight,
  Upload,
  Loader2,
  FolderKanban,
  Download,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { MobileViewToggle } from './MobileViewToggle';
import { AuthHeadersInput, formatShortDate, resolveAuthHeaders } from './mobileAuth';

export interface DrawingItem {
  id: string;
  title: string;
  code: string;
  version: string;
  status: 'Approved' | 'Pending' | 'In Review';
  fileSize: string;
  uploadedBy: string;
  date: string;
  isDwg?: boolean;
  previewKey?: string | null;
  downloadUrl?: string;
  fileName?: string;
}

export interface MobileDrawingFolderViewProps {
  projectName: string;
  projectCode?: string;
  phaseName: string;
  folderName: string;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  userRole?: string;
  allowClientDownloads?: string;
  onBack: () => void;
  onNavigateProjects?: () => void;
  onNavigateDetail?: () => void;
  onSelectDrawing: (drawing: DrawingItem) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const MobileDrawingFolderView: React.FC<MobileDrawingFolderViewProps> = ({
  projectName,
  projectCode,
  phaseName: _phaseName,
  folderName,
  authHeaders,
  getAuthHeaders,
  userRole,
  allowClientDownloads,
  onBack,
  onNavigateProjects,
  onNavigateDetail,
  onSelectDrawing,
  viewMode: propViewMode,
  onViewModeChange: propOnViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [drawings, setDrawings] = useState<DrawingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [effectiveDownloadPolicy, setEffectiveDownloadPolicy] = useState<string>(
    allowClientDownloads || 'VIEW_AND_DOWNLOAD'
  );
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = propOnViewModeChange ?? setInternalViewMode;

  const fetchFolderDrawings = useCallback(async () => {
    if (!projectCode) return;
    setIsLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(
        `/api/vault/projects/${encodeURIComponent(projectCode)}/documents`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.allowClientDownloads) {
          setEffectiveDownloadPolicy(data.allowClientDownloads);
        }

        const normTarget = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matchedFolder =
          data.folders?.find((f: any) => {
            const normF = (f.folderName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const normCat = (f.categoryCode || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return (
              normF === normTarget ||
              normCat === normTarget ||
              normF.includes(normTarget) ||
              normTarget.includes(normF) ||
              normCat.includes(normTarget) ||
              normTarget.includes(normCat)
            );
          }) || null;

        if (matchedFolder) {
          setActiveFolderId(matchedFolder.id);
          const mapped: DrawingItem[] = (matchedFolder.documents || []).map((doc: any) => {
            const cleanTitle = (doc.fileName || '')
              .replace(/\.[^/.]+$/, '')
              .replace(/^[A-Za-z0-9-]+_[a-z0-9]+_/i, '')
              .replace(/_/g, ' ');

            return {
              id: doc.id,
              title: cleanTitle || doc.fileName,
              fileName: doc.fileName,
              code: doc.isDwg ? 'DWG' : (doc.fileName?.split('.').pop() || 'FILE').toUpperCase(),
              version: doc.isApprovedDrawing ? 'Approved' : 'Draft',
              status: doc.isApprovedDrawing ? 'Approved' : 'Pending',
              fileSize: formatBytes(doc.fileSizeBytes),
              uploadedBy: doc.uploader?.fullName || 'Studio Architect',
              date: formatShortDate(doc.createdAt),
              isDwg: doc.isDwg,
              previewKey: doc.previewKey,
            };
          });
          setDrawings(mapped);
        } else {
          setDrawings([]);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusBanner({
          type: 'error',
          message: err.error || 'Unable to load vault folder documents.',
        });
        setDrawings([]);
      }
    } catch {
      setStatusBanner({ type: 'error', message: 'Network error while fetching folder documents.' });
      setDrawings([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectCode, folderName, authHeaders, getAuthHeaders]);

  useEffect(() => {
    fetchFolderDrawings();
  }, [fetchFolderDrawings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectCode) return;

    setIsUploading(true);
    setStatusBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch('/api/vault/presigned-upload', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectCode,
          filename: file.name,
          folderId: activeFolderId || undefined,
          fileSizeBytes: file.size,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatusBanner({
          type: 'success',
          message: `Drawing "${file.name}" uploaded successfully.`,
        });
        await fetchFolderDrawings();
      } else {
        setStatusBanner({
          type: 'error',
          message: data.error || 'Upload rejected by studio validation.',
        });
      }
    } catch {
      setStatusBanner({ type: 'error', message: 'Upload failed due to a network error.' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadDrawing = async (e: React.MouseEvent, drawing: DrawingItem) => {
    e.stopPropagation();
    setStatusBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(`/api/vault/document/${encodeURIComponent(drawing.id)}/download`, {
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatusBanner({
          type: 'error',
          message: data.error || 'Download blocked by project permissions.',
        });
        return;
      }

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      } else {
        setStatusBanner({
          type: 'success',
          message: `Verified sheet "${data.fileName || drawing.title}" is ready.`,
        });
      }
    } catch {
      setStatusBanner({ type: 'error', message: 'Unable to fetch drawing download URL.' });
    }
  };

  const handleRenameSubmit = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!renameText.trim()) return;
    setStatusBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch(`/api/vault/document/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fileName: renameText.trim() }),
      });
      if (res.ok) {
        setRenamingId(null);
        setRenameText('');
        setStatusBanner({ type: 'success', message: 'Document renamed.' });
        await fetchFolderDrawings();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusBanner({ type: 'error', message: err.error || 'Rename not supported or denied.' });
      }
    } catch {
      setStatusBanner({ type: 'error', message: 'Network error renaming document.' });
    }
  };

  const handleDeleteDocument = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStatusBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(`/api/vault/document/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        setStatusBanner({ type: 'success', message: 'Document deleted from folder.' });
        await fetchFolderDrawings();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusBanner({ type: 'error', message: err.error || 'Delete rejected.' });
      }
    } catch {
      setStatusBanner({ type: 'error', message: 'Network error deleting document.' });
    }
  };

  const filtered = drawings.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canUpload = userRole === 'ADMIN' || userRole === 'STAFF';
  const canManage = userRole === 'ADMIN' || userRole === 'STAFF';
  const isClientRole = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';
  const canDownload = !isClientRole || effectiveDownloadPolicy !== 'VIEW_ONLY';

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.dwg,.dxf,.dgn,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
      />

      {/* Subpage Header & Clickable Breadcrumbs */}
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onNavigateProjects || onBack}>
            Projects
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="figma-breadcrumb-link" onClick={onNavigateDetail || onBack}>
            {projectName}
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">{folderName}</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Back">
              <ChevronLeft size={24} />
            </button>
            <h2
              style={{
                fontSize: '19px',
                fontWeight: 800,
                margin: 0,
                color: '#0C0C0D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {folderName}
            </h2>
          </div>

          {canUpload && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
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
                flexShrink: 0,
              }}
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
          )}
        </div>

        <div className="figma-search-row">
          <div className="figma-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="figma-search-input"
              placeholder="Search drawing title or format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <MobileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {statusBanner && (
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
            background: statusBanner.type === 'success' ? '#ECFDF3' : '#FEF3F2',
            color: statusBanner.type === 'success' ? '#027A48' : '#B42318',
            border: `1px solid ${statusBanner.type === 'success' ? '#ABEFC6' : '#FECDCA'}`,
          }}
        >
          <span>{statusBanner.message}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {isLoading && drawings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 20px', color: '#686869' }}>
          <Loader2 size={28} color="#352618" className="animate-spin" style={{ margin: '0 auto 10px' }} />
          <div style={{ fontSize: '13px' }}>Loading documents...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 20px' }}>
          <FolderKanban size={40} color="#BF935A" style={{ margin: '0 auto 12px auto', opacity: 0.75 }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0C0C0D' }}>
            {searchQuery ? `No drawings match "${searchQuery}"` : 'No documents uploaded yet'}
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#686869' }}>
            {canUpload
              ? 'Upload PDF, DWG, DXF, or reference images directly to this folder.'
              : 'Documents uploaded by your studio team will appear here.'}
          </p>
          {canUpload && !searchQuery && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                backgroundColor: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Upload Drawing
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="figma-drawings-grid-container">
          {filtered.map((drawing) => {
            const isApproved = drawing.status === 'Approved';
            const dotColor = isApproved ? '#12B76A' : '#F79009';

            return (
              <div
                key={drawing.id}
                className="figma-drawing-grid-card"
                onClick={() => onSelectDrawing(drawing)}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#352618',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <FileText size={18} />
                </div>

                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#0C0C0D',
                    marginBottom: '6px',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {drawing.title}
                </div>

                <div style={{ fontSize: '12px', color: '#686869', marginBottom: '10px' }}>
                  {drawing.code} • {drawing.fileSize}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #F0F0F2',
                    paddingTop: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: dotColor,
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#4A4A4C' }}>
                      {drawing.status}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#979798' }}>{drawing.date}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="figma-drawing-list-container">
          {filtered.map((drawing) => {
            const isApproved = drawing.status === 'Approved';
            const statusBg = isApproved ? '#ECFDF3' : '#FFFAEB';
            const statusColor = isApproved ? '#027A48' : '#B54708';
            const isRenaming = renamingId === drawing.id;
            const isConfirmingDelete = confirmDeleteId === drawing.id;

            return (
              <div
                key={drawing.id}
                className="figma-drawing-list-card"
                onClick={() => !isRenaming && onSelectDrawing(drawing)}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#352618',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={20} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {isRenaming ? (
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: '8px',
                          border: '1px solid #D0D5DD',
                          fontSize: '13px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => handleRenameSubmit(e, drawing.id)}
                        style={{
                          border: 'none',
                          background: '#027A48',
                          color: '#FFF',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingId(null);
                        }}
                        style={{
                          border: 'none',
                          background: '#F2F4F7',
                          color: '#344054',
                          borderRadius: '6px',
                          padding: '4px 6px',
                          cursor: 'pointer',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#0C0C0D',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {drawing.title}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: statusBg,
                            color: statusColor,
                            flexShrink: 0,
                          }}
                        >
                          {drawing.status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: '#686869',
                          gap: '8px',
                        }}
                      >
                        <span>
                          {drawing.code} • {drawing.fileSize} • {drawing.uploadedBy}
                        </span>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {canDownload && (
                            <button
                              type="button"
                              title="Download"
                              onClick={(e) => handleDownloadDrawing(e, drawing)}
                              style={{
                                border: 'none',
                                background: '#F5F5F7',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                color: '#352618',
                              }}
                            >
                              <Download size={13} />
                            </button>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(drawing.id);
                                setRenameText(drawing.fileName || drawing.title);
                              }}
                              style={{
                                border: 'none',
                                background: '#F5F5F7',
                                borderRadius: '6px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                                color: '#4A4A4C',
                              }}
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {canManage &&
                            (isConfirmingDelete ? (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteDocument(e, drawing.id)}
                                style={{
                                  border: 'none',
                                  background: '#D92D20',
                                  color: '#FFF',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Confirm
                              </button>
                            ) : (
                              <button
                                type="button"
                                title="Delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(drawing.id);
                                }}
                                style={{
                                  border: 'none',
                                  background: '#FEF3F2',
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  cursor: 'pointer',
                                  color: '#B42318',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {!isRenaming && <ChevronRight size={18} color="#979798" style={{ flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
