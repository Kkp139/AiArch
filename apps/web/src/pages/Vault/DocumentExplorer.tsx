import React, { useState } from 'react';
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

const INITIAL_CATEGORIES: VaultCategory[] = [
  // Concept Design (6)
  { id: '01_SITE_CONTEXT', name: '01 Site Context', group: 'CONCEPT', fileCount: 1 },
  { id: '02_MOOD_BOARDS', name: '02 Mood Boards', group: 'CONCEPT', fileCount: 1 },
  { id: '03_ZONING_DIAGRAMS', name: '03 Zoning Diagrams', group: 'CONCEPT', fileCount: 0 },
  { id: '04_SKETCHES', name: '04 Initial Sketches', group: 'CONCEPT', fileCount: 2 },
  { id: '05_MASSING_STUDIES', name: '05 Massing Studies', group: 'CONCEPT', fileCount: 0 },
  { id: '06_PRESENTATION_DECKS', name: '06 Client Presentations', group: 'CONCEPT', fileCount: 1 },

  // Construction Drawings (9)
  { id: '01_ARCHITECTURAL_PLANS', name: '01 Architectural Plans', group: 'CONSTRUCTION', fileCount: 4 },
  { id: '02_STRUCTURAL_DRAWINGS', name: '02 Structural Drawings', group: 'CONSTRUCTION', fileCount: 2 },
  { id: '03_PLUMBING_SANITARY', name: '03 Plumbing & Sanitary', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '04_ELECTRICAL_LAYOUTS', name: '04 Electrical Layouts', group: 'CONSTRUCTION', fileCount: 1 },
  { id: '05_HVAC_DUCTING', name: '05 HVAC & Ventilation', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '06_INTERIOR_DETAILS', name: '06 Interior Millwork & Finishes', group: 'CONSTRUCTION', fileCount: 3 },
  { id: '07_LANDSCAPE_CIVIL', name: '07 Landscape & Hardscape', group: 'CONSTRUCTION', fileCount: 0 },
  { id: '08_SPECIFICATIONS_BOQ', name: '08 Specs & Bill of Quantities', group: 'CONSTRUCTION', fileCount: 1 },
  { id: '09_PERMITS_APPROVALS', name: '09 Municipal Approvals', group: 'CONSTRUCTION', fileCount: 0 },

  // Catch-All (1)
  { id: '03_OTHER', name: '03 Other / Reference', group: 'OTHER', fileCount: 1 },
];

const INITIAL_VAULT_FILES: VaultFileItem[] = [
  {
    id: 'doc-1',
    fileName: 'AF-VILLA_ARCH_PLANS_GroundFloor_v3.dwg',
    fileSize: 4.8 * 1024 * 1024,
    mimeType: 'image/vnd.dwg',
    revisionNumber: 3,
    categoryFolder: '01_ARCHITECTURAL_PLANS',
    updatedAt: '2026-10-18T10:30:00Z',
  },
  {
    id: 'doc-2',
    fileName: 'AF-VILLA_ARCH_PLANS_FirstFloor_v2.dwg',
    fileSize: 5.2 * 1024 * 1024,
    mimeType: 'image/vnd.dwg',
    revisionNumber: 2,
    categoryFolder: '01_ARCHITECTURAL_PLANS',
    updatedAt: '2026-10-17T15:20:00Z',
  },
  {
    id: 'doc-3',
    fileName: 'AF-VILLA_STRUCT_DWG_FoundationSchedule_v2.dwg',
    fileSize: 3.9 * 1024 * 1024,
    mimeType: 'image/vnd.dwg',
    revisionNumber: 2,
    categoryFolder: '02_STRUCTURAL_DRAWINGS',
    updatedAt: '2026-10-16T12:00:00Z',
  },
  {
    id: 'doc-4',
    fileName: 'AF-VILLA_ELEC_LAY_Switchboard_v1.dwg',
    fileSize: 2.1 * 1024 * 1024,
    mimeType: 'image/vnd.dwg',
    revisionNumber: 1,
    categoryFolder: '04_ELECTRICAL_LAYOUTS',
    updatedAt: '2026-10-15T09:40:00Z',
  },
  {
    id: 'doc-5',
    fileName: 'AF-VILLA_INT_DET_LivingRoomCeiling_v1.dwg',
    fileSize: 6.4 * 1024 * 1024,
    mimeType: 'image/vnd.dwg',
    revisionNumber: 1,
    categoryFolder: '06_INTERIOR_DETAILS',
    updatedAt: '2026-10-17T16:15:00Z',
  },
  {
    id: 'doc-6',
    fileName: 'AF-VILLA_BOQ_SanitaryFixtures_v1.pdf',
    fileSize: 1.1 * 1024 * 1024,
    mimeType: 'application/pdf',
    revisionNumber: 1,
    categoryFolder: '08_SPECIFICATIONS_BOQ',
    updatedAt: '2026-10-14T14:10:00Z',
  },
  {
    id: 'doc-7',
    fileName: 'AF-VILLA_SITE_CTX_TopographicalSurvey_v1.pdf',
    fileSize: 8.7 * 1024 * 1024,
    mimeType: 'application/pdf',
    revisionNumber: 1,
    categoryFolder: '01_SITE_CONTEXT',
    updatedAt: '2026-10-10T11:00:00Z',
  },
  {
    id: 'doc-8',
    fileName: 'AF-VILLA_SKETCH_FacadeInitialConcept_v2.pdf',
    fileSize: 3.4 * 1024 * 1024,
    mimeType: 'application/pdf',
    revisionNumber: 2,
    categoryFolder: '04_SKETCHES',
    updatedAt: '2026-10-12T17:30:00Z',
  },
  {
    id: 'doc-9',
    fileName: 'AF-VILLA_OTHER_ClientMeetingNotes_v1.pdf',
    fileSize: 0.5 * 1024 * 1024,
    mimeType: 'application/pdf',
    revisionNumber: 1,
    categoryFolder: '03_OTHER',
    updatedAt: '2026-10-18T18:00:00Z',
  },
];

