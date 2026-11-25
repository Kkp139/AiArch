import React, { useState } from 'react';
import { Search, FolderKanban, Plus, MapPin, ChevronLeft, Loader2 } from 'lucide-react';
import { ProjectSummary } from '../../App';
import { UserRole } from '../../context/AuthContext';
import { MobileViewToggle } from './MobileViewToggle';

export interface MobileProjectsViewProps {
  projects: ProjectSummary[];
  userRole?: UserRole;
  canCreateProject?: boolean;
  selectedProjectCode?: string;
  isLoading?: boolean;
  onSelectProject?: (project: ProjectSummary) => void;
  onOpenProjectDetail?: (projectCode: string) => void;
  onCreateProject?: () => void;
  onCreateProjectClick?: () => void;
  onBack?: () => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

function getStatusBadgeStyle(status?: string): { bg: string; color: string; label: string } {
  switch ((status || '').toUpperCase()) {
    case 'COMPLETED':
      return { bg: '#ECFDF3', color: '#027A48', label: 'Completed' };
    case 'ON_HOLD':
      return { bg: '#FFFAEB', color: '#B54708', label: 'On Hold' };
    case 'DRAFT':
      return { bg: '#F2F4F7', color: '#475467', label: 'Draft' };
    case 'ACTIVE':
    default:
      return { bg: '#ECFDF3', color: '#027A48', label: 'Active' };
  }
}

export const MobileProjectsView: React.FC<MobileProjectsViewProps> = ({
  projects,
  userRole,
  canCreateProject,
  selectedProjectCode,
  isLoading = false,
  onSelectProject,
  onOpenProjectDetail,
  onCreateProject,
  onCreateProjectClick,
  onBack,
  viewMode: propViewMode,
  onViewModeChange: propOnViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = propOnViewModeChange ?? setInternalViewMode;

  const showCreateButton = Boolean(
    (canCreateProject ?? userRole === 'ADMIN') && (onCreateProjectClick || onCreateProject)
  );
  const handleCreate = onCreateProjectClick || onCreateProject;
  const handleSelect = (proj: ProjectSummary) => {
    if (onOpenProjectDetail) {
      onOpenProjectDetail(proj.projectCode);
    }
    if (onSelectProject) {
      onSelectProject(proj);
    }
  };

  const filtered = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.siteLocation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Subpage Header & Breadcrumb */}
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          {onBack && (
            <>
              <span className="figma-breadcrumb-link" onClick={onBack}>
                Home
              </span>
              <span className="figma-breadcrumb-sep">&gt;</span>
            </>
          )}
          <span className="active">Projects</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onBack && (
              <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Back">
                <ChevronLeft size={24} />
              </button>
            )}
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Projects ({filtered.length})
            </h2>
          </div>

          {showCreateButton && handleCreate && (
            <button
              type="button"
              onClick={handleCreate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 14px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>New</span>
            </button>
          )}
        </div>

        <div className="figma-search-row">
          <div className="figma-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="figma-search-input"
              placeholder="Search project name, code or site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <MobileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Loading / Empty / Data states */}
      {isLoading && projects.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#686869',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Loader2 size={28} color="#352618" className="animate-spin" />
          <p style={{ margin: 0, fontSize: '13px' }}>Loading assigned projects...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#686869' }}>
          <FolderKanban size={40} color="#BF935A" style={{ margin: '0 auto 12px auto', opacity: 0.7 }} />
          <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#0C0C0D' }}>
            {searchQuery ? `No projects match "${searchQuery}"` : 'No projects assigned yet'}
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
            {userRole === 'ADMIN' && !searchQuery
              ? 'Create a project to initialize its 16 standard architectural folders.'
              : 'Projects assigned to your account will appear here.'}
          </p>
          {showCreateButton && handleCreate && !searchQuery && (
            <button
              type="button"
              onClick={handleCreate}
              style={{
                marginTop: '14px',
                backgroundColor: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Create First Project
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="figma-project-grid-container">
          {filtered.map((proj) => {
            const pct =
              typeof proj.completionPercentage === 'number'
                ? Math.round(proj.completionPercentage)
                : Math.round(((proj.populatedFolders ?? 0) / 16) * 100);
            const badge = getStatusBadgeStyle(proj.status);

            return (
              <div
                key={proj.id}
                className="figma-project-grid-card"
                onClick={() => handleSelect(proj)}
                style={
                  selectedProjectCode === proj.projectCode
                    ? { borderColor: '#352618', boxShadow: '0 4px 12px rgba(53,38,24,0.12)' }
                    : undefined
                }
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '6px',
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#BF935A' }}>
                    {proj.projectCode}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: badge.color,
                      background: badge.bg,
                      padding: '2px 7px',
                      borderRadius: '6px',
                    }}
                  >
                    {badge.label}
                  </span>
                </div>

                <h3 className="figma-project-title">{proj.name}</h3>

                <div className="figma-project-client">
                  {proj.category || 'Architectural Project'}
                </div>

                {proj.siteLocation && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#686869',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    <MapPin size={11} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {proj.siteLocation}
                    </span>
                  </div>
                )}

                <div className="figma-project-stats">
                  <span>{proj.documentCount ?? 0} files</span>
                  <span>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="figma-project-list-container">
          {filtered.map((proj) => {
            const pct =
              typeof proj.completionPercentage === 'number'
                ? Math.round(proj.completionPercentage)
                : Math.round(((proj.populatedFolders ?? 0) / 16) * 100);
            const badge = getStatusBadgeStyle(proj.status);

            return (
              <div
                key={proj.id}
                className="figma-project-list-row"
                onClick={() => handleSelect(proj)}
                style={
                  selectedProjectCode === proj.projectCode
                    ? { borderColor: '#352618' }
                    : undefined
                }
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '3px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#BF935A' }}>
                      {proj.projectCode}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: badge.color,
                        background: badge.bg,
                        padding: '1px 6px',
                        borderRadius: '5px',
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: '#0C0C0D',
                      marginBottom: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {proj.name}
                  </div>

                  <div style={{ fontSize: '12px', color: '#686869' }}>
                    {proj.category || 'Architecture'}
                    {proj.siteLocation ? ` • ${proj.siteLocation}` : ''}
                    {` • ${proj.documentCount ?? 0} files (${proj.populatedFolders ?? 0}/16)`}
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginLeft: '12px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#352618' }}>{pct}%</div>
                  <div style={{ fontSize: '10px', color: '#686869' }}>progress</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
