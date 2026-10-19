import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { ShieldX, CreditCard, AlertCircle, FileText, CheckCircle2, Clock } from 'lucide-react';

export interface PaymentRecord {
  id: string;
  milestoneTitle: string;
  amount: number;
  paymentMode: 'CHEQUE' | 'UPI' | 'NEFT_RTGS' | 'CASH';
  status: 'PENDING_CLEARANCE' | 'CONFIRMED' | 'REVISION_REQUESTED';
  referenceNumber?: string;
  bankName?: string;
  discrepancyNote?: string;
  createdAt: string;
}

export interface PaymentLedgerProps {
  userRole: UserRole;
  showPricing?: boolean;
  payments: PaymentRecord[];
  onSubmitDiscrepancy?: (paymentId: string, note: string) => void;
}

export function PaymentLedger({
  userRole,
  showPricing = false,
  payments,
  onSubmitDiscrepancy,
}: PaymentLedgerProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [discrepancyNote, setDiscrepancyNote] = useState('');

  // 1. STRICT STAFF ISOLATION: Staff role is unconditionally forbidden from viewing payments
  if (userRole === 'STAFF') {
    return (
      <div
        style={{
          padding: '48px 24px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <ShieldX size={44} color="var(--accent-rose)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Staff accounts cannot access payment records or pricing metadata as per studio security policy.
        </p>
      </div>
    );
  }

  // 2. Client pricing toggle check
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';
  if (isClient && !showPricing) {
    return (
      <div
        style={{
          padding: '48px 24px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <CreditCard size={44} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Pricing Restricted
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Pricing visibility is disabled for this project by the studio administrator.
        </p>
      </div>
    );
  }

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
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
          Milestone Payments & Invoicing
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Transparent ledger of architectural milestone releases and transaction confirmations.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Milestone</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mode</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reference / UTR</th>
              <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {p.milestoneTitle}
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                  {formatAmount(p.amount)}
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                  {p.paymentMode}
                </td>
                <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {p.referenceNumber || '—'}
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor:
                        p.status === 'CONFIRMED'
                          ? 'rgba(16, 185, 129, 0.1)'
                          : p.status === 'REVISION_REQUESTED'
                          ? 'rgba(244, 63, 94, 0.1)'
                          : 'rgba(245, 158, 11, 0.1)',
                      color:
                        p.status === 'CONFIRMED'
                          ? 'var(--accent-emerald)'
                          : p.status === 'REVISION_REQUESTED'
                          ? 'var(--accent-rose)'
                          : 'var(--accent-amber)',
                      fontWeight: 600,
                    }}
                  >
                    {p.status}
                  </span>
                </td>
                <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                  {p.status !== 'CONFIRMED' && (
                    <button
                      onClick={() => setSelectedPayment(p)}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      Report Discrepancy
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Discrepancy Submission Modal */}
      {selectedPayment && (
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
              width: '460px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Report Payment Discrepancy
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              For {selectedPayment.milestoneTitle} ({formatAmount(selectedPayment.amount)}). Specify transaction details or receipt mismatch:
            </p>

            <textarea
              placeholder="e.g. Transaction receipt UTR shows Rs 3,50,000 paid on 18 Oct via NEFT..."
              value={discrepancyNote}
              onChange={(e) => setDiscrepancyNote(e.target.value)}
              style={{
                width: '100%',
                height: '90px',
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
                onClick={() => setSelectedPayment(null)}
                style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onSubmitDiscrepancy) onSubmitDiscrepancy(selectedPayment.id, discrepancyNote);
                  setSelectedPayment(null);
                  setDiscrepancyNote('');
                }}
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'var(--accent-amber)',
                  color: '#0d0f12',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                Submit Discrepancy Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
