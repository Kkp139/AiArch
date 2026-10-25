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

export interface MobileProjectDetailViewProps {
  project: ProjectSummary;
  onBack: () => void;
  onSelectCategory: (phase: 'concept' | 'construction', folderName: string) => void;
}

// 6 Concept Folders + 10 Construction Folders (Total 16 from Appendix A Spec)
const CONCEPT_FOLDERS = [
  { name: 'Site Drawing', count: 4, icon: Compass },
  { name: 'Zoning / Planning', count: 3, icon: Layers },
  { name: 'Space / Object Design', count: 5, icon: Box },
  { name: 'Complete Set of Drawings', count: 6, icon: FolderKanban },
  { name: 'Material Selection', count: 4, icon: Palette },
  { name: '3D Images', count: 2, icon: Eye },
];

const CONSTRUCTION_FOLDERS = [
  { name: 'Civil Drawings', count: 5, icon: HardHat },
  { name: 'Plumbing Drawings', count: 4, icon: FileText },
  { name: 'Fire Drawing', count: 2, icon: Flame },
  { name: 'HVAC Drawings', count: 3, icon: Wind },
  { name: 'Flooring Drawings', count: 4, icon: Grid },
  { name: 'Ceiling Drawings', count: 3, icon: Layers },
  { name: 'Electrical Drawings', count: 5, icon: Zap },
  { name: 'Wall Elevation', count: 4, icon: FileText },
  { name: 'Element Drawings', count: 3, icon: Box },
  { name: 'Joinery / Millwork Drawings', count: 3, icon: FolderKanban },
];

export const MobileProjectDetailView: React.FC<MobileProjectDetailViewProps> = ({
  project,
  onBack,
  onSelectCategory,
}) => {
  const [conceptExpanded, setConceptExpanded] = useState(true);
  const [constructionExpanded, setConstructionExpanded] = useState(true);

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Header & Breadcrumb (Figma: 180:3845) */}
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span onClick={onBack} style={{ cursor: 'pointer' }}>Projects</span>
          <span>&gt;</span>
          <span className="active">{project.name}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-back-btn" onClick={onBack}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
            {project.name}
          </h2>
        </div>
      </div>

      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* PHASE 1: CONCEPT DESIGN ACCORDION (Figma: 180:3845) */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
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
                  background: 'linear-gradient(135deg, #F8EFE4 0%, #E8D9C5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9E743F',
                }}
              >
                <Compass size={28} />
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

            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A4A4C' }}>
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

        {/* PHASE 2: CONSTRUCTION ACCORDION (Figma: 180:3845) */}
        <div style={{ background: '#FFFFFF', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
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
                  background: 'linear-gradient(135deg, #E6EFF8 0%, #C9DBEC 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#24598C',
                }}
              >
                <HardHat size={28} />
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

            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F5F5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A4A4C' }}>
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
    </div>
  );
};
