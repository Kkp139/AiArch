import React, { useState } from 'react';
import { ChevronLeft, Search, FileText, ChevronRight } from 'lucide-react';
import { MobileViewToggle } from './MobileViewToggle';

export interface DrawingItem {
  id: string;
  title: string;
  code: string;
  version: string;
  status: 'Approved' | 'Pending' | 'In Review';
  fileSize: string;
  uploadedBy: string;
  date: string;
}

export interface MobileDrawingFolderViewProps {
  projectName: string;
  phaseName: string;
  folderName: string;
  onBack: () => void;
  onSelectDrawing: (drawing: DrawingItem) => void;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

const SAMPLE_DRAWINGS: DrawingItem[] = [
  {
    id: 'dwg-1',
    title: 'Site Plan',
    code: 'A101',
    version: 'V2',
    status: 'Approved',
    fileSize: '2.4 MB',
    uploadedBy: 'John Doe',
    date: '12 Oct 2026, 10:30 AM',
  },
  {
    id: 'dwg-2',
    title: 'Ground Floor Plan',
    code: 'A102',
    version: 'V2',
    status: 'Pending',
    fileSize: '4.1 MB',
    uploadedBy: 'Farhaz Patel',
    date: '18 Oct 2026, 02:15 PM',
  },
  {
    id: 'dwg-3',
    title: 'Level Plan',
    code: 'A103',
    version: 'V1',
    status: 'In Review',
    fileSize: '3.8 MB',
    uploadedBy: 'John Doe',
    date: '20 Oct 2026, 11:45 AM',
  },
  {
    id: 'dwg-4',
    title: 'Location Plan',
    code: 'A104',
    version: 'V2',
    status: 'Approved',
    fileSize: '1.9 MB',
    uploadedBy: 'Farhaz Patel',
    date: '22 Oct 2026, 04:00 PM',
  },
  {
    id: 'dwg-5',
    title: 'Site Selection & Setback',
    code: 'A105',
    version: 'V2',
    status: 'Pending',
    fileSize: '2.8 MB',
    uploadedBy: 'Priya Mehta',
    date: '23 Oct 2026, 09:30 AM',
  },
  {
    id: 'dwg-6',
    title: 'Site Elevation & Grading',
    code: 'A106',
    version: 'V2',
    status: 'Approved',
    fileSize: '5.2 MB',
    uploadedBy: 'John Doe',
    date: '24 Oct 2026, 05:20 PM',
  },
];

export const MobileDrawingFolderView: React.FC<MobileDrawingFolderViewProps> = ({
  projectName,
  phaseName,
  folderName,
  onBack,
  onSelectDrawing,
  viewMode: propViewMode,
  onViewModeChange: propOnViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'list' | 'grid'>('list');
  const [searchQuery, setSearchQuery] = useState('');

  const viewMode = propViewMode ?? internalViewMode;
  const setViewMode = propOnViewModeChange ?? setInternalViewMode;

  const filtered = SAMPLE_DRAWINGS.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      {/* Subpage Header & Breadcrumb (Figma: 29:1034) */}
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <span onClick={onBack} style={{ cursor: 'pointer' }}>Projects</span>
          <span>&gt;</span>
          <span>{projectName}</span>
          <span>&gt;</span>
          <span className="active">{folderName}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <button className="figma-back-btn" onClick={onBack}>
            <ChevronLeft size={24} />
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
            {folderName}
          </h2>
        </div>

        {/* Search & Toggle Bar (Figma: 170:3292) */}
        <div className="figma-search-row">
          <div className="figma-search-input-wrap">
            <Search size={18} />
            <input
              type="text"
              className="figma-search-input"
              placeholder="Search Drawing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <MobileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#686869' }}>
          No drawings found matching "{searchQuery}".
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW FOR DRAWINGS */
        <div className="figma-drawings-grid-container">
          {filtered.map((drawing) => {
            const isApproved = drawing.status === 'Approved';
            const isPending = drawing.status === 'Pending';
            const dotColor = isApproved ? '#12B76A' : isPending ? '#F79009' : '#175CD3';

            return (
              <div
                key={drawing.id}
                className="figma-drawing-grid-card"
                onClick={() => onSelectDrawing(drawing)}
              >
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
                    marginBottom: '10px',
                  }}
                >
                  <FileText size={18} />
                </div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 4px 0', color: '#0C0C0D', lineHeight: 1.25 }}>
                  {drawing.title}
                </h4>
                <div style={{ fontSize: '11px', color: '#686869', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                  <span>{drawing.code}</span>
                  <span>•</span>
                  <span style={{ fontWeight: 600, color: '#BF935A' }}>{drawing.version}</span>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: dotColor }} />
                  <span style={{ color: dotColor }}>{drawing.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW FOR DRAWINGS (Figma: 29:1034) */
        <div className="figma-list-container">
          {filtered.map((drawing) => {
            const isApproved = drawing.status === 'Approved';
            const isPending = drawing.status === 'Pending';
            const dotColor = isApproved ? '#12B76A' : isPending ? '#F79009' : '#175CD3';

            return (
              <div
                key={drawing.id}
                className="figma-item-card"
                onClick={() => onSelectDrawing(drawing)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#352618',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <FileText size={20} />
                  </div>

                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 3px 0', color: '#0C0C0D' }}>
                      {drawing.title}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{drawing.code}</span>
                      <span>•</span>
                      <span style={{ fontWeight: 600, color: '#BF935A' }}>{drawing.version}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }} />
                      <span style={{ color: dotColor }}>{drawing.status}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight size={20} color="#979798" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
