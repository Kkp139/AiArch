import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { CheckCircle2, RotateCcw, AlertCircle, Clock, FileCheck } from 'lucide-react';

export type VerificationStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REVISION_REQUIRED';

export interface VerificationItem {
  id: string;
  drawingTitle: string;
  category: string;
  revisionNumber: number;
  status: VerificationStatus;
  submittedAt: string;
  adminNotes?: string;
}

export interface VerificationListProps {
  userRole: UserRole;
  items: VerificationItem[];
  onApprove?: (id: string) => void;
  onRequestRevision?: (id: string, notes: string) => void;
}

export function VerificationList({ userRole, items, onApprove, onRequestRevision }: VerificationListProps) {
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const isAdmin = userRole === 'ADMIN';

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              color: 'var(--accent-emerald)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(244, 63, 94, 0.1)',
              color: 'var(--accent-rose)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCcw size={12} /> Revision Required
          </span>
        );
      case 'PENDING_APPROVAL':
      default:
        return (
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              color: 'var(--accent-amber)',
              fontSize: '11px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={12} /> Under Review
          </span>
        );
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Design Verification & Approvals
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Track architectural drawing approvals and revision iterations.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-gold)',
                }}
              >
                <FileCheck size={18} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {item.drawingTitle}
                  </h4>

                  {/* CRITICAL REQUIREMENT:
                      Revision Counter (Rev X) is visible to BOTH Admin and Staff.
                  */}
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#0d0f12',
                      fontWeight: 700,
                    }}
                  >
                    Rev {item.revisionNumber}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>{item.category}</span>
                  <span style={{ margin: '0 6px' }}>•</span>
                  <span>Submitted {new Date(item.submittedAt).toLocaleDateString()}</span>
                  {item.adminNotes && (
                    <span style={{ marginLeft: '10px', color: 'var(--accent-rose)' }}>
                      Note: {item.adminNotes}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {getStatusBadge(item.status)}

              {/* Admin Approval & Revision Actions */}
              {isAdmin && item.status === 'PENDING_APPROVAL' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onApprove && onApprove(item.id)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'var(--accent-emerald)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setSelectedItem(item)}
                    style={{
                      padding: '6px 14px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                    }}
                  >
                    Request Revision
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Admin Revision Modal */}
      {selectedItem && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              width: '440px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)' }}>
              Request Revision for {selectedItem.drawingTitle} (Rev {selectedItem.revisionNumber})
            </h3>
            <textarea
              placeholder="Specify structural or design modifications required..."
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              style={{
                width: '100%',
                height: '100px',
                padding: '10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onRequestRevision) onRequestRevision(selectedItem.id, revisionNotes);
                  setSelectedItem(null);
                  setRevisionNotes('');
                }}
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'var(--accent-rose)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Submit Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
