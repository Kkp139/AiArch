import React, { useState } from 'react';
import { AlertTriangle, Upload, X, Check, Edit2 } from 'lucide-react';

export interface UploadResult {
  file: File;
  finalFileName: string;
  routedCategory: string;
}

export interface UploadModalProps {
  projectCode: string;
  isOpen: boolean;
  onClose: () => void;
  onUpload: (result: UploadResult) => void;
}

// Map short category codes to folder names
const CATEGORY_MAP: Record<string, string> = {
  ARCH_PLANS: '01_ARCHITECTURAL_PLANS',
  STRUCT_DWG: '02_STRUCTURAL_DRAWINGS',
  PLUMB_SAN: '03_PLUMBING_SANITARY',
  ELEC_LAY: '04_ELECTRICAL_LAYOUTS',
  HVAC_DUCT: '05_HVAC_DUCTING',
  INT_DET: '06_INTERIOR_DETAILS',
  LAND_CIV: '07_LANDSCAPE_CIVIL',
  BOQ: '08_SPECIFICATIONS_BOQ',
  PERMITS: '09_PERMITS_APPROVALS',
  SITE_CTX: '01_SITE_CONTEXT',
  MOOD_BRD: '02_MOOD_BOARDS',
  ZON_DIAG: '03_ZONING_DIAGRAMS',
  SKETCH: '04_SKETCHES',
  MASS_STD: '05_MASSING_STUDIES',
  PRES_DCK: '06_PRESENTATION_DECKS',
};

// Check standard naming format: [Project]_[Category]_[SubCategory]_[FileName].[ext]
export function checkNamingConvention(filename: string): { matches: boolean; routedCategory: string } {
  const parts = filename.split('_');
  if (parts.length >= 4) {
    const categoryCode = parts[1].toUpperCase();
    const folder = CATEGORY_MAP[categoryCode] || (categoryCode.startsWith('0') ? categoryCode : null);
    if (folder) {
      return { matches: true, routedCategory: folder };
    }
    // If 4 parts but unrecognized code, can route to structured code or other
    return { matches: true, routedCategory: '01_ARCHITECTURAL_PLANS' };
  }
  return { matches: false, routedCategory: '03_OTHER' };
}

export function UploadModal({ projectCode, isOpen, onClose, onUpload }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFileName, setCurrentFileName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInputValue, setRenameInputValue] = useState('');
  const [warningDismissed, setWarningDismissed] = useState(false);

  if (!isOpen) return null;

  const { matches, routedCategory } = checkNamingConvention(currentFileName);
  const showWarning = !!selectedFile && !matches && !warningDismissed;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setCurrentFileName(file.name);
      setRenameInputValue(`${projectCode}_ARCH_PLANS_GroundFloor_v1.${file.name.split('.').pop()}`);
      setIsRenaming(false);
      setWarningDismissed(false);
    }
  };

  const handleApplyRename = () => {
    if (renameInputValue.trim()) {
      setCurrentFileName(renameInputValue.trim());
      setIsRenaming(false);
    }
  };

  const handleProceedToOther = () => {
    if (!selectedFile) return;
    onUpload({
      file: selectedFile,
      finalFileName: currentFileName,
      routedCategory: '03_OTHER',
    });
    onClose();
  };

  const handleUploadConforming = () => {
    if (!selectedFile) return;
    onUpload({
      file: selectedFile,
      finalFileName: currentFileName,
      routedCategory: routedCategory || '01_ARCHITECTURAL_PLANS',
    });
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          width: '540px',
          maxWidth: '90vw',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Upload Document - Project {projectCode}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>

        {/* File Input */}
        <div style={{ marginBottom: '20px' }}>
          <label
            htmlFor="file-upload"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              marginBottom: '8px',
            }}
          >
            Select File:
          </label>
          <input
            id="file-upload"
            aria-label="select file"
            type="file"
            onChange={handleFileChange}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          />
        </div>

        {/* Non-conforming Warning Modal Banner */}
        {showWarning && (
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--accent-amber)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <AlertTriangle size={20} color="var(--accent-amber)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
                  Naming Convention Warning
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                  The filename <strong>"{currentFileName}"</strong> does not match the standard naming format:{' '}
                  <code>[Project]_[Category]_[SubCategory]_[FileName]</code>.
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Please rename your file, otherwise it will store in <strong>03_OTHER</strong> folder.
                </p>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setIsRenaming(true)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#0d0f12',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Edit2 size={13} />
                    <span>Rename Now</span>
                  </button>

                  <button
                    onClick={handleProceedToOther}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    Upload to 03_OTHER
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inline Rename Box */}
        {isRenaming && (
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
            }}
          >
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Format: [Project]_[Category]_[SubCategory]_[Name]
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="enter formatted filename"
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
              <button
                onClick={handleApplyRename}
                style={{
                  padding: '8px 14px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#0d0f12',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Apply Rename
              </button>
            </div>
          </div>
        )}

        {/* Bottom Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              color: 'var(--text-secondary)',
              fontSize: '13px',
            }}
          >
            Cancel
          </button>

          {selectedFile && !showWarning && (
            <button
              onClick={handleUploadConforming}
              style={{
                padding: '8px 20px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Upload size={16} />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
