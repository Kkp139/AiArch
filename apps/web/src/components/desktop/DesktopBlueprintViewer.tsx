import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Layers,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import './desktop.css';

export interface BlueprintSheet {
  id: string;
  title: string;
  code: string;
  projectCode?: string;
  revision: string;
  category: string;
  scale?: string;
  sheetSize?: string;
  status: 'Approved' | 'Pending' | 'In Review';
  date: string;
  uploadedBy: string;
  previewUrl?: string | null;
  mimeType?: string;
  isDwg?: boolean;
  fileSizeBytes?: number;
  layers?: { id: string; name: string; visible: boolean }[];
}

export interface DesktopBlueprintViewerProps {
  sheet: BlueprintSheet;
  userRole?: UserRole;
  canDownload?: boolean;
  onClose: () => void;
  onDownload?: () => void;
}

export const DesktopBlueprintViewer: React.FC<DesktopBlueprintViewerProps> = ({
  sheet,
  userRole,
  canDownload = true,
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

  const isViewOnly = userRole === 'CLIENT_VIEWER' || !canDownload;
  const isImagePreview =
    !!sheet.previewUrl &&
    (sheet.previewUrl.startsWith('data:image') ||
      /\.(png|jpe?g|webp|gif)(\?|$)/i.test(sheet.previewUrl));

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
    <div
      className="desk-blueprint-modal-overlay"
      data-testid="desktop-blueprint-viewer"
      onContextMenu={(e) => {
        if (isViewOnly) e.preventDefault();
      }}
    >
      <div className="desk-blueprint-modal-container" style={{ userSelect: isViewOnly ? 'none' : 'auto' }}>
        <div className="desk-blueprint-header">
          <div className="desk-blueprint-title-box">
            <span className="desk-blueprint-code">{sheet.code}</span>
            <span className="desk-blueprint-title">{sheet.title}</span>
            <span className="desk-pill gold">{sheet.revision}</span>
            {isViewOnly && (
              <span className="desk-pill blue">
                <ShieldAlert size={12} /> View Only
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {sheet.previewUrl && !isViewOnly && (
              <a
                href={sheet.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="desk-btn desk-btn-sm desk-btn-secondary"
              >
                <ExternalLink size={14} />
                <span>Open File</span>
              </a>
            )}
            {onDownload && !isViewOnly && (
              <button
                type="button"
                className="desk-btn desk-btn-sm desk-btn-gold"
                onClick={onDownload}
                data-testid="blueprint-download-btn"
              >
                <Download size={14} />
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
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="desk-blueprint-body">
          <div className="desk-blueprint-canvas-viewport" data-testid="blueprint-canvas-area">
            <div className="desk-blueprint-toolbar" data-testid="blueprint-toolbar">
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleZoomIn}
                title="Zoom In (+25%)"
                data-testid="zoom-in-btn"
              >
                <ZoomIn size={16} />
              </button>
              <span style={{ fontSize: '12px', minWidth: '42px', textAlign: 'center' }} data-testid="zoom-level-text">
                {zoomLevel}%
              </span>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleZoomOut}
                title="Zoom Out (-25%)"
                data-testid="zoom-out-btn"
              >
                <ZoomOut size={16} />
              </button>
              <div className="desk-toolbar-divider" />
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleResetZoom}
                title="Reset Zoom"
                data-testid="zoom-reset-btn"
              >
                1:1
              </button>
              <button
                type="button"
                className="desk-toolbar-btn"
                onClick={handleRotate}
                title="Rotate 90°"
                data-testid="rotate-btn"
              >
                <RotateCw size={15} />
              </button>
            </div>

            <div
              className="desk-blueprint-canvas-paper"
              style={{
                transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
            >
              <div className="desk-cad-border">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#686869' }}>
                  <span>A&F DESIGN STUDIO • VAULT SHEET VIEWER</span>
                  <span>{sheet.category}</span>
                </div>

                {isImagePreview ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
                    <img
                      src={sheet.previewUrl!}
                      alt={sheet.title}
                      style={{ maxWidth: '100%', maxHeight: '340px', objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '10px' }}>
                    <div
                      style={{
                        padding: '16px 24px',
                        border: '1.5px dashed #BF935A',
                        borderRadius: '10px',
                        background: 'rgba(249, 244, 239, 0.75)',
                      }}
                    >
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#1D1D1F' }}>{sheet.title}</div>
                      <div style={{ fontSize: '12px', color: '#686869', marginTop: '4px' }}>
                        {sheet.isDwg ? 'AutoCAD DWG Drawing Sheet' : sheet.mimeType || 'Architectural Document'} • {sheet.revision}
                      </div>
                      <div style={{ fontSize: '11px', color: '#979798', marginTop: '6px' }}>
                        Active Layers: {layers.filter((l) => l.visible).map((l) => l.name.split(' ')[0]).join(', ') || 'None'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="desk-cad-title-block">
                  <div className="title-block-row header">
                    <span>A&F DESIGN</span>
                    <span>PROJECT: {sheet.projectCode || sheet.code}</span>
                  </div>
                  <div className="title-block-row">
                    <span>DOC: {sheet.title}</span>
                    <span>REV: {sheet.revision}</span>
                  </div>
                  <div className="title-block-row">
                    <span>SCALE: {sheet.scale || 'NTS'}</span>
                    <span>STATUS: {sheet.status.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="desk-blueprint-inspector" data-testid="blueprint-inspector">
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
                      <span className="desk-pill green">
                        <CheckCircle2 size={12} /> Approved & Sealed
                      </span>
                    ) : (
                      <span className="desk-pill amber">
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
                  <span className="desk-meta-label">Document File Name</span>
                  <span className="desk-meta-value" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12.5px', wordBreak: 'break-all' }}>
                    {sheet.title}
                  </span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Uploaded By</span>
                  <span className="desk-meta-value">{sheet.uploadedBy}</span>
                </div>

                <div className="desk-meta-group">
                  <span className="desk-meta-label">Date</span>
                  <span className="desk-meta-value">{sheet.date}</span>
                </div>
              </div>
            ) : (
              <div className="desk-inspector-content" data-testid="inspector-layers-content">
                <div style={{ fontSize: '12.5px', color: 'var(--desk-text-secondary)' }}>
                  Toggle CAD layer overlays:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {layers.map((layer) => (
                    <button
                      key={layer.id}
                      type="button"
                      className={`desk-layer-toggle-btn ${layer.visible ? 'visible' : ''}`}
                      onClick={() => toggleLayer(layer.id)}
                      data-testid={`layer-toggle-${layer.id}`}
                    >
                      {layer.visible ? (
                        <Eye size={15} color="#BF935A" />
                      ) : (
                        <EyeOff size={15} color="#979798" />
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
