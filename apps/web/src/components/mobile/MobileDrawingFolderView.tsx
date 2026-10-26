import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Search, FileText, ChevronRight, Upload, Loader2, FolderKanban } from 'lucide-react';
import { MobileViewToggle } from './MobileViewToggle';

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
}

export interface MobileDrawingFolderViewProps {
  projectName: string;
  projectCode?: string;
  phaseName: string;
  folderName: string;
  authHeaders?: Record<string, string>;
  userRole?: string;
  onBack: () => void;
  onNavigateProjects?: () => void;
  onNavigateDetail?: () => void;
  onSelectDrawing: (drawing: DrawingItem) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const MobileDrawingFolderView: React.FC<MobileDrawingFolderViewProps> = ({
  projectName,
  projectCode,
  phaseName,
  folderName,
  authHeaders,
  userRole,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = propOnViewModeChange ?? setInternalViewMode;

  const fetchFolderDrawings = useCallback(async () => {
    if (!projectCode || !authHeaders) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vault/projects/${projectCode}/documents`, {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        const normTarget = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Find matching folder
        const matchedFolder = data.folders?.find((f: any) => {
          const normF = f.folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normCat = f.categoryCode.toLowerCase().replace(/[^a-z0-9]/g, '');
          return (
            normF.includes(normTarget) ||
            normTarget.includes(normF) ||
            normCat.includes(normTarget) ||
            normTarget.includes(normCat)
          );
        }) || data.folders?.[0];

        if (matchedFolder) {
          setActiveFolderId(matchedFolder.id);
          const mapped: DrawingItem[] = (matchedFolder.documents || []).map((doc: any) => {
            const cleanTitle = doc.fileName
              .replace(/\.[^/.]+$/, '')
              .replace(/^[A-Za-z0-9-]+_[a-z0-9]+_/i, '')
              .replace(/_/g, ' ');

            return {
              id: doc.id,
              title: cleanTitle || doc.fileName,
              code: doc.isDwg ? 'DWG' : 'PDF',
              version: doc.isApprovedDrawing ? 'Approved' : 'V1',
              status: doc.isApprovedDrawing ? 'Approved' : 'Pending',
              fileSize: formatBytes(doc.fileSizeBytes),
              uploadedBy: doc.uploader?.fullName || 'Architect',
              date: new Date(doc.createdAt).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }),
              isDwg: doc.isDwg,
              previewKey: doc.previewKey,
            };
          });
          setDrawings(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to load drawings from DB', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectCode, folderName, authHeaders]);

  useEffect(() => {
    fetchFolderDrawings();
  }, [fetchFolderDrawings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectCode || !authHeaders) return;

    setIsUploading(true);
    try {
      const res = await fetch('/api/vault/presigned-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          projectCode,
          filename: file.name,
          folderId: activeFolderId || undefined,
          fileSizeBytes: file.size,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Drawing "${file.name}" uploaded successfully and saved to database!`);
        await fetchFolderDrawings();
      } else {
        alert(`Upload rejected: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.message || 'Network error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filtered = drawings.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canUpload = userRole === 'ADMIN' || userRole === 'STAFF';

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".pdf,.dwg,.dxf,.dgn,.jpg,.jpeg,.png,.webp"
        style={{ display: 'none' }}
      />

      {/* Subpage Header & Breadcrumb (Figma: 29:1034) */}
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <span
            className="figma-breadcrumb-link"
            onClick={onNavigateProjects || onBack}
            title="Projects"
          >
            Projects
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span
            className="figma-breadcrumb-link"
            onClick={onNavigateDetail || onBack}
            title={projectName}
          >
            {projectName}
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active" title={folderName}>
            {folderName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              {folderName}
            </h2>
          </div>

          {canUpload && (
            <button
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
              }}
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
            </button>
          )}
        </div>

        {/* Search & Toggle Bar (Figma: 170:3292) */}
        <div className="figma-search-row">
          <div className="figma-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="figma-search-input"
              placeholder="Search Drawing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <MobileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {isLoading && drawings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869', fontSize: '14px' }}>
          Loading drawings from vault database...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px' }}>
          <FolderKanban size={40} color="#BF935A" style={{ margin: '0 auto 12px auto' }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0C0C0D' }}>
            {searchQuery ? `No drawings match "${searchQuery}"` : 'No drawings in this folder yet'}
          </h4>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#686869' }}>
            {canUpload ? 'Upload drawings (.pdf, .dwg) directly into this folder.' : 'Drawings uploaded by architects will appear here.'}
          </p>
          {canUpload && (
            <button
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
        /* GRID VIEW FOR DRAWINGS */
        <div className="figma-drawings-grid-container">
          {filtered.map((drawing) => {
            const isApproved = drawing.status === 'Approved';
            const isPending = drawing.status === 'Pending';
            const dotColor = isApproved ? '#12B76A' : isPending ? '#F79009' : '#175CD3';

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
                    marginBottom: '10px',
                  }}
                >
                  <FileText size={18} />
                </div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0', color: '#0C0C0D', lineHeight: 1.25 }}>
                  {drawing.title}
                </h4>
                <div style={{ fontSize: '11px', color: '#686869', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span>{drawing.code}</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: '#BF935A' }}>{drawing.fileSize}</span>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor }} />
                  <span style={{ color: dotColor }}>{drawing.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW FOR DRAWINGS (Figma: 29:1034) */
        <div className="figma-list-container">
          {filtered.map((drawing) => {
            const isApproved = drawing.status === 'Approved';
            const isPending = drawing.status === 'Pending';
            const dotColor = isApproved ? '#12B76A' : isPending ? '#F79009' : '#175CD3';

            return (
              <div
                key={drawing.id}
                className="figma-item-card"
                onClick={() => onSelectDrawing(drawing)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                    }}
                  >
                    <FileText size={20} />
                  </div>

                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 3px 0', color: '#0C0C0D' }}>
                      {drawing.title}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{drawing.code}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 600, color: '#BF935A' }}>{drawing.fileSize}</span>
                      <span>•</span>
                      <span>{drawing.date}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }} />
                      <span style={{ color: dotColor }}>{drawing.status}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight size={20} color="#979798" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
