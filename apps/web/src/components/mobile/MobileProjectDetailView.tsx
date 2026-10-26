import React, { useState } from 'react';
import { ProjectSummary } from '../../App';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  FolderKanban,
  FileText,
  Layers,
  Box,
  Compass,
  Palette,
  Eye,
  HardHat,
  Flame,
  Wind,
  Zap,
  Grid,
} from 'lucide-react';
import { MobileViewToggle } from './MobileViewToggle';

export interface MobileProjectDetailViewProps {
  project: ProjectSummary;
  onBack: () => void;
  onSelectCategory: (phase: 'concept' | 'construction', folderName: string) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

// 8 Concept Folders (Figma: 39:1002)
const CONCEPT_FOLDERS = [
  { name: 'Site Drawings', count: 4, icon: Compass },
  { name: 'Zoning / Planning', count: 3, icon: Layers },
  { name: 'Space / Object Design', count: 5, icon: Box },
  { name: 'Complete Set of Drawings', count: 6, icon: FolderKanban },
  { name: 'Material Selection', count: 4, icon: Palette },
  { name: '3D Images', count: 2, icon: Eye },
  { name: 'Greenfield House', count: 3, icon: Compass },
  { name: 'Lakeview Residence', count: 3, icon: Layers },
];

// 9 Construction Folders (Figma: 40:1199)
const CONSTRUCTION_FOLDERS = [
  { name: 'Civil Drawings', count: 5, icon: HardHat },
  { name: 'Plumbing Drawings', count: 4, icon: FileText },
  { name: 'Fire Drawings', count: 2, icon: Flame },
  { name: 'HVAC Drawings', count: 3, icon: Wind },
  { name: 'Flooring Drawings', count: 4, icon: Grid },
  { name: 'Ceiling Drawings', count: 3, icon: Layers },
  { name: 'Electrical Drawings', count: 5, icon: Zap },
  { name: 'Wall Elevation', count: 4, icon: FileText },
  { name: 'Element Drawings', count: 3, icon: Box },
];

export const MobileProjectDetailView: React.FC<MobileProjectDetailViewProps> = ({
  project,
  onBack,
  onSelectCategory,
  viewMode: propViewMode,
  onViewModeChange: propOnViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid'>('list');
  const [conceptExpanded, setConceptExpanded] = useState(true);
  const [constructionExpanded, setConstructionExpanded] = useState(true);
  const [selectedPhaseGrid, setSelectedPhaseGrid] = useState<'concept' | 'construction' | null>(null);

  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = propOnViewModeChange ?? setInternalViewMode;

  const handleBack = () => {
    if (viewMode === 'grid' && selectedPhaseGrid) {
      setSelectedPhaseGrid(null);
    } else {
      onBack();
    }
  };

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Subpage Header & Breadcrumb (Figma: 180:3845 / 28:1226 / 39:1002 / 40:1199) */}
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <span className="figma-breadcrumb-link" onClick={onBack} title="Projects">
            Projects
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span
            onClick={() => {
              if (selectedPhaseGrid) setSelectedPhaseGrid(null);
            }}
            className={selectedPhaseGrid ? 'figma-breadcrumb-link' : 'active'}
            title={project.name}
          >
            {project.name}
          </span>
          {selectedPhaseGrid && (
            <>
              <span className="figma-breadcrumb-sep">&gt;</span>
              <span className="active">
                {selectedPhaseGrid === 'concept' ? 'Concept Design' : 'Construction'}
              </span>
            </>
          )}
        </div>

        {/* Action Bar with Title & Group Button Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <button className="figma-back-btn" onClick={handleBack} title="Back">
              <ChevronLeft size={24} />
            </button>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                color: '#0C0C0D',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedPhaseGrid
                ? selectedPhaseGrid === 'concept'
                  ? 'Concept Design'
                  : 'Construction'
                : project.name}
            </h2>
          </div>

          {/* Group Button Toggle (Figma: 170:3292) */}
          <MobileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {viewMode === 'grid' ? (
        /* GRID VIEW FLOW */
        selectedPhaseGrid === null ? (
          /* Figma 28:1226: 2 Phase Hero Cards side by side */
          <div className="figma-phase-cards-row">
            {/* 1. Concept Design Card */}
            <div
              className="figma-phase-hero-card"
              onClick={() => setSelectedPhaseGrid('concept')}
            >
              <div className="figma-phase-hero-img-wrap">
                <img
                  src="/assets/projects/concept_design.jpg"
                  alt="Concept Design"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <h3 className="figma-phase-hero-title">Concept Design</h3>
              <p className="figma-phase-hero-count">24 Drawings</p>
            </div>

            {/* 2. Construction Design Card */}
            <div
              className="figma-phase-hero-card"
              onClick={() => setSelectedPhaseGrid('construction')}
            >
              <div className="figma-phase-hero-img-wrap">
                <img
                  src="/assets/projects/construction_structure.jpg"
                  alt="Construction Design"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <h3 className="figma-phase-hero-title">Construction Design</h3>
              <p className="figma-phase-hero-count">24 Drawings</p>
            </div>
          </div>
        ) : selectedPhaseGrid === 'concept' ? (
          /* Figma 39:1002: Concept Design 3-Column Category Grid */
          <div className="figma-category-grid-container">
            {CONCEPT_FOLDERS.map((folder) => {
              const Icon = folder.icon;
              return (
                <div
                  key={folder.name}
                  className="figma-category-grid-card"
                  onClick={() => onSelectCategory('concept', folder.name)}
                >
                  <div className="figma-category-grid-icon-wrap">
                    <Icon size={18} />
                  </div>
                  <div className="figma-category-grid-title">
                    {folder.name}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Figma 40:1199: Construction 3-Column Category Grid */
          <div className="figma-category-grid-container">
            {CONSTRUCTION_FOLDERS.map((folder) => {
              const Icon = folder.icon;
              return (
                <div
                  key={folder.name}
                  className="figma-category-grid-card"
                  onClick={() => onSelectCategory('construction', folder.name)}
                >
                  <div className="figma-category-grid-icon-wrap">
                    <Icon size={18} />
                  </div>
                  <div className="figma-category-grid-title">
                    {folder.name}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* LIST VIEW FLOW (Figma: 180:3845) */
        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* PHASE 1: CONCEPT DESIGN ACCORDION */}
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
                    background: '#F8EFE4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src="/assets/projects/concept_design.jpg"
                    alt="Concept"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
                    Concept Design
                  </h3>
                  <div style={{ fontSize: '13px', color: '#686869', marginTop: '2px' }}>
                    24 Drawings . 6 Categories
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
                {CONCEPT_FOLDERS.map((folder, idx) => {
                  const Icon = folder.icon;
                  return (
                    <div
                      key={folder.name}
                      onClick={() => onSelectCategory('concept', folder.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        borderBottom: idx < CONCEPT_FOLDERS.length - 1 ? '1px solid #F5F5F7' : 'none',
                        transition: 'background 0.15s ease',
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
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0C0C0D' }}>
                          {folder.name}
                        </span>
                      </div>
                      <ChevronRight size={18} color="#979798" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* PHASE 2: CONSTRUCTION ACCORDION */}
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
                  }}
                >
                  <img
                    src="/assets/projects/construction_structure.jpg"
                    alt="Construction"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
                    Construction
                  </h3>
                  <div style={{ fontSize: '13px', color: '#686869', marginTop: '2px' }}>
                    36 Drawings . 10 Categories
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
                {CONSTRUCTION_FOLDERS.map((folder, idx) => {
                  const Icon = folder.icon;
                  return (
                    <div
                      key={folder.name}
                      onClick={() => onSelectCategory('construction', folder.name)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        borderBottom: idx < CONSTRUCTION_FOLDERS.length - 1 ? '1px solid #F5F5F7' : 'none',
                        transition: 'background 0.15s ease',
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
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#0C0C0D' }}>
                          {folder.name}
                        </span>
                      </div>
                      <ChevronRight size={18} color="#979798" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
