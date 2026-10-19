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

export function DocumentExplorer({
  projectCode,
  userRole,
  clientName = 'Client Representative',
  userEmail = 'client@example.com',
}: DocumentExplorerProps) {
  const [categories, setCategories] = useState<VaultCategory[]>(INITIAL_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState('01_ARCHITECTURAL_PLANS');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activePreviewFile, setActivePreviewFile] = useState<VaultFileItem | null>(null);

  // 16-Category Progress Calculation: (count_with_files / 16) * 100%
  const populatedCategoriesCount = categories.filter((c) => c.fileCount > 0).length;
  const progressPercentage = Math.round((populatedCategoriesCount / 16) * 100);

  const sampleFiles: VaultFileItem[] = [
    {
      id: 'doc-1',
      fileName: `${projectCode}_ARCH_PLANS_GroundFloor_v3.dwg`,
      fileSize: 4.8 * 1024 * 1024,
      mimeType: 'image/vnd.dwg',
      revisionNumber: 3,
      categoryFolder: '01_ARCHITECTURAL_PLANS',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'doc-2',
      fileName: `${projectCode}_ARCH_PLANS_FirstFloor_v2.dwg`,
      fileSize: 5.2 * 1024 * 1024,
      mimeType: 'image/vnd.dwg',
      revisionNumber: 2,
      categoryFolder: '01_ARCHITECTURAL_PLANS',
      updatedAt: new Date().toISOString(),
    },
  ];

  const handleUploadComplete = (result: UploadResult) => {
    // Update fileCount of target folder
    setCategories((prev) =>
      prev.map((c) => (c.id === result.routedCategory ? { ...c, fileCount: c.fileCount + 1 } : c))
    );
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
            files={sampleFiles}
            onOpenFile={(file) => setActivePreviewFile(file)}
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
