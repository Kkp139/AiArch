import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  LucideIcon,
  FolderKanban,
  FileText,
  LayoutGrid,
  List,
  Search,
  Filter,
  Plus,
  Compass,
  Layers,
  Box,
  Palette,
  Eye,
  HardHat,
  Flame,
  Wind,
  Grid,
  Zap,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  FolderOpen,
} from 'lucide-react';
import { DesktopBlueprintViewer, BlueprintSheet } from './DesktopBlueprintViewer';
import './desktop.css';

export interface VaultFolder {
  id: string;
  name: string;
  code: string;
  phase: 'CONCEPT' | 'CONSTRUCTION' | 'OTHER';
  sheetCount: number;
  icon: LucideIcon;
  description: string;
}

export const OFFICIAL_16_FOLDERS: VaultFolder[] = [
  // 6 Concept Folders
  { id: '01_SITE_DRGS', name: 'Site Drawings & Topography', code: '01', phase: 'CONCEPT', sheetCount: 4, icon: Compass, description: 'Topographical contours, boundary geometry, setback coordinates' },
  { id: '02_ZONING_PLANNING', name: 'Zoning & Space Planning', code: '02', phase: 'CONCEPT', sheetCount: 3, icon: Layers, description: 'Spatial bubble diagrams, circulation corridors, FAR computations' },
  { id: '03_SPACE_OBJECT_DESIGN', name: 'Space & Object Studies', code: '03', phase: 'CONCEPT', sheetCount: 5, icon: Box, description: 'Bespoke built-ins, spatial volumes, courtyard fenestrations' },
  { id: '04_COMPLETE_SET_DRGS', name: 'Complete Architectural Package', code: '04', phase: 'CONCEPT', sheetCount: 6, icon: FolderKanban, description: 'Comprehensive schematic set for client sign-off' },
  { id: '05_MATERIAL_SELECTION', name: 'Material Selection & Moodboards', code: '05', phase: 'CONCEPT', sheetCount: 4, icon: Palette, description: 'Travertine stone, warm limestone, smoked oak, brushed brass' },
  { id: '06_3D_IMAGES', name: '3D Photorealistic CGI Renders', code: '06', phase: 'CONCEPT', sheetCount: 8, icon: Eye, description: 'Daylight & dusk atmospheric exterior and interior visuals' },

  // 9 Construction Folders
  { id: '07_CIVIL_DRGS', name: 'Civil Footing & Columns', code: '07', phase: 'CONSTRUCTION', sheetCount: 5, icon: HardHat, description: 'Structural footings, plinth beams, column centerline schedule' },
  { id: '08_PLUMBING_DRGS', name: 'Plumbing & Drainage', code: '08', phase: 'CONSTRUCTION', sheetCount: 4, icon: FileText, description: 'Soil waste piping, rainwater harvesting, septic sump sections' },
  { id: '09_FIRE_DRGS', name: 'Fire Hydrant & Safety', code: '09', phase: 'CONSTRUCTION', sheetCount: 2, icon: Flame, description: 'Fire escape egress, extinguisher niches, hose reel layouts' },
  { id: '10_HVAC_DRGS', name: 'HVAC Ducting & Chilled Water', code: '10', phase: 'CONSTRUCTION', sheetCount: 3, icon: Wind, description: 'VRV outdoor units, ceiling duct routes, supply diffusers' },
  { id: '11_FLOORING_DRGS', name: 'Flooring & Finishes', code: '11', phase: 'CONSTRUCTION', sheetCount: 6, icon: Grid, description: 'Italian marble patterns, skirting details, tile setting out' },
  { id: '12_CEILING_DRGS', name: 'Reflected Ceiling & Lighting', code: '12', phase: 'CONSTRUCTION', sheetCount: 4, icon: Layers, description: 'False ceiling coves, recessed architectural lighting drop points' },
  { id: '13_ELECTRICAL_DRGS', name: 'Electrical SLD & Conduit', code: '13', phase: 'CONSTRUCTION', sheetCount: 5, icon: Zap, description: 'Distribution boards, conduit wall chases, switch automation' },
  { id: '14_WALL_ELEVATION', name: 'Wall Elevations & Sections', code: '14', phase: 'CONSTRUCTION', sheetCount: 5, icon: FileText, description: 'Internal feature wall paneling, external facade louvers' },
  { id: '15_ELEMENT_DRGS', name: 'Joinery & Element Details', code: '15', phase: 'CONSTRUCTION', sheetCount: 4, icon: Box, description: 'Custom stair railings, bespoke wardrobe joinery, door frames' },

  // 1 Catch-All Folder
  { id: '03_OTHER', name: 'Other Reference & Handover', code: '16', phase: 'OTHER', sheetCount: 2, icon: FolderKanban, description: 'Statutory approvals, site surveys, commissioning logs' },
];

