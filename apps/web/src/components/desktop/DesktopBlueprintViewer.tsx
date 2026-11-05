import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  X,
  Layers,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Eye,
  EyeOff,
} from 'lucide-react';
import './desktop.css';

export interface BlueprintSheet {
  id: string;
  title: string;
  code: string;
  revision: string;
  category: string;
  scale?: string;
  sheetSize?: string;
  status: 'Approved' | 'Pending' | 'In Review';
  date: string;
  uploadedBy: string;
  previewUrl?: string;
  layers?: { id: string; name: string; visible: boolean }[];
}

export interface DesktopBlueprintViewerProps {
  sheet: BlueprintSheet;
  onClose: () => void;
  onDownload?: () => void;
}

export const DesktopBlueprintViewer: React.FC<DesktopBlueprintViewerProps> = ({
  sheet,
  onClose,
  onDownload,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState<'metadata' | 'layers'>('metadata');
  const [layers, setLayers] = useState(
    sheet.layers || [
      { id: 'dim', name: 'Grid Lines & Dimension Strings', visible: true },
      { id: 'walls', name: 'Load Bearing Walls & Columns', visible: true },
      { id: 'doors', name: 'Doors, Fenestrations & Glazing', visible: true },
      { id: 'mep', name: 'MEP Conduits & Plumbing Sleeves', visible: false },
      { id: 'anno', name: 'Architectural Annotations & Hatch', visible: true },
    ]
  );

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => {
    setZoomLevel(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  return (
    <div className="desk-blueprint-modal-overlay" data-testid="desktop-blueprint-viewer">
      <div className="desk-blueprint-modal-container">
        {/* Top Header Bar */}
        <div className="desk-blueprint-header">
          <div className="desk-blueprint-title-box">
            <span className="desk-blueprint-code">{sheet.code}</span>
            <span className="desk-blueprint-title">{sheet.title}</span>
            <span className="desk-rev-badge">{sheet.revision}</span>
          </div>

          <div className="desk-blueprint-header-actions">
            {onDownload && (
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={onDownload}
                data-testid="blueprint-download-btn"
                title="Download DWG / PDF"
              >
                <Download size={15} />
                <span>Download</span>
              </button>
            )}
            <button
              type="button"
              className="desk-btn-close"
              onClick={onClose}
              data-testid="blueprint-close-btn"
              aria-label="Close Blueprint Viewer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Center Canvas + Right Inspector Split */}
        <div className="desk-blueprint-body">
          {/* CAD Blueprint Viewport */}
          <div className="desk-blueprint-canvas-viewport" data-testid="blueprint-canvas-area">
            {/* Pan & Zoom Toolbar */}
            <div className="desk-blueprint-toolbar" data-testid="blueprint-toolbar">
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleZoomIn}
                title="Zoom In (+25%)"
                aria-label="Zoom In"
                data-testid="zoom-in-btn"
              >
                <ZoomIn size={16} />
              </button>
              <span className="desk-zoom-text" data-testid="zoom-level-text">{zoomLevel}%</span>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleZoomOut}
                title="Zoom Out (-25%)"
                aria-label="Zoom Out"
                data-testid="zoom-out-btn"
              >
                <ZoomOut size={16} />
              </button>
              <div className="desk-toolbar-divider" />
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleResetZoom}
                title="Reset Zoom to 100%"
                aria-label="Reset Zoom"
                data-testid="zoom-reset-btn"
              >
                1:1
              </button>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleRotate}
                title="Rotate 90° Clockwise"
                aria-label="Rotate"
                data-testid="rotate-btn"
              >
                <RotateCw size={16} />
              </button>
            </div>

            {/* Simulated High-Res Blueprint Grid Canvas */}
            <div
              className="desk-blueprint-canvas-paper"
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
            >
              {/* Studio Border & Title Block */}
              <div className="desk-cad-border">
                <div className="desk-cad-grid-pattern" />
                <div className="desk-cad-drawing-content">
                  {/* Drawing Visual Representation */}
                  <div className="desk-cad-watermark">A&F DESIGN STUDIO • OFFICIAL DRAWING SHEET</div>
                  <div className="desk-cad-schematic-mock">
                    <div className="desk-cad-axis-x" />
                    <div className="desk-cad-axis-y" />
                    <div className="desk-cad-room room-living">LIVING & COURTYARD (LEVEL +0.45M)</div>
                    <div className="desk-cad-room room-bed">MASTER SUITE (LEVEL +0.45M)</div>
                    <div className="desk-cad-room room-pool">REFLECTING POOL (-0.60M)</div>
                  </div>
                </div>

                {/* Bottom Right Title Block (Architectural Standard) */}
                <div className="desk-cad-title-block">
                  <div className="title-block-row header">
                    <span>A&F DESIGN</span>
                    <span>PROJECT: AF-VILLA</span>
                  </div>
                  <div className="title-block-row">
                    <span>DWG: {sheet.code}</span>
                    <span>REV: {sheet.revision}</span>
                  </div>
                  <div className="title-block-row">
                    <span>SCALE: {sheet.scale || '1:100'}</span>
                    <span>PAPER: {sheet.sheetSize || 'A1'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Inspector Panel */}
          <div className="desk-blueprint-inspector" data-testid="blueprint-inspector">
            {/* Inspector Tab Switcher */}
            <div className="desk-inspector-tabs">
              <button
                type="button"
                className={`desk-inspector-tab ${activeTab === 'metadata' ? 'active' : ''}`}
                onClick={() => setActiveTab('metadata')}
                data-testid="tab-metadata"
              >
                <FileText size={14} />
                <span>Sheet Details</span>
              </button>
              <button
                type="button"
                className={`desk-inspector-tab ${activeTab === 'layers' ? 'active' : ''}`}
                onClick={() => setActiveTab('layers')}
                data-testid="tab-layers"
              >
                <Layers size={14} />
                <span>Layers ({layers.filter((l) => l.visible).length})</span>
              </button>
            </div>

            {activeTab === 'metadata' ? (
              <div className="desk-inspector-content" data-testid="inspector-metadata-content">
                <div className="desk-meta-group">
                  <span className="desk-meta-label">Sheet Status</span>
                  <div style={{ marginTop: '4px' }}>
                    {sheet.status === 'Approved' ? (
                      <span className="desk-status-pill approved">
                        <CheckCircle2 size={12} /> Approved & Sealed
                      </span>
                    ) : (
                      <span className="desk-status-pill pending">
                        <AlertCircle size={12} /> {sheet.status}
                      </span>
                    )}
                  </div>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Folder / Category</span>
                  <span className="desk-meta-value">{sheet.category}</span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Drawing Code</span>
                  <span className="desk-meta-value mono">{sheet.code}</span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Revision History</span>
                  <span className="desk-meta-value">{sheet.revision} (Current Approved Set)</span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Scale & Sheet Size</span>
                  <span className="desk-meta-value">
                    {sheet.scale || '1:100'} @ {sheet.sheetSize || 'A1 (841 x 594 mm)'}
                  </span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Submitted By</span>
                  <span className="desk-meta-value">{sheet.uploadedBy}</span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Issuance Date</span>
                  <span className="desk-meta-value">{sheet.date}</span>
                </div>
              </div>
            ) : (
              <div className="desk-inspector-content" data-testid="inspector-layers-content">
                <p className="desk-inspector-hint">Toggle CAD layers visibility on the viewport:</p>
                <div className="desk-layers-list">
                  {layers.map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={`desk-layer-toggle-btn ${layer.visible ? 'visible' : ''}`}
                      onClick={() => toggleLayer(layer.id)}
                      data-testid={`layer-toggle-${layer.id}`}
                    >
                      {layer.visible ? (
                        <Eye size={15} style={{ color: 'var(--desk-gold)' }} />
                      ) : (
                        <EyeOff size={15} style={{ color: 'var(--desk-text-muted)' }} />
                      )}
                      <span>{layer.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
