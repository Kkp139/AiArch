import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  Layers,
  HardHat,
  FileText,
  Compass,
  Box,
  Palette,
  Eye,
  Flame,
  Wind,
  Grid,
  Zap,
  FolderKanban,
  FolderArchive,
  LucideIcon,
} from 'lucide-react';
import { ProjectSummary } from '../../App';
import { MobileViewToggle } from './MobileViewToggle';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileProjectDetailViewProps {
  project: ProjectSummary;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onBack: () => void;
  onSelectCategory: (phase: 'concept' | 'construction' | 'other', folderName: string) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

interface FolderDefinition {
  categoryCode: string;
  name: string;
  icon: LucideIcon;
}

// 6 Official Concept Folders
const CONCEPT_FOLDERS: FolderDefinition[] = [
  { categoryCode: '01_SITE_DRGS', name: 'Site Drawings', icon: Compass },
  { categoryCode: '02_ZONING_PLANNING', name: 'Zoning / Planning', icon: Layers },
  { categoryCode: '03_SPACE_OBJECT_DESIGN', name: 'Space / Object Design', icon: Box },
  { categoryCode: '04_COMPLETE_SET_DRGS', name: 'Complete Set of Drawings', icon: FolderKanban },
  { categoryCode: '05_MATERIAL_SELECTION', name: 'Material Selection', icon: Palette },
  { categoryCode: '06_3D_IMAGES', name: '3D Images', icon: Eye },
];

// 9 Official Construction Folders
const CONSTRUCTION_FOLDERS: FolderDefinition[] = [
  { categoryCode: '07_CIVIL_DRGS', name: 'Civil Drawings', icon: HardHat },
  { categoryCode: '08_PLUMBING_DRGS', name: 'Plumbing Drawings', icon: FileText },
  { categoryCode: '09_FIRE_DRGS', name: 'Fire Drawings', icon: Flame },
  { categoryCode: '10_HVAC_DRGS', name: 'HVAC Drawings', icon: Wind },
  { categoryCode: '11_FLOORING_DRGS', name: 'Flooring Drawings', icon: Grid },
  { categoryCode: '12_CEILING_DRGS', name: 'Ceiling Drawings', icon: Layers },
  { categoryCode: '13_ELECTRICAL_DRGS', name: 'Electrical Drawings', icon: Zap },
  { categoryCode: '14_WALL_ELEVATION', name: 'Wall Elevation', icon: FileText },
  { categoryCode: '15_ELEMENT_DRGS', name: 'Element Drawings', icon: Box },
];

// 16th Canonical Folder: 03_OTHER (16_OTHER in Prisma)
const OTHER_FOLDERS: FolderDefinition[] = [
  { categoryCode: '16_OTHER', name: '03_OTHER', icon: FolderArchive },
];

export const MobileProjectDetailView: React.FC<MobileProjectDetailViewProps> = ({
  project,
  authHeaders,
  getAuthHeaders,
  onBack,
  onSelectCategory,
  viewMode: propViewMode,
  onViewModeChange: propOnViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [conceptExpanded, setConceptExpanded] = useState(true);
  const [constructionExpanded, setConstructionExpanded] = useState(true);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = propOnViewModeChange ?? setInternalViewMode;

  const fetchVaultCounts = useCallback(async () => {
    if (!project.projectCode) return;
    setIsLoadingCounts(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(
        `/api/vault/projects/${encodeURIComponent(project.projectCode)}/documents`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const counts: Record<string, number> = {};
        if (Array.isArray(data.folders)) {
          for (const folder of data.folders) {
            const count =
              typeof folder.fileCount === 'number'
                ? folder.fileCount
                : Array.isArray(folder.documents)
                ? folder.documents.length
                : 0;
            if (folder.categoryCode) {
              counts[String(folder.categoryCode).toUpperCase()] = count;
            }
            if (folder.folderName) {
              counts[String(folder.folderName).toLowerCase()] = count;
            }
          }
        }
        setFolderCounts(counts);
      }
    } catch {
      // Leave counts at 0 gracefully
    } finally {
      setIsLoadingCounts(false);
    }
  }, [project.projectCode, authHeaders, getAuthHeaders]);

  useEffect(() => {
    fetchVaultCounts();
  }, [fetchVaultCounts]);

  const getCountForFolder = (folder: FolderDefinition): number => {
    if (folder.categoryCode in folderCounts) {
      return folderCounts[folder.categoryCode];
    }
    const byName = folderCounts[folder.name.toLowerCase()];
    return typeof byName === 'number' ? byName : 0;
  };

  const conceptFiltered = CONCEPT_FOLDERS.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const constructionFiltered = CONSTRUCTION_FOLDERS.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const otherFiltered = OTHER_FOLDERS.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      'other miscellaneous'.includes(searchQuery.toLowerCase())
  );

  const totalConceptDrawings = CONCEPT_FOLDERS.reduce((acc, f) => acc + getCountForFolder(f), 0);
  const totalConstructionDrawings = CONSTRUCTION_FOLDERS.reduce(
    (acc, f) => acc + getCountForFolder(f),
    0
  );
  const totalOtherDrawings = OTHER_FOLDERS.reduce((acc, f) => acc + getCountForFolder(f), 0);

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Subpage Header & Breadcrumb */}
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            Projects
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">{project.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Back to projects">
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 800,
                margin: 0,
                color: '#0C0C0D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {project.name}
            </h2>
            <div style={{ fontSize: '12px', color: '#686869', marginTop: '2px' }}>
              {project.projectCode}
              {project.siteLocation ? ` • ${project.siteLocation}` : ''}
              {isLoadingCounts ? ' • Syncing folders...' : ` • ${project.populatedFolders ?? 0}/16 active`}
            </div>
          </div>
        </div>

        {/* Search & Toggle Bar */}
        <div className="figma-search-row">
          <div className="figma-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="figma-search-input"
              placeholder="Search drawing folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <MobileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="figma-phase-list">
          {/* 1. Concept Phase Card (6 Folders) */}
          {conceptFiltered.length > 0 && (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div
                onClick={() => setConceptExpanded(!conceptExpanded)}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderBottom: conceptExpanded ? '1px solid #F0F0F2' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#F2E7D8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#352618',
                    }}
                  >
                    <Compass size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
                      Concept
                    </h3>
                    <div style={{ fontSize: '13px', color: '#686869', marginTop: '2px' }}>
                      {totalConceptDrawings} Drawings • 6 Categories
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#F5F5F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4A4A4C',
                  }}
                >
                  {conceptExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {conceptExpanded && (
                <div style={{ padding: '8px 12px' }}>
                  {conceptFiltered.map((folder, idx) => {
                    const Icon = folder.icon;
                    const count = getCountForFolder(folder);
                    return (
                      <div
                        key={folder.categoryCode}
                        onClick={() => onSelectCategory('concept', folder.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          borderBottom:
                            idx < conceptFiltered.length - 1 ? '1px solid #F5F5F7' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0C0C0D' }}>
                              {folder.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#686869' }}>
                              {count} {count === 1 ? 'file' : 'files'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} color="#979798" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 2. Construction Phase Card (9 Folders) */}
          {constructionFiltered.length > 0 && (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div
                onClick={() => setConstructionExpanded(!constructionExpanded)}
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  borderBottom: constructionExpanded ? '1px solid #F0F0F2' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: '#E6EFF8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#352618',
                    }}
                  >
                    <HardHat size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
                      Construction
                    </h3>
                    <div style={{ fontSize: '13px', color: '#686869', marginTop: '2px' }}>
                      {totalConstructionDrawings} Drawings • 9 Categories
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#F5F5F7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#4A4A4C',
                  }}
                >
                  {constructionExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {constructionExpanded && (
                <div style={{ padding: '8px 12px' }}>
                  {constructionFiltered.map((folder, idx) => {
                    const Icon = folder.icon;
                    const count = getCountForFolder(folder);
                    return (
                      <div
                        key={folder.categoryCode}
                        onClick={() => onSelectCategory('construction', folder.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          borderBottom:
                            idx < constructionFiltered.length - 1 ? '1px solid #F5F5F7' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0C0C0D' }}>
                              {folder.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#686869' }}>
                              {count} {count === 1 ? 'file' : 'files'}
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={18} color="#979798" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. Other / Miscellaneous Reference Folder (16th Standard Folder: 03_OTHER) */}
          {otherFiltered.length > 0 && (
            <div
              onClick={() => onSelectCategory('other', '03_OTHER')}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                border: '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#352618',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FolderArchive size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
                    03_OTHER
                  </h3>
                  <div style={{ fontSize: '13px', color: '#686869', marginTop: '2px' }}>
                    {totalOtherDrawings} Drawings • Miscellaneous Reference
                  </div>
                </div>
              </div>
              <ChevronRight size={18} color="#979798" />
            </div>
          )}
        </div>
      ) : (
        /* Flat List View across all 16 Folders */
        <div className="figma-project-list-container">
          {[
            ...conceptFiltered.map((f) => ({ ...f, phase: 'concept' as const, phaseLabel: 'Concept' })),
            ...constructionFiltered.map((f) => ({
              ...f,
              phase: 'construction' as const,
              phaseLabel: 'Construction',
            })),
            ...otherFiltered.map((f) => ({ ...f, phase: 'other' as const, phaseLabel: 'Other' })),
          ].map((folder) => {
            const Icon = folder.icon;
            const count = getCountForFolder(folder);
            return (
              <div
                key={folder.categoryCode}
                className="figma-project-list-row"
                onClick={() => onSelectCategory(folder.phase, folder.name)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#0C0C0D' }}>
                      {folder.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#686869' }}>
                      {folder.phaseLabel} • {count} {count === 1 ? 'file' : 'files'}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="#979798" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