export interface DesktopProjectsViewProps {
  userRole?: UserRole;
  projectCode?: string;
  projectName?: string;
  onOpenUpload?: (folderId: string) => void;
}

export const DesktopProjectsView: React.FC<DesktopProjectsViewProps> = ({
  userRole = 'ADMIN',
  projectCode = 'AF-VILLA',
  projectName = 'Courtyard Villa Luxury Residence',
  onOpenUpload,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activePhaseFilter, setActivePhaseFilter] = useState<'ALL' | 'CONCEPT' | 'CONSTRUCTION' | 'OTHER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<VaultFolder | null>(null);
  const [activeBlueprintSheet, setActiveBlueprintSheet] = useState<BlueprintSheet | null>(null);

  // Filter 16 folders by active tab & search query
  const filteredFolders = OFFICIAL_16_FOLDERS.filter((folder) => {
    const matchesPhase = activePhaseFilter === 'ALL' || folder.phase === activePhaseFilter;
    const matchesSearch =
      folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPhase && matchesSearch;
  });

  // Sample drawing sheets for selected folder
  const sampleFolderSheets: BlueprintSheet[] = selectedFolder
    ? [
        {
          id: `${selectedFolder.id}-001`,
          title: `${selectedFolder.name} - General Setting Out Geometry`,
          code: `${projectCode}-${selectedFolder.code}-001`,
          revision: 'Rev 02',
          category: selectedFolder.name,
          scale: '1:100',
          sheetSize: 'A1',
          status: 'Approved',
          date: '2026-11-03',
          uploadedBy: 'Rajesh Patel (Architect)',
        },
        {
          id: `${selectedFolder.id}-002`,
          title: `${selectedFolder.name} - Technical Dimensions & Sections`,
          code: `${projectCode}-${selectedFolder.code}-002`,
          revision: 'Rev 01',
          category: selectedFolder.name,
          scale: '1:50',
          sheetSize: 'A1',
          status: 'In Review',
          date: '2026-11-04',
          uploadedBy: 'Priya Mehta (Staff)',
        },
        {
          id: `${selectedFolder.id}-003`,
          title: `${selectedFolder.name} - Construction Specification Notes`,
          code: `${projectCode}-${selectedFolder.code}-003`,
          revision: 'Rev 01',
          category: selectedFolder.name,
          scale: 'NTS',
          sheetSize: 'A3',
          status: 'Pending',
          date: '2026-11-05',
          uploadedBy: 'Sonu Sharma (BIM Lead)',
        },
      ]
    : [];

  return (
    <div className="desk-projects-view" data-testid="desktop-projects-view">
      {/* Top Breadcrumb & Project Header */}
      <div className="desk-projects-header">
        <div>
          <div className="desk-breadcrumb">
            <span
              className="desk-breadcrumb-item clickable"
              onClick={() => setSelectedFolder(null)}
              data-testid="breadcrumb-projects"
            >
              Projects
            </span>
            <span className="desk-breadcrumb-sep">/</span>
            <span className="desk-breadcrumb-item active">{projectCode}</span>
            {selectedFolder && (
              <>
                <span className="desk-breadcrumb-sep">/</span>
                <span className="desk-breadcrumb-item active">{selectedFolder.name}</span>
              </>
            )}
          </div>
          <h1 className="desk-page-title">{projectName}</h1>
          <p className="desk-page-subtitle">
            16-Folder Central Architectural Vault • {OFFICIAL_16_FOLDERS.length} Canonical Sub-Directories
          </p>
        </div>

        <div className="desk-header-actions">
          {/* Grid vs Table View Mode Switcher */}
          <div className="desk-view-mode-toggle" data-testid="view-mode-toggle">
            <button
              type="button"
              className={`desk-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
              aria-label="Grid View"
              data-testid="view-toggle-grid"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`desk-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
              data-testid="view-toggle-table"
            >
              <List size={16} />
            </button>
          </div>

          {onOpenUpload && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={() => onOpenUpload(selectedFolder ? selectedFolder.id : '01_SITE_DRGS')}
              data-testid="upload-drawing-btn"
            >
              <Plus size={16} />
              <span>Upload Drawing</span>
            </button>
          )}
        </div>
      </div>

      {/* When NO folder is selected: Show 16-Folder Vault View */}
      {!selectedFolder ? (
        <>
          {/* Phase Filter Tabs & Search Bar */}
          <div className="desk-vault-controls">
            <div className="desk-phase-tabs" data-testid="phase-tabs">
              <button
                type="button"
                className={`desk-phase-tab ${activePhaseFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setActivePhaseFilter('ALL')}
                data-testid="phase-tab-all"
              >
                All Folders (16)
              </button>
              <button
                type="button"
                className={`desk-phase-tab ${activePhaseFilter === 'CONCEPT' ? 'active' : ''}`}
                onClick={() => setActivePhaseFilter('CONCEPT')}
                data-testid="phase-tab-concept"
              >
                Concept Design (6 Folders)
              </button>
              <button
                type="button"
                className={`desk-phase-tab ${activePhaseFilter === 'CONSTRUCTION' ? 'active' : ''}`}
                onClick={() => setActivePhaseFilter('CONSTRUCTION')}
                data-testid="phase-tab-construction"
              >
                Construction Design (9 Folders)
              </button>
              <button
                type="button"
                className={`desk-phase-tab ${activePhaseFilter === 'OTHER' ? 'active' : ''}`}
                onClick={() => setActivePhaseFilter('OTHER')}
                data-testid="phase-tab-other"
              >
                03 Other / Reference (1)
              </button>
            </div>

            <div className="desk-filter-search">
              <Search size={16} style={{ color: 'var(--desk-text-muted)' }} />
              <input
                type="text"
                placeholder="Filter 16 folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter folders"
                data-testid="folder-search-input"
              />
            </div>
          </div>

          {/* High-Density 16-Folder Grid View */}
          {viewMode === 'grid' ? (
            <div className="desk-16-folder-grid" data-testid="folder-grid">
              {filteredFolders.map((folder) => {
                const Icon = folder.icon;
                return (
                  <div
                    key={folder.id}
                    className="desk-folder-card"
                    onClick={() => setSelectedFolder(folder)}
                    data-testid={`folder-card-${folder.id}`}
                  >
                    <div className="desk-folder-card-top">
                      <div className="desk-folder-icon-box">
                        <Icon size={22} />
                      </div>
                      <span className="desk-folder-phase-badge">
                        {folder.phase === 'CONCEPT'
                          ? 'Concept'
                          : folder.phase === 'CONSTRUCTION'
                          ? 'Construction'
                          : 'Other'}
                      </span>
                    </div>

                    <div className="desk-folder-card-info">
                      <h3 className="desk-folder-name">{folder.name}</h3>
                      <p className="desk-folder-desc">{folder.description}</p>
                    </div>

                    <div className="desk-folder-card-bottom">
                      <span className="desk-sheet-count">
                        <FileText size={13} />
                        <span>{folder.sheetCount} Drawing Sheets</span>
                      </span>
                      <ChevronRight size={16} className="desk-folder-arrow" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="desk-table-container" data-testid="folder-table">
              <table className="desk-data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Folder Name & Scope</th>
                    <th>Design Phase</th>
                    <th>Sheet Count</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFolders.map((folder) => {
                    const Icon = folder.icon;
                    return (
                      <tr
                        key={folder.id}
                        className="clickable-row"
                        onClick={() => setSelectedFolder(folder)}
                        data-testid={`folder-row-${folder.id}`}
                      >
                        <td className="mono font-bold">{folder.code}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="desk-table-icon">
                              <Icon size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{folder.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--desk-text-muted)' }}>
                                {folder.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="desk-folder-phase-badge">
                            {folder.phase}
                          </span>
                        </td>
                        <td>{folder.sheetCount} Sheets</td>
                        <td>
                          <button
                            type="button"
                            className="desk-btn-row-open"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFolder(folder);
                            }}
                          >
                            <span>Open Vault</span>
                            <ArrowRight size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        /* Folder Drawing Sheets View */
        <div className="desk-folder-detail-view" data-testid="folder-sheets-view">
          <div className="desk-folder-detail-top">
            <button
              type="button"
              className="desk-btn desk-btn-secondary"
              onClick={() => setSelectedFolder(null)}
              data-testid="back-to-vault-btn"
            >
              <ChevronLeft size={16} />
              <span>Back to 16 Folders</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="desk-badge-count">{sampleFolderSheets.length} Sheets Available</span>
            </div>
          </div>

          <div className="desk-table-container">
            <table className="desk-data-table">
              <thead>
                <tr>
                  <th>Drawing Code</th>
                  <th>Sheet Title</th>
                  <th>Revision</th>
                  <th>Scale / Size</th>
                  <th>Status</th>
                  <th>Date & Submitter</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sampleFolderSheets.map((sheet) => (
                  <tr
                    key={sheet.id}
                    className="clickable-row"
                    onClick={() => setActiveBlueprintSheet(sheet)}
                    data-testid={`sheet-row-${sheet.id}`}
                  >
                    <td className="mono font-bold" style={{ color: 'var(--desk-gold)' }}>
                      {sheet.code}
                    </td>
                    <td style={{ fontWeight: 600 }}>{sheet.title}</td>
                    <td>
                      <span className="desk-rev-badge">{sheet.revision}</span>
                    </td>
                    <td>{sheet.scale} @ {sheet.sheetSize}</td>
                    <td>
                      {sheet.status === 'Approved' ? (
                        <span className="desk-status-pill approved">
                          <CheckCircle2 size={12} /> Approved
                        </span>
                      ) : (
                        <span className="desk-status-pill pending">
                          <AlertCircle size={12} /> {sheet.status}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>{sheet.date}</div>
                      <div style={{ fontSize: '11px', color: 'var(--desk-text-muted)' }}>
                        {sheet.uploadedBy}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="desk-btn desk-btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveBlueprintSheet(sheet);
                        }}
                        data-testid={`inspect-blueprint-${sheet.id}`}
                      >
                        <Eye size={14} />
                        <span>Inspect CAD</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Embedded Large Blueprint CAD Viewer Modal */}
      {activeBlueprintSheet && (
        <DesktopBlueprintViewer
          sheet={activeBlueprintSheet}
          onClose={() => setActiveBlueprintSheet(null)}
          onDownload={() =>
            alert(`Downloading High-Resolution Blueprint: ${activeBlueprintSheet.code}.dwg`)
          }
        />
      )}
    </div>
  );
};
