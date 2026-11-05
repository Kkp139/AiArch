import React, { useState, useMemo } from 'react';
import { UserRole } from '../../context/AuthContext';
import { PaymentRecord } from '../../pages/Payments/PaymentLedger';
import {
  ChevronLeft,
  Search,
  SlidersHorizontal,
  Plus,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  X,
  Download,
  Building2,
  FileCheck2,
} from 'lucide-react';
import './mobile.css';

export interface MobilePaymentViewProps {
  userRole: UserRole;
  showPricing?: boolean;
  payments: PaymentRecord[];
  onBack: () => void;
  onSubmitDiscrepancy?: (paymentId: string, note: string) => void;
  onRecordPayment?: (record: Partial<PaymentRecord>) => void;
}

export const MobilePaymentView: React.FC<MobilePaymentViewProps> = ({
  userRole,
  showPricing = true,
  payments,
  onBack,
  onSubmitDiscrepancy,
  onRecordPayment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CONFIRMED' | 'PENDING_CLEARANCE' | 'REVISION_REQUESTED'>('ALL');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // New Record Form State
  const [newMilestone, setNewMilestone] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMode, setNewMode] = useState<'NEFT_RTGS' | 'UPI' | 'CHEQUE' | 'CASH'>('NEFT_RTGS');
  const [newReference, setNewReference] = useState('');

  // 1. Staff isolation check
  if (userRole === 'STAFF') {
    return (
      <div className="figma-mobile-subpage">
        <div className="figma-subpage-header">
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Payment</h2>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEE4E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CreditCard size={28} color="#D92D20" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0C0C0D', marginBottom: '8px' }}>Access Restricted</h3>
          <p style={{ fontSize: '14px', color: '#686869', lineHeight: 1.5 }}>
            Staff members do not have permission to view project payment ledgers or pricing data.
          </p>
        </div>
      </div>
    );
  }

  // 2. Client pricing toggle
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';
  if (isClient && !showPricing) {
    return (
      <div className="figma-mobile-subpage">
        <div className="figma-subpage-header">
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Payment</h2>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#F4EFEB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CreditCard size={28} color="#BF935A" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0C0C0D', marginBottom: '8px' }}>Pricing Hidden</h3>
          <p style={{ fontSize: '14px', color: '#686869', lineHeight: 1.5 }}>
            Pricing details are hidden for this project as per studio settings.
          </p>
        </div>
      </div>
    );
  }

  // Calculate Metrics
  const totalAgreed = 30000000; // ₹ 3.00 Cr
  const totalPaid = useMemo(() => {
    return payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const totalPending = useMemo(() => {
    return payments
      .filter((p) => p.status === 'PENDING_CLEARANCE')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch =
        p.milestoneTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  const formatINR = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const handleCreatePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestone || !newAmount) return;
    if (onRecordPayment) {
      onRecordPayment({
        milestoneTitle: newMilestone,
        amount: parseFloat(newAmount),
        paymentMode: newMode,
        referenceNumber: newReference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'PENDING_CLEARANCE',
        createdAt: new Date().toISOString(),
      });
    }
    setIsRecordModalOpen(false);
    setNewMilestone('');
    setNewAmount('');
    setNewReference('');
  };

  const handleDiscrepancySubmit = () => {
    if (selectedPayment && onSubmitDiscrepancy && discrepancyNote.trim()) {
      onSubmitDiscrepancy(selectedPayment.id, discrepancyNote);
      setIsDiscrepancyModalOpen(false);
      setSelectedPayment(null);
      setDiscrepancyNote('');
    }
  };

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header matching Figma 378:3567 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Payment</h2>
        </div>
        {userRole === 'ADMIN' && (
          <button
            className="figma-primary-btn-sm"
            onClick={() => setIsRecordModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Record Entry</span>
          </button>
        )}
      </div>

      <div className="figma-subpage-body">
        {/* Search & Filter Controls (Figma: 378:3573) */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div className="figma-mobile-search-pill" style={{ flex: 1 }}>
            <Search size={18} color="#979798" />
            <input
              type="text"
              placeholder="Search milestone, UTR, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="figma-search-input"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <X size={16} color="#979798" />
              </button>
            )}
          </div>
          <button
            className={`figma-filter-icon-btn ${statusFilter !== 'ALL' ? 'active' : ''}`}
            onClick={() => setIsFilterSheetOpen(true)}
            title="Filter Payments"
          >
            <SlidersHorizontal size={18} color={statusFilter !== 'ALL' ? '#BF935A' : '#4A4A4C'} />
          </button>
        </div>

        {/* Total Project Fees Card (Figma: 378:3581) */}
        <div className="figma-payment-hero-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="figma-payment-hero-label">Total Project Fees</span>
              <div className="figma-payment-hero-amount">₹ 3.00 Cr</div>
            </div>
            <div className="figma-payment-project-tag">
              <Building2 size={13} color="#695132" />
              <span>Artilla Inn</span>
            </div>
          </div>

          <div className="figma-payment-split-grid">
            <div className="figma-split-box">
              <span className="figma-split-label">Cleared Received</span>
              <span className="figma-split-value" style={{ color: '#087A48' }}>
                {formatINR(totalPaid || 15000000)}
              </span>
            </div>
            <div className="figma-split-box">
              <span className="figma-split-label">Pending Clearance</span>
              <span className="figma-split-value" style={{ color: '#A35A13' }}>
                {formatINR(totalPending || 2500000)}
              </span>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0C0C0D', margin: 0 }}>
              Payment Records ({filteredPayments.length})
            </h3>
            {statusFilter !== 'ALL' && (
              <span style={{ fontSize: '12px', color: '#BF935A', cursor: 'pointer', fontWeight: 600 }} onClick={() => setStatusFilter('ALL')}>
                Reset Filter
              </span>
            )}
          </div>

          {filteredPayments.length === 0 ? (
            <div className="figma-empty-state-card">
              <CreditCard size={36} color="#979798" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#4A4A4C', margin: '0 0 4px 0' }}>No payments found</p>
              <p style={{ fontSize: '12px', color: '#979798', margin: 0 }}>
                {searchQuery ? 'Try matching a different keyword or reset filters.' : 'No payment milestones recorded yet.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredPayments.map((payment) => {
                const isCleared = payment.status === 'CONFIRMED';
                const isPending = payment.status === 'PENDING_CLEARANCE';
                return (
                  <div
                    key={payment.id}
                    className="figma-payment-item-card"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ flex: 1, paddingRight: '8px' }}>
                        <h4 className="figma-payment-item-title">{payment.milestoneTitle}</h4>
                        <span className="figma-payment-item-sub">
                          {payment.paymentMode.replace('_', ' / ')} {payment.referenceNumber ? `• ${payment.referenceNumber}` : ''}
                        </span>
                      </div>
                      <span className={`figma-status-badge ${isCleared ? 'cleared' : isPending ? 'pending' : 'revision'}`}>
                        {isCleared ? 'Cleared' : isPending ? 'Pending' : 'Discrepancy'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F0F0F2', paddingTop: '8px' }}>
                      <span className="figma-payment-item-amount">{formatINR(payment.amount)}</span>
                      <span className="figma-payment-item-date">
                        {payment.createdAt ? new Date(payment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filter Bottom Sheet (Figma: 385:5545) */}
      {isFilterSheetOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsFilterSheetOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Filter Payments</h3>
              <button onClick={() => setIsFilterSheetOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {[
                { id: 'ALL', label: 'All Payments' },
                { id: 'CONFIRMED', label: 'Cleared Payments' },
                { id: 'PENDING_CLEARANCE', label: 'Pending Clearance' },
                { id: 'REVISION_REQUESTED', label: 'Discrepancies' },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`figma-filter-choice-btn ${statusFilter === item.id ? 'active' : ''}`}
                  onClick={() => {
                    setStatusFilter(item.id as any);
                    setIsFilterSheetOpen(false);
                  }}
                >
                  <span>{item.label}</span>
                  {statusFilter === item.id && <CheckCircle2 size={18} color="#BF935A" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Payment Detail Receipt Modal (Figma: 385:5130) */}
      {selectedPayment && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCheck2 size={20} color="#BF935A" />
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Payment Detail</h3>
              </div>
              <button onClick={() => setSelectedPayment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            {/* Receipt Body */}
            <div className="figma-receipt-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="figma-payment-project-tag">Artilla Inn</span>
                <span
                  className={`figma-status-badge ${
                    selectedPayment.status === 'CONFIRMED'
                      ? 'cleared'
                      : selectedPayment.status === 'PENDING_CLEARANCE'
                      ? 'pending'
                      : 'revision'
                  }`}
                >
                  {selectedPayment.status === 'CONFIRMED'
                    ? 'Cleared'
                    : selectedPayment.status === 'PENDING_CLEARANCE'
                    ? 'Pending Clearance'
                    : 'Discrepancy'}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#0C0C0D' }}>
                  {formatINR(selectedPayment.amount)}
                </div>
                <div style={{ fontSize: '13px', color: '#686869', marginTop: '4px' }}>
                  {selectedPayment.milestoneTitle}
                </div>
              </div>

              <div className="figma-receipt-divider" />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#686869' }}>Transaction Mode:</span>
                  <span style={{ fontWeight: 600, color: '#0C0C0D' }}>{selectedPayment.paymentMode.replace('_', ' / ')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#686869' }}>Reference / UTR:</span>
                  <span style={{ fontWeight: 600, color: '#0C0C0D', fontFamily: 'monospace' }}>
                    {selectedPayment.referenceNumber || 'N/A'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#686869' }}>Payment Date:</span>
                  <span style={{ fontWeight: 600, color: '#0C0C0D' }}>
                    {selectedPayment.createdAt
                      ? new Date(selectedPayment.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Today'}
                  </span>
                </div>
                {selectedPayment.discrepancyNote && (
                  <div style={{ marginTop: '8px', padding: '10px', background: '#FEE4E2', borderRadius: '8px', fontSize: '12px', color: '#D92D20' }}>
                    <strong>Discrepancy Note:</strong> {selectedPayment.discrepancyNote}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
              <button
                className="figma-btn-gold-full"
                onClick={() => {
                  alert(`Official Tax Receipt for ${formatINR(selectedPayment.amount)} (${selectedPayment.milestoneTitle}) downloaded.`);
                }}
              >
                <Download size={18} />
                <span>Download Official Receipt (PDF)</span>
              </button>

              {(userRole as string) !== 'STAFF' && (
                <button
                  className="figma-btn-secondary-full"
                  onClick={() => setIsDiscrepancyModalOpen(true)}
                  style={{ color: '#D92D20', borderColor: '#FECDCA' }}
                >
                  <AlertCircle size={18} />
                  <span>Report Discrepancy</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Discrepancy Note Sheet */}
      {isDiscrepancyModalOpen && (
        <div className="figma-bottom-sheet-overlay" style={{ zIndex: 110 }} onClick={() => setIsDiscrepancyModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px 0', color: '#0C0C0D' }}>Report Discrepancy</h3>
            <p style={{ fontSize: '13px', color: '#686869', margin: '0 0 16px 0' }}>
              Please specify the discrepancy detail (e.g. amount mismatch, wrong UTR, deduction dispute).
            </p>
            <textarea
              className="figma-modal-textarea"
              rows={4}
              placeholder="Enter your notes for studio finance review..."
              value={discrepancyNote}
              onChange={(e) => setDiscrepancyNote(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="figma-btn-secondary-full" onClick={() => setIsDiscrepancyModalOpen(false)}>
                Cancel
              </button>
              <button className="figma-btn-gold-full" onClick={handleDiscrepancySubmit} disabled={!discrepancyNote.trim()}>
                Submit Discrepancy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Entry Modal (Admin only - Figma: 544:7749) */}
      {isRecordModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsRecordModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Record Payment Entry</h3>
              <button onClick={() => setIsRecordModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleCreatePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Milestone Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Concept Phase Release (40%)"
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Amount (₹ INR)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Payment Mode</label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as any)}
                  className="figma-form-input"
                >
                  <option value="NEFT_RTGS">Bank RTGS / NEFT</option>
                  <option value="UPI">UPI Payment</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="CASH">Direct Cash</option>
                </select>
              </div>

              <div>
                <label className="figma-form-label">Reference / UTR / Cheque No.</label>
                <input
                  type="text"
                  placeholder="e.g. UTR-982104928"
                  value={newReference}
                  onChange={(e) => setNewReference(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsRecordModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

