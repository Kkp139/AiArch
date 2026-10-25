import React, { useState, useEffect } from 'react';
import { TreeView, VaultCategory } from '../../components/vault/TreeView';
import { GridView, VaultFileItem } from '../../components/vault/GridView';
import { UploadModal, UploadResult } from '../../components/vault/UploadModal';
import { DwgViewer } from '../../components/vault/DwgViewer';
import { UserRole } from '../../context/AuthContext';
import { Upload, LayoutGrid, ListFilter, CheckCircle2 } from 'lucide-react';

export interface DocumentExplorerProps {
  projectCode: string;
  userRole: UserRole;
  clientName?: string;
  userEmail?: string;
}

// SPECIFICATION APPENDIX A: Official 16 Folders
const STANDARD_16_CATEGORIES: VaultCategory[] = [
  // Concept Design (6)
  { id: '01_SITE_DRGS', name: '01 Site Drawings & Topographic Layout', group: 'CONCEPT', fileCount: 0 },
  { id: '02_ZONING_PLANNING', name: '02 Zoning & Space Planning', group: 'CONCEPT', fileCount: 0 },
  { id: '03_SPACE_OBJECT_DESIGN', name: '03 Space & Object Studies', group: 'CONCEPT', fileCount: 0 },
  { id: '04_COMPLETE_SET_DRGS', name: '04 Complete Architectural Schematic Package', group: 'CONCEPT', fileCount: 0 },
  { id: '05_MATERIAL_SELECTION', name: '05 Material Selection & Moodboards', group: 'CONCEPT', fileCount: 0 },
  { id: '06_3D_IMAGES', name: '06 3D Photorealistic CGI Renders', group: 'CONCEPT', fileCount: 0 },

  // Construction Drawings (9)
  { id: '07_CIVIL_DRGS', name: '07 Civil Footing & Column Layouts', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '08_PLUMBING_DRGS', name: '08 Plumbing & Drainage Schematics', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '09_FIRE_DRGS', name: '09 Fire Hydrant & Life Safety Plans', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '10_HVAC_DRGS', name: '10 HVAC Chilled Water & Ducting', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '11_FLOORING_DRGS', name: '11 Marble & Tile Flooring Layouts', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '12_CEILING_DRGS', name: '12 Reflected Ceiling & Lighting Drops', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '13_ELECTRICAL_DRGS', name: '13 Electrical SLD & Power Conduit Routes', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '14_WALL_ELEVATION', name: '14 Internal & External Wall Elevations', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '15_ELEMENT_DRGS', name: '15 Architectural Joinery & Element Details', group: 'CONSTRUCTION', fileCount: 0 },

  // Catch-All (1)
  { id: '03_OTHER', name: '03 Other / Miscellaneous Reference', group: 'OTHER', fileCount: 0 },
];

export function DocumentExplorer({
  projectCode,
  userRole,
  clientName = 'Client Representative',
  userEmail = 'client@example.com',
}: DocumentExplorerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('01_SITE_DRGS');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<VaultFileItem | null>(null);
  const [files, setFiles] = useState<VaultFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real documents from Supabase API
  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/vault/projects/${projectCode}/documents`);
      if (res.ok) {
        const data = await res.json();
        const allFiles: VaultFileItem[] = [];

        data.folders?.forEach((folder: any) => {
          folder.documents?.forEach((doc: any) => {
            allFiles.push({
              id: doc.id,
              fileName: doc.fileName,
              fileSize: doc.fileSizeBytes || 2.5 * 1024 * 1024,
              mimeType: doc.mimeType,
              revisionNumber: 1,
              categoryFolder: folder.categoryCode === '16_OTHER' ? '03_OTHER' : folder.categoryCode,
              updatedAt: doc.createdAt,
            });
          });
        });

        setFiles(allFiles);
      }
    } catch (e) {
      console.error('Failed to load documents from API', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [projectCode]);

  // Dynamically compute file count per category from actual files
  const categories: VaultCategory[] = React.useMemo(() => {
    return STANDARD_16_CATEGORIES.map((cat) => ({
      ...cat,
      fileCount: files.filter((f) => f.categoryFolder === cat.id || (cat.id === '03_OTHER' && f.categoryFolder === '16_OTHER')).length,
    }));
  }, [files]);

  // 16-Category Progress Calculation: (count_with_files / 16) * 100%
  const populatedCategoriesCount = categories.filter((c) => c.fileCount > 0).length;
  const progressPercentage = Math.round((populatedCategoriesCount / 16) * 100);

  // Files belonging to currently active category folder
  const currentFolderFiles = files.filter((f) => f.categoryFolder === selectedCategoryId || (selectedCategoryId === '03_OTHER' && f.categoryFolder === '16_OTHER'));

  const handleUploadComplete = async (result: UploadResult) => {
    try {
      // Post upload to live API
      await fetch('/api/vault/presigned-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectCode,
          filename: result.finalFileName,
          fileSizeBytes: result.file.size,
        }),
      });

      // Refresh documents from API
      await fetchDocuments();
      setSelectedCategoryId(result.routedCategory === '16_OTHER' ? '03_OTHER' : result.routedCategory);
    } catch (err) {
      console.error('Upload failed', err);
    }
  };

  const handleDeleteFile = (fileToDelete: VaultFileItem) => {
    if (confirm(`Are you sure you want to delete "${fileToDelete.fileName}"?`)) {
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 128px)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Top Progress & Action Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-tertiary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
              Unified Progress (16 Folders)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-gold)' }}>
                {progressPercentage}%
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                ({populatedCategoriesCount}/16 Categories Populated)
              </span>
            </div>
          </div>

          {/* Minimal Progress Bar */}
          <div
            style={{
              width: '180px',
              height: '6px',
              backgroundColor: 'var(--border-strong)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: 'var(--accent-gold)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Upload Button: Allowed for Admin and Staff */}
          {(userRole === 'ADMIN' || userRole === 'STAFF') && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Upload size={16} />
              <span>Upload Drawing</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left Pane: Interactive Tree View */}
        <div
          style={{
            width: '320px',
            borderRight: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-secondary)',
            overflowY: 'auto',
          }}
        >
          <TreeView
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
          />
        </div>

        {/* Right Pane: Grid/Card View & Preview Area */}
        <div
          style={{
            flex: 1,
            backgroundColor: 'var(--bg-primary)',
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          <GridView
            files={currentFolderFiles}
            onOpenFile={setActivePreviewFile}
            onDeleteFile={handleDeleteFile}
            isViewOnly={userRole === 'CLIENT_VIEWER'}
          />
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <UploadModal
          isOpen={isUploadModalOpen}
          projectCode={projectCode}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleUploadComplete}
        />
      )}

      {/* High-Resolution DWG / Vector Preview Modal with Dynamic Stamping */}
      {activePreviewFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
            <button
              onClick={() => setActivePreviewFile(null)}
              style={{
                backgroundColor: '#21262d',
                color: '#f0f6fc',
                border: '1px solid #30363d',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ✕ Close Preview
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <DwgViewer
              documentId={activePreviewFile.id}
              documentTitle={activePreviewFile.fileName}
              previewUrl={`https://afdesign-vault-prod.r2.cloudflarestorage.com/${activePreviewFile.fileName}`}
              projectCode={projectCode}
              userRole={userRole}
              clientName={clientName}
              userEmail={userEmail}
            />
          </div>
        </div>
      )}
    </div>
  );
}
