import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  Download,
  ExternalLink,
  Calendar,
  User,
  FileCode2,
  ShieldCheck,
  Loader2,
  X,
} from 'lucide-react';
import { DrawingItem } from './MobileDrawingFolderView';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileDrawingSheetModalProps {
  drawing: DrawingItem | null;
  projectName?: string;
  phaseName?: string;
  folderName?: string;
  userRole?: string;
  allowClientDownloads?: string;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onClose: () => void;
}

export const MobileDrawingSheetModal: React.FC<MobileDrawingSheetModalProps> = ({
  drawing,
  projectName = 'Architectural Project',
  phaseName = 'Drawing Vault',
  folderName = 'Standard Folder',
  userRole,
  allowClientDownloads,
  authHeaders,
  getAuthHeaders,
  onClose,
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!drawing) return;

    const loadLinks = async () => {
      setLoadingUrl(true);
      setBanner(null);
      setResolvedUrl(drawing.downloadUrl || null);
      setPreviewUrl(null);
      try {
        const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
        const res = await fetch(
          `/api/vault/document/${encodeURIComponent(drawing.id)}/download`,
          { headers }
        );
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setResolvedUrl(data.downloadUrl || null);
          setPreviewUrl(data.previewUrl || null);
        } else {
          const err = await res.json().catch(() => ({}));
          if (res.status === 403) {
            setBanner({
              type: 'error',
              message: err.error || 'Downloads are restricted for this project.',
            });
          }
        }
      } catch {
        // Keep metadata readable without crashing
      } finally {
        if (active) setLoadingUrl(false);
      }
    };

    loadLinks();
    return () => {
      active = false;
    };
  }, [drawing, authHeaders, getAuthHeaders]);

  if (!drawing) return null;

  const isApproved = drawing.status === 'Approved';
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';
  const downloadAllowed = !isClient || allowClientDownloads !== 'VIEW_ONLY';
  const displayPreview = previewUrl || (!drawing.isDwg ? resolvedUrl : null);

  const handleOpenExternal = () => {
    const target = displayPreview || resolvedUrl;
    if (!target) {
      setBanner({
        type: 'error',
        message: 'No preview file URL returned by storage yet.',
      });
      return;
    }
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  const handleDownload = () => {
    if (!downloadAllowed) {
      setBanner({
        type: 'error',
        message: 'Downloads are disabled for your role on this project.',
      });
      return;
    }
    if (!resolvedUrl) {
      setBanner({
        type: 'error',
        message: 'Verified download link unavailable.',
      });
      return;
    }
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
    setBanner({
      type: 'success',
      message: `Downloading "${drawing.fileName || drawing.title}"...`,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        backgroundColor: '#F5F5F7',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      {/* Top Modal Header */}
      <div
        style={{
          background: '#FFFFFF',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <button type="button" className="figma-back-btn" onClick={onClose} aria-label="Close viewer">
            <ChevronLeft size={24} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 700,
                margin: 0,
                color: '#0C0C0D',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {drawing.title}
            </h3>
            <div style={{ fontSize: '12px', color: '#686869' }}>
              {projectName} • {folderName}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 100px 20px' }}>
        {banner && (
          <div
            style={{
              marginBottom: '14px',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: banner.type === 'success' ? '#ECFDF3' : '#FEF3F2',
              color: banner.type === 'success' ? '#027A48' : '#B42318',
              border: `1px solid ${banner.type === 'success' ? '#ABEFC6' : '#FECDCA'}`,
            }}
          >
            <span>{banner.message}</span>
            <button
              type="button"
              onClick={() => setBanner(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Blueprint / Preview Surface */}
        <div
          style={{
            background: '#1C1B1A',
            borderRadius: '20px',
            minHeight: '240px',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: '20px',
          }}
        >
          {loadingUrl ? (
            <Loader2 size={28} color="#BF935A" className="animate-spin" />
          ) : displayPreview && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(displayPreview) ? (
            <img
              src={displayPreview}
              alt={drawing.title}
              style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '10px', objectFit: 'contain' }}
            />
          ) : (
            <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
              <FileCode2 size={40} color="#BF935A" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px' }}>
                {drawing.isDwg ? 'CAD SHEET PREVIEW' : `${drawing.code} ARCHITECTURAL SHEET`}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.68)', marginTop: '6px' }}>
                {phaseName} • {folderName}
              </div>
            </div>
          )}

          {isApproved && (
            <div
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'rgba(18, 183, 106, 0.2)',
                border: '1px solid rgba(18, 183, 106, 0.5)',
                color: '#12B76A',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ShieldCheck size={14} /> Approved
            </div>
          )}
        </div>

        {/* Technical Metadata Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            border: '1px solid rgba(0,0,0,0.04)',
            marginBottom: '20px',
          }}
        >
          <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: '#0C0C0D' }}>
            Sheet Metadata
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode2 size={15} /> Format &amp; Size
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>
                {drawing.code} • {drawing.fileSize}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={15} /> Uploaded By
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>
                {drawing.uploadedBy}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={15} /> Uploaded On
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>
                {drawing.date}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#686869' }}>Folder Status</span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isApproved ? '#027A48' : '#B54708',
                  background: isApproved ? '#ECFDF3' : '#FFFAEB',
                  padding: '3px 10px',
                  borderRadius: '8px',
                }}
              >
                {drawing.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          padding: '14px 20px',
          display: 'flex',
          gap: '12px',
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom))',
        }}
      >
        <button
          type="button"
          onClick={handleOpenExternal}
          style={{
            flex: 1,
            height: '46px',
            borderRadius: '12px',
            border: '1px solid #352618',
            background: '#FFFFFF',
            color: '#352618',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <ExternalLink size={18} />
          <span>Open Sheet</span>
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={!downloadAllowed}
          style={{
            flex: 1,
            height: '46px',
            borderRadius: '12px',
            border: 'none',
            background: downloadAllowed ? '#352618' : '#D0D5DD',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: downloadAllowed ? 'pointer' : 'not-allowed',
          }}
        >
          <Download size={18} />
          <span>{downloadAllowed ? 'Download' : 'View Only'}</span>
        </button>
      </div>
    </div>
  );
};
