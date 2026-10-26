import React, { useState } from 'react';
import { ProjectSummary } from '../../App';
import { Search, Plus, Building2, CalendarDays } from 'lucide-react';
import { MobileViewToggle } from './MobileViewToggle';

export interface MobileProjectsViewProps {
  projects: ProjectSummary[];
  selectedProjectCode: string;
  onSelectProject: (code: string) => void;
  onOpenProjectDetail: (code: string) => void;
  onCreateProjectClick?: () => void;
  canCreateProject?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export const MobileProjectsView: React.FC<MobileProjectsViewProps> = ({
  projects,
  selectedProjectCode,
  onSelectProject,
  onOpenProjectDetail,
  onCreateProjectClick,
  canCreateProject = true,
  viewMode: propViewMode,
  onViewModeChange: propOnViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = propOnViewModeChange ?? setInternalViewMode;

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.siteLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1 }}>
      {/* Subpage Header (Figma: 170:3265 / 170:3515) */}
      <div className="figma-subpage-header">
        <div className="figma-header-nav-row">
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>Projects</h2>
          {canCreateProject && onCreateProjectClick && (
            <button className="figma-btn-gold" onClick={onCreateProjectClick}>
              <Plus size={16} />
              <span>Create project</span>
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
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <MobileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {filteredProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#686869' }}>
          No architectural projects found matching "{searchQuery}".
        </div>
      ) : viewMode === 'grid' ? (
        /* Figma 170:3515: 3-Column Grid View */
        <div className="figma-project-grid-container">
          {filteredProjects.map((project) => {
            const isSelected = project.projectCode === selectedProjectCode;
            return (
              <div
                key={project.id}
                className="figma-project-grid-card"
                onClick={() => {
                  onSelectProject(project.projectCode);
                  onOpenProjectDetail(project.projectCode);
                }}
                style={{
                  border: isSelected ? '1.5px solid #BF935A' : '1px solid #EAEAED',
                }}
              >
                <div className="figma-project-grid-icon-wrap">
                  <CalendarDays size={20} />
                </div>
                <div className="figma-project-grid-title" title={project.name}>
                  {project.name}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Figma 170:3265: List View */
        <div className="figma-list-container">
          {filteredProjects.map((project) => {
            const isSelected = project.projectCode === selectedProjectCode;
            return (
              <div
                key={project.id}
                className="figma-item-card"
                onClick={() => {
                  onSelectProject(project.projectCode);
                  onOpenProjectDetail(project.projectCode);
                }}
                style={{
                  border: isSelected ? '1.5px solid #BF935A' : '1px solid rgba(0, 0, 0, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '12px',
                        backgroundColor: '#EFE8DE',
                        color: '#BF935A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0', color: '#0C0C0D' }}>
                        {project.name}
                      </h3>
                      <div style={{ fontSize: '13px', color: '#686869' }}>
                        Client : {project.category || 'Aakash Mehta'}
                      </div>
                    </div>
                  </div>

                  <span className="figma-badge figma-badge-active">Active</span>
                </div>

                {/* Progress Meter */}
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#686869' }}>
                    <span>Project progress</span>
                    <span style={{ fontWeight: 700, color: '#0C0C0D' }}>
                      {project.completionPercentage}%
                    </span>
                  </div>
                  <div className="figma-progress-track">
                    <div
                      className="figma-progress-fill"
                      style={{ width: `${project.completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

