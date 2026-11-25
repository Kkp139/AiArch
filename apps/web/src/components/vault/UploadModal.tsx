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

// Map short category codes to official 16 Appendix A folder names
const CATEGORY_MAP: Record<string, string> = {
  ARCH_PLANS: '01_ARCHITECTURAL_PLANS',
  SITE: '01_SITE_DRGS',
  SITE_DRGS: '01_SITE_DRGS',
  SITEDRGS: '01_SITE_DRGS',
  SITE_CTX: '01_SITE_DRGS',
  ZON_DIAG: '02_ZONING_PLANNING',
  ZONING: '02_ZONING_PLANNING',
  ZONING_PLANNING: '02_ZONING_PLANNING',
  SPACE: '03_SPACE_OBJECT_DESIGN',
  SKETCH: '03_SPACE_OBJECT_DESIGN',
  MASS_STD: '03_SPACE_OBJECT_DESIGN',
  SPACE_OBJECT_DESIGN: '03_SPACE_OBJECT_DESIGN',
  COMPLETE_SET: '04_COMPLETE_SET_DRGS',
  PRES_DCK: '04_COMPLETE_SET_DRGS',
  COMPLETE_SET_DRGS: '04_COMPLETE_SET_DRGS',
  MATERIAL_SELECTION: '05_MATERIAL_SELECTION',
  MOOD_BRD: '05_MATERIAL_SELECTION',
  MATERIALS: '05_MATERIAL_SELECTION',
  '3D_IMAGES': '06_3D_IMAGES',
  RENDERS: '06_3D_IMAGES',
  CIVIL: '07_CIVIL_DRGS',
  CIVILDRGS: '07_CIVIL_DRGS',
  STRUCT_DWG: '07_CIVIL_DRGS',
  LAND_CIV: '07_CIVIL_DRGS',
  CIVIL_DRGS: '07_CIVIL_DRGS',
  PLUMBING: '08_PLUMBING_DRGS',
  PLUMBINGDRGS: '08_PLUMBING_DRGS',
  PLUMB_SAN: '08_PLUMBING_DRGS',
  PLUMBING_DRGS: '08_PLUMBING_DRGS',
  FIRE: '09_FIRE_DRGS',
  FIREDRGS: '09_FIRE_DRGS',
  PERMITS: '09_FIRE_DRGS',
  FIRE_DRGS: '09_FIRE_DRGS',
  HVAC: '10_HVAC_DRGS',
  HVACDRGS: '10_HVAC_DRGS',
  HVAC_DUCT: '10_HVAC_DRGS',
  HVAC_DRGS: '10_HVAC_DRGS',
  FLOORING: '11_FLOORING_DRGS',
  FLOORINGDRGS: '11_FLOORING_DRGS',
  FLOORING_DRGS: '11_FLOORING_DRGS',
  CEILING: '12_CEILING_DRGS',
  CEILINGDRGS: '12_CEILING_DRGS',
  CEILING_DRGS: '12_CEILING_DRGS',
  ELECTRICAL: '13_ELECTRICAL_DRGS',
  ELECTRICALDRGS: '13_ELECTRICAL_DRGS',
  ELEC_LAY: '13_ELECTRICAL_DRGS',
  ELECTRICAL_DRGS: '13_ELECTRICAL_DRGS',
  WALL_ELEVATION: '14_WALL_ELEVATION',
  WALLELEVATION: '14_WALL_ELEVATION',
  INT_DET: '14_WALL_ELEVATION',
  ELEMENTS: '15_ELEMENT_DRGS',
  ELEMENTDRGS: '15_ELEMENT_DRGS',
  BOQ: '15_ELEMENT_DRGS',
  ELEMENT_DRGS: '15_ELEMENT_DRGS',
  OTHER: '03_OTHER',
};

// Check standard naming format: [Project]_[Category]_[SubCategory]_[FileName].[ext]
export function checkNamingConvention(filename: string): { matches: boolean; routedCategory: string } {
  const parts = filename.split('_');
  if (parts.length >= 4) {
    const twoPartCode = `${parts[1]}_${parts[2]}`.toUpperCase();
    const singleCode = parts[1].toUpperCase();
    const folder =
      CATEGORY_MAP[twoPartCode] ||
      CATEGORY_MAP[singleCode] ||
      (singleCode.startsWith('0') ? singleCode : null);
    if (folder) {
      return { matches: true, routedCategory: folder };
    }
    // If 4 parts but unrecognized code, can route to structured code or other
    return { matches: true, routedCategory: '01_SITE_DRGS' };
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
