import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { ZoomIn, ZoomOut, RotateCcw, Download, ShieldAlert } from 'lucide-react';

export interface DwgViewerProps {
  documentId: string;
  documentTitle: string;
  previewUrl: string; // URL to the converted PDF preview
  projectCode: string;
  userRole: UserRole;
  clientName: string;
  userEmail: string;
}

export function DwgViewer({
  documentId,
  documentTitle,
  previewUrl,
  projectCode,
  userRole,
  clientName,
  userEmail,
}: DwgViewerProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const isViewOnly = userRole === 'CLIENT_VIEWER';

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div
      onContextMenu={(e) => {
        if (isViewOnly) {
          e.preventDefault();
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        userSelect: isViewOnly ? 'none' : 'auto',
      }}
    >
      {/* Viewer Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {documentTitle}
          </span>
          {isViewOnly && (
            <span
              style={{
                fontSize: '11px',
                padding: '2px 8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                color: 'var(--accent-blue)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--accent-blue)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldAlert size={12} />
              View Only
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleZoomOut}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: '12px', minWidth: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            {zoomLevel}%
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={handleResetZoom}
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            <RotateCcw size={16} />
          </button>

          {/* Download button is strictly stripped for CLIENT_VIEWER */}
          {!isViewOnly && (
            <a
              href={previewUrl}
              download={`${documentTitle}.pdf`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                marginLeft: '8px',
              }}
            >
              <Download size={14} />
              Download
            </a>
          )}
        </div>
      </div>

      {/* Viewer Canvas & Watermark Container */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          backgroundColor: '#111418',
          padding: '24px',
        }}
      >
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease',
            position: 'relative',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-strong)',
            backgroundColor: '#ffffff',
            width: '800px',
            height: '600px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Watermark Overlay (Security tracking across all viewers) */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              alignItems: 'center',
              opacity: 0.12,
              transform: 'rotate(-25deg)',
              zIndex: 10,
            }}
          >
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#000000' }}>
              {clientName} • PROJ: {projectCode}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#000000' }}>
              {userEmail} • {new Date().toISOString().split('T')[0]}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#000000' }}>
              CONFIDENTIAL • PRO-NEX ARCH-AI
            </div>
          </div>

          {/* Render PDF iframe or placeholder */}
          <iframe
            src={previewUrl}
            title={documentTitle}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
