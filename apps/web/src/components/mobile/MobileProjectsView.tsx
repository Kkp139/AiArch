import React, { useState } from 'react';
import { ProjectSummary } from '../../App';
import { Search, LayoutGrid, List, Plus, ChevronRight, Building2 } from 'lucide-react';

export interface MobileProjectsViewProps {
  projects: ProjectSummary[];
  selectedProjectCode: string;
  onSelectProject: (code: string) => void;
  onOpenProjectDetail: (code: string) => void;
  onCreateProjectClick?: () => void;
  canCreateProject?: boolean;
}

export const MobileProjectsView: React.FC<MobileProjectsViewProps> = ({
  projects,
  selectedProjectCode,
  onSelectProject,
  onOpenProjectDetail,
  onCreateProjectClick,
  canCreateProject = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.siteLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1 }}>
      {/* Subpage Header (Figma: 170:3265) */}
      <div className="figma-subpage-header">
        <div className="figma-header-nav-row">
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Projects</h2>
          {canCreateProject && onCreateProjectClick && (
            <button className="figma-btn-gold" onClick={onCreateProjectClick}>
              <Plus size={16} />
              <span>Create project</span>
            </button>
          )}
        </div>

        {/* Search & Toggle Bar */}
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

          <div className="figma-view-toggle">
            <button
              className={`figma-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              className={`figma-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Projects List Container */}
      <div className="figma-list-container">
        {filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#686869' }}>
            No architectural projects found matching "{searchQuery}".
          </div>
        ) : (
          filteredProjects.map((project) => {
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
          })
        )}
      </div>
    </div>
  );
};
