import React from 'react';
import { FileText, Eye, Download, Clock, Trash2 } from 'lucide-react';

export interface VaultFileItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  revisionNumber: number;
  categoryFolder: string;
  updatedAt: string;
}

export interface GridViewProps {
  files: VaultFileItem[];
  onOpenFile: (file: VaultFileItem) => void;
  onDownloadFile?: (file: VaultFileItem) => void;
  onDeleteFile?: (file: VaultFileItem) => void;
  isViewOnly?: boolean;
}

export function GridView({ files, onOpenFile, onDownloadFile, onDeleteFile, isViewOnly }: GridViewProps) {
  if (files.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          color: 'var(--text-muted)',
          gap: '8px',
        }}
      >
        <FileText size={36} />
        <p style={{ fontSize: '14px' }}>No documents uploaded in this folder yet.</p>
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '16px',
        padding: '20px',
      }}
    >
      {files.map((file) => (
        <div
          key={file.id}
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
            transition: 'border-color 0.15s ease',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)',
                }}
              >
                <FileText size={20} />
              </div>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Rev {file.revisionNumber}
              </span>
            </div>

            <h4
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '6px',
                wordBreak: 'break-all',
              }}
            >
              {file.fileName}
            </h4>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
              <span>{formatSize(file.fileSize)}</span>
              <span>•</span>
              <span>{new Date(file.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={() => onOpenFile(file)}
              style={{
                flex: 1,
                padding: '6px 12px',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Eye size={14} />
              <span>Preview</span>
            </button>

            {!isViewOnly && onDownloadFile && (
              <button
                onClick={() => onDownloadFile(file)}
                title="Download"
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Download size={14} />
              </button>
            )}

            {!isViewOnly && onDeleteFile && (
              <button
                onClick={() => onDeleteFile(file)}
                title="Delete File"
                style={{
                  padding: '6px 10px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                }}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