export function DocumentExplorer({
  projectCode,
  userRole,
  clientName = 'Client Representative',
  userEmail = 'client@example.com',
}: DocumentExplorerProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState('01_ARCHITECTURAL_PLANS');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<VaultFileItem | null>(null);

  // Persistent Vault Files state
  const [files, setFiles] = useState<VaultFileItem[]>(() => {
    const saved = localStorage.getItem('af_vault_files');
    return saved ? JSON.parse(saved) : INITIAL_VAULT_FILES;
  });

  // Sync to localStorage
  React.useEffect(() => {
    localStorage.setItem('af_vault_files', JSON.stringify(files));
  }, [files]);

  // Dynamically compute file count per category from actual files
  const categories: VaultCategory[] = React.useMemo(() => {
    return INITIAL_CATEGORIES.map((cat) => ({
      ...cat,
      fileCount: files.filter((f) => f.categoryFolder === cat.id).length,
    }));
  }, [files]);

  // 16-Category Progress Calculation: (count_with_files / 16) * 100%
  const populatedCategoriesCount = categories.filter((c) => c.fileCount > 0).length;
  const progressPercentage = Math.round((populatedCategoriesCount / 16) * 100);

  // Files belonging to currently active category folder
  const currentFolderFiles = files.filter((f) => f.categoryFolder === selectedCategoryId);

  const handleUploadComplete = (result: UploadResult) => {
    const newFile: VaultFileItem = {
      id: `doc-${Date.now()}`,
      fileName: result.finalFileName,
      fileSize: result.file.size || 2.5 * 1024 * 1024,
      mimeType: result.file.type || 'image/vnd.dwg',
      revisionNumber: 1,
      categoryFolder: result.routedCategory,
      updatedAt: new Date().toISOString(),
    };

    setFiles((prev) => [newFile, ...prev]);
    // Auto-switch to the category where file was placed so user sees it instantly
    setSelectedCategoryId(result.routedCategory);
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
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)' }}>
              Project Vault
            </span>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {projectCode} Document Explorer
            </h3>
          </div>

          {/* 16-Category Progress Meter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 14px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Workflow Progress</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                  {progressPercentage}% ({populatedCategoriesCount}/16 Categories)
                </span>
              </div>
              <div
                style={{
                  width: '160px',
                  height: '6px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progressPercentage}%`,
                    height: '100%',
                    backgroundColor: 'var(--accent-gold)',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Action */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            backgroundColor: 'var(--accent-gold)',
            color: '#0d0f12',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          <Upload size={16} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Main Vault Explorer Workspace: Sidebar Tree + Content Grid */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TreeView
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <GridView
            files={currentFolderFiles}
            onOpenFile={(file) => setActivePreviewFile(file)}
            onDownloadFile={(file) => alert(`Downloading secure watermarked file: ${file.fileName}`)}
            onDeleteFile={userRole === 'ADMIN' || userRole === 'STAFF' ? handleDeleteFile : undefined}
            isViewOnly={userRole === 'CLIENT_VIEWER'}
          />
        </div>
      </div>

      {/* Upload Modal with Interactive Rename Warning */}
      <UploadModal
        projectCode={projectCode}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadComplete}
      />

      {/* Embedded DWG Preview Viewer Modal */}
      {activePreviewFile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 1100,
            padding: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '90vw', height: '85vh' }}>
            <button
              onClick={() => setActivePreviewFile(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                color: '#ffffff',
                fontSize: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Close Preview
            </button>
            <DwgViewer
              documentId={activePreviewFile.id}
              documentTitle={activePreviewFile.fileName}
              previewUrl="/sample-preview.pdf"
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
