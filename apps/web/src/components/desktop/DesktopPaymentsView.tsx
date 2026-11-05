import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import './desktop.css';

export interface DesktopPaymentRecord {
  id: string;
  milestoneTitle: string;
  amount: number;
  paymentMode: 'NEFT_RTGS' | 'UPI' | 'CHEQUE' | 'CASH';
  referenceNumber: string;
  bankName?: string;
  status: 'CONFIRMED' | 'PENDING_CLEARANCE' | 'REVISION_REQUESTED';
  date: string;
  invoiceNumber: string;
  discrepancyNote?: string;
}

export interface DesktopPaymentsViewProps {
  userRole: UserRole;
  showPricing?: boolean;
  projectCode?: string;
  projectName?: string;
  totalAgreedFee?: number;
  advanceReceived?: number;
  onSubmitDiscrepancy?: (paymentId: string, note: string) => void;
  onDownloadReceipt?: (paymentId: string) => void;
}

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

export const DesktopPaymentsView: React.FC<DesktopPaymentsViewProps> = ({
  userRole,
  showPricing = true,
  projectCode = 'AF-VILLA',
  projectName = 'Courtyard Villa Luxury Residence',
  totalAgreedFee = 4800000,
  advanceReceived = 2850000,
  onSubmitDiscrepancy,
  onDownloadReceipt,
}) => {
  // 1. STRICT STAFF BLOCK: Staff is completely blocked from payments per Master Spec Ch 8 & 14
  if (userRole === 'STAFF') {
    return (
      <div className="desk-restricted-card" data-testid="payments-staff-restricted">
        <div className="desk-restricted-icon-box">
          <ShieldAlert size={36} style={{ color: 'var(--desk-danger)' }} />
        </div>
        <h2 className="desk-restricted-title">Access Denied: Financial Ledger</h2>
        <p className="desk-restricted-desc">
          Staff accounts cannot access payment records, fee agreements, or pricing metadata in
          accordance with Studio Security Policy and Master Spec Chapters 8 & 14.
        </p>
      </div>
    );
  }

  // 2. Client Pricing Toggle Gate
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';
  if (isClient && !showPricing) {
    return (
      <div className="desk-restricted-card" data-testid="payments-pricing-restricted">
        <div className="desk-restricted-icon-box">
          <ShieldAlert size={36} style={{ color: 'var(--desk-gold)' }} />
        </div>
        <h2 className="desk-restricted-title">Pricing Transparency Restricted</h2>
        <p className="desk-restricted-desc">
          Payment transparency and fee ledgers are currently not enabled for this client profile.
          Please contact studio administration to activate fee transparency.
        </p>
      </div>
    );
  }

  const balanceOutstanding = Math.max(0, totalAgreedFee - advanceReceived);
  const collectionRatio = Math.round((advanceReceived / totalAgreedFee) * 100);

  // Sample ledger payments
  const [payments, setPayments] = useState<DesktopPaymentRecord[]>([
    {
      id: 'pay-001',
      milestoneTitle: 'Mobilization Advance & Concept Schematic Sign-off',
      amount: 1500000,
      paymentMode: 'NEFT_RTGS',
      referenceNumber: 'HDFC0001928374',
      bankName: 'HDFC Bank Ltd',
      status: 'CONFIRMED',
      date: '2026-10-10',
      invoiceNumber: 'INV-AF-2026-001',
    },
    {
      id: 'pay-002',
      milestoneTitle: 'Municipal Sanction & Working Drawing Package',
      amount: 1350000,
      paymentMode: 'NEFT_RTGS',
      referenceNumber: 'ICIC9988221100',
      bankName: 'ICICI Bank',
      status: 'CONFIRMED',
      date: '2026-10-28',
      invoiceNumber: 'INV-AF-2026-002',
    },
    {
      id: 'pay-003',
      milestoneTitle: 'MEP Coordination & Structural Column Cast Sign-off',
      amount: 950000,
      paymentMode: 'UPI',
      referenceNumber: 'UPI/2938472910/afvilla',
      status: 'PENDING_CLEARANCE',
      date: '2026-11-04',
      invoiceNumber: 'INV-AF-2026-003',
    },
    {
      id: 'pay-004',
      milestoneTitle: 'Material Selection & Finish Moodboard Clearance',
      amount: 1000000,
      paymentMode: 'CHEQUE',
      referenceNumber: 'CHQ-882910',
      bankName: 'Kotak Mahindra Bank',
      status: 'REVISION_REQUESTED',
      date: '2026-11-05',
      invoiceNumber: 'INV-AF-2026-004',
      discrepancyNote: 'Cheque clearance delayed due to signature mismatch.',
    },
  ]);

  // Modals state
  const [selectedReceipt, setSelectedReceipt] = useState<DesktopPaymentRecord | null>(null);
  const [discrepancyPayment, setDiscrepancyPayment] = useState<DesktopPaymentRecord | null>(null);
  const [discrepancyText, setDiscrepancyText] = useState('');

  const handleOpenReceipt = (p: DesktopPaymentRecord) => setSelectedReceipt(p);

  const handleSubmitDiscrepancy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discrepancyPayment || !discrepancyText.trim()) return;

    if (onSubmitDiscrepancy) {
      onSubmitDiscrepancy(discrepancyPayment.id, discrepancyText.trim());
    }

    setPayments((prev) =>
      prev.map((p) =>
        p.id === discrepancyPayment.id
          ? {
              ...p,
              status: 'REVISION_REQUESTED',
              discrepancyNote: discrepancyText.trim(),
            }
          : p
      )
    );

    setDiscrepancyPayment(null);
    setDiscrepancyText('');
  };

  const getStatusBadge = (status: DesktopPaymentRecord['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="desk-status-pill approved" data-testid="status-confirmed">
            <CheckCircle2 size={12} /> Confirmed
          </span>
        );
      case 'PENDING_CLEARANCE':
        return (
          <span className="desk-status-pill pending" data-testid="status-pending-clearance">
            <Clock size={12} /> Pending Clearance
          </span>
        );
      case 'REVISION_REQUESTED':
        return (
          <span className="desk-status-pill revision" data-testid="status-revision-requested">
            <AlertCircle size={12} /> Revision Requested
          </span>
        );
      default:
        return null;
    }
  };

  const formatMode = (mode: DesktopPaymentRecord['paymentMode']) => {
    switch (mode) {
      case 'NEFT_RTGS':
        return 'NEFT / RTGS';
      case 'UPI':
        return 'UPI Transfer';
      case 'CHEQUE':
        return 'Bank Cheque';
      case 'CASH':
        return 'Direct Cash';
      default:
        return mode;
    }
  };

  return (
    <div className="desk-payments-view" data-testid="desktop-payments-view">
      {/* Top Header */}
      <div className="desk-payments-header">
        <div>
          <h1 className="desk-page-title">Financial Ledger & Milestone Accounting</h1>
          <p className="desk-page-subtitle">
            Project: {projectCode} • {projectName} • Official Studio Ledger
          </p>
        </div>
      </div>

      {/* Split Metrics Banner */}
      <div className="desk-payment-metrics-banner" data-testid="payment-metrics-banner">
        <div className="desk-pay-metric">
          <span className="desk-pay-metric-label">Total Agreed Fee</span>
          <span className="desk-pay-metric-val">{formatINR(totalAgreedFee)}</span>
          <span className="desk-pay-metric-sub">Contractual Studio Retainer</span>
        </div>

        <div className="desk-pay-metric">
          <span className="desk-pay-metric-label">Advance Received</span>
          <span className="desk-pay-metric-val highlight">{formatINR(advanceReceived)}</span>
          <span className="desk-pay-metric-sub">Cleared in Studio Escrow</span>
        </div>

        <div className="desk-pay-metric">
          <span className="desk-pay-metric-label">Balance Outstanding</span>
          <span className="desk-pay-metric-val balance">{formatINR(balanceOutstanding)}</span>
          <span className="desk-pay-metric-sub">Pending Milestone Release</span>
        </div>

        <div className="desk-pay-metric progress-metric">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="desk-pay-metric-label">Collection Ratio</span>
            <span style={{ fontWeight: 700, color: 'var(--desk-gold)' }}>{collectionRatio}%</span>
          </div>
          <div className="desk-progress-bar-bg">
            <div className="desk-progress-bar-fill" style={{ width: `${collectionRatio}%` }} />
          </div>
          <span className="desk-pay-metric-sub">Milestone Collection Target</span>
        </div>
      </div>

      {/* High-Density Ledger Table */}
      <div className="desk-table-container" data-testid="payment-ledger-table">
        <table className="desk-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Milestone Scope & Invoice</th>
              <th>Payment Mode</th>
              <th>Reference Number</th>
              <th>Amount (INR)</th>
              <th>Status</th>
              <th>Receipt & Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} data-testid={`payment-row-${p.id}`}>
                <td style={{ whiteSpace: 'nowrap' }}>{p.date}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{p.milestoneTitle}</div>
                  <div style={{ fontSize: '11px', color: 'var(--desk-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {p.invoiceNumber}
                  </div>
                </td>
                <td>
                  <span className="desk-mode-tag">{formatMode(p.paymentMode)}</span>
                  {p.bankName && (
                    <div style={{ fontSize: '11px', color: 'var(--desk-text-muted)' }}>{p.bankName}</div>
                  )}
                </td>
                <td className="mono">{p.referenceNumber}</td>
                <td style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--desk-text-primary)' }}>
                  {formatINR(p.amount)}
                </td>
                <td>{getStatusBadge(p.status)}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      className="desk-btn desk-btn-secondary"
                      onClick={() => handleOpenReceipt(p)}
                      data-testid={`receipt-preview-btn-${p.id}`}
                      title="Preview Official Receipt"
                    >
                      <Eye size={13} />
                      <span>Receipt</span>
                    </button>

                    {isClient && (
                      <button
                        type="button"
                        className="desk-btn-report-discrepancy"
                        onClick={() => {
                          setDiscrepancyPayment(p);
                          setDiscrepancyText(p.discrepancyNote || '');
                        }}
                        data-testid={`report-discrepancy-btn-${p.id}`}
                        title="Report Payment Discrepancy"
                      >
                        <AlertTriangle size={13} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt Preview Centered Modal Dialog */}
      {selectedReceipt && (
        <div className="desk-modal-overlay" data-testid="receipt-preview-modal">
          <div className="desk-modal-dialog">
            <div className="desk-modal-header">
              <h2 className="desk-modal-title">Official Architectural Tax Receipt</h2>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setSelectedReceipt(null)}
                data-testid="close-receipt-modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="desk-receipt-body">
              <div className="desk-receipt-card">
                <div className="desk-receipt-header-row">
                  <div>
                    <span className="desk-brand-title" style={{ color: 'var(--desk-obsidian)' }}>
                      A&F DESIGN
                    </span>
                    <div style={{ fontSize: '10px', color: 'var(--desk-gold)', letterSpacing: '1px' }}>
                      ARCHITECTURE & INTERIORS
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="desk-rev-badge">OFFICIAL RECEIPT</span>
                    <div style={{ fontSize: '11px', color: 'var(--desk-text-muted)', marginTop: '4px' }}>
                      {selectedReceipt.invoiceNumber}
                    </div>
                  </div>
                </div>

                <div className="desk-receipt-divider" />

                <div className="desk-receipt-row">
                  <span className="label">Project:</span>
                  <span className="value">{projectName} ({projectCode})</span>
                </div>
                <div className="desk-receipt-row">
                  <span className="label">Milestone:</span>
                  <span className="value">{selectedReceipt.milestoneTitle}</span>
                </div>
                <div className="desk-receipt-row">
                  <span className="label">Transaction Ref:</span>
                  <span className="value mono">{selectedReceipt.referenceNumber}</span>
                </div>
                <div className="desk-receipt-row">
                  <span className="label">Payment Mode:</span>
                  <span className="value">{formatMode(selectedReceipt.paymentMode)}</span>
                </div>
                <div className="desk-receipt-row">
                  <span className="label">Date Settled:</span>
                  <span className="value">{selectedReceipt.date}</span>
                </div>

                <div className="desk-receipt-amount-box">
                  <span className="amount-label">Amount Cleared</span>
                  <span className="amount-val">{formatINR(selectedReceipt.amount)}</span>
                </div>
              </div>
            </div>

            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setSelectedReceipt(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="desk-btn desk-btn-primary"
                onClick={() => {
                  if (onDownloadReceipt) onDownloadReceipt(selectedReceipt.id);
                  alert(`Receipt ${selectedReceipt.invoiceNumber} downloaded.`);
                }}
                data-testid="download-receipt-pdf-btn"
              >
                <Download size={15} />
                <span>Download Tax Receipt (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Modal Dialog */}
      {discrepancyPayment && (
        <div className="desk-modal-overlay" data-testid="discrepancy-modal">
          <div className="desk-modal-dialog">
            <div className="desk-modal-header">
              <h2 className="desk-modal-title">Report Financial Discrepancy</h2>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setDiscrepancyPayment(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitDiscrepancy} className="desk-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--desk-text-secondary)', marginBottom: '12px' }}>
                Reporting discrepancy on milestone: <strong>{discrepancyPayment.milestoneTitle}</strong> (
                {formatINR(discrepancyPayment.amount)})
              </p>

              <div className="desk-form-group">
                <label>Discrepancy Explanation</label>
                <textarea
                  className="desk-form-textarea"
                  rows={4}
                  placeholder="Detail mismatch in amount, TDS deduction, or transaction reference..."
                  value={discrepancyText}
                  onChange={(e) => setDiscrepancyText(e.target.value)}
                  required
                  data-testid="textarea-discrepancy-note"
                />
              </div>

              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setDiscrepancyPayment(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="desk-btn desk-btn-primary"
                  style={{ background: 'var(--desk-danger)', borderColor: 'var(--desk-danger)' }}
                  data-testid="submit-discrepancy-btn"
                >
                  Submit Discrepancy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
