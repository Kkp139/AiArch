import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

export interface MobileViewToggleProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  className?: string;
}

export const MobileViewToggle: React.FC<MobileViewToggleProps> = ({
  viewMode,
  onViewModeChange,
  className = '',
}) => {
  return (
    <div className={`figma-group-toggle ${className}`} role="group" aria-label="View toggle">
      <button
        type="button"
        className={`figma-group-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
        onClick={() => onViewModeChange('grid')}
        title="Grid View"
        aria-label="Grid View"
        aria-pressed={viewMode === 'grid'}
      >
        <LayoutGrid size={18} />
      </button>
      <button
        type="button"
        className={`figma-group-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onViewModeChange('list')}
        title="List View"
        aria-label="List View"
        aria-pressed={viewMode === 'list'}
      >
        <List size={18} />
      </button>
    </div>
  );
};
