import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { ShieldX, CreditCard, AlertCircle, FileText, CheckCircle2, Clock, Plus } from 'lucide-react';

export interface PaymentRecord {
  id: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
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
  projects?: Array<{ id: string; projectCode: string; name: string }>;
  selectedProjectCode?: string;
  onSelectProjectCode?: (code: string) => void;
  onSubmitDiscrepancy?: (paymentId: string, note: string) => void;
  onCreatePayment?: (data: {
    projectCode: string;
    milestoneTitle: string;
    amount: number;
    paymentMode: 'CHEQUE' | 'UPI' | 'NEFT_RTGS' | 'CASH';
    referenceNumber?: string;
    bankName?: string;
    status: 'PENDING_CLEARANCE' | 'CONFIRMED';
  }) => Promise<void>;
}

export function PaymentLedger({
  userRole,
  showPricing = false,
  payments,
  projects = [],
  selectedProjectCode,
  onSelectProjectCode,
  onSubmitDiscrepancy,
  onCreatePayment,
}: PaymentLedgerProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [discrepancyNote, setDiscrepancyNote] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>(
    selectedProjectCode && selectedProjectCode !== 'ALL' ? selectedProjectCode : 'ALL'
  );
  const [newProjectCode, setNewProjectCode] = useState(selectedProjectCode || 'AF-VILLA');

  // Keep internal filter in sync whenever the user switches projects in the studio
  React.useEffect(() => {
    if (selectedProjectCode && selectedProjectCode !== 'ALL') {
      setProjectFilter(selectedProjectCode);
      setNewProjectCode(selectedProjectCode);
    }
  }, [selectedProjectCode]);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newMode, setNewMode] = useState<'CHEQUE' | 'UPI' | 'NEFT_RTGS' | 'CASH'>('NEFT_RTGS');
  const [newRef, setNewRef] = useState('');
  const [newBank, setNewBank] = useState('');
  const [newStatus, setNewStatus] = useState<'PENDING_CLEARANCE' | 'CONFIRMED'>('CONFIRMED');
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Filter strictly by the project code associated with the payment
  const filteredPayments = React.useMemo(() => {
    if (!projectFilter || projectFilter === 'ALL') return payments;
    return payments.filter(
      (p) => p.projectCode && p.projectCode.toUpperCase() === projectFilter.toUpperCase()
    );
  }, [payments, projectFilter]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Milestone Payments & Invoicing
            </h2>
            {projectFilter === 'ALL' ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--accent-gold)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                STUDIO OVERVIEW (ALL PROJECTS)
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--accent-gold)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                PROJECT: {projectFilter}
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Transparent financial ledger of architectural milestone releases, advance payments, and transaction audits.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {projects && projects.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Project:</span>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="ALL">All Studio Projects ({payments.length})</option>
                {projects.map((p) => {
                  const pCount = payments.filter((pay) => pay.projectCode?.toUpperCase() === p.projectCode.toUpperCase()).length;
                  return (
                    <option key={p.projectCode} value={p.projectCode}>
                      {p.projectCode} • {p.name} ({pCount})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {userRole === 'ADMIN' && (
            <button
              onClick={() => {
                setNewProjectCode(projectFilter !== 'ALL' ? projectFilter : (projects[0]?.projectCode || 'AF-VILLA'));
                setIsCreateModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Record Milestone Payment
            </button>
          )}
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <div
          style={{
            padding: '48px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-subtle)',
            margin: '16px 0',
          }}
        >
          <CreditCard size={36} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No Payment Records Found for {projectFilter === 'ALL' ? 'Studio' : projectFilter}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '440px', margin: '0 auto' }}>
            {userRole === 'ADMIN'
              ? `No milestone payments have been logged for ${projectFilter === 'ALL' ? 'any project' : projectFilter} yet. Click "+ Record Milestone Payment" to add one.`
              : 'No payment disbursements have been logged for this project yet.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Project</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Milestone</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Mode</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Reference / UTR</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-strong)',
                          color: 'var(--accent-gold)',
                          fontSize: '11px',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {p.projectCode || 'AF-VILLA'}
                      </span>
                      {p.projectName && (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {p.projectName}
                        </span>
                      )}
                    </div>
                  </td>
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
      )}

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

      {/* Admin Record Payment Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '28px',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '500px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Record Milestone Payment
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Add an architectural milestone disbursement or client fee payment to the verified studio ledger.
            </p>

            {createError && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'rgba(244, 63, 94, 0.1)',
                  border: '1px solid var(--accent-rose)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--accent-rose)',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              >
                {createError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setCreateError(null);
                const amt = parseFloat(newAmount);
                if (!newTitle.trim()) {
                  setCreateError('Milestone title is required.');
                  return;
                }
                if (isNaN(amt) || amt <= 0) {
                  setCreateError('Please enter a valid payment amount greater than zero.');
                  return;
                }
                setIsSubmittingPayment(true);
                try {
                  if (onCreatePayment) {
                    await onCreatePayment({
                      projectCode: newProjectCode,
                      milestoneTitle: newTitle.trim(),
                      amount: amt,
                      paymentMode: newMode,
                      referenceNumber: newRef.trim() || undefined,
                      bankName: newBank.trim() || undefined,
                      status: newStatus,
                    });
                  }
                  setIsCreateModalOpen(false);
                  setNewTitle('');
                  setNewAmount('');
                  setNewRef('');
                  setNewBank('');
                } catch (err: any) {
                  setCreateError(err.message || 'Failed to record payment.');
                } finally {
                  setIsSubmittingPayment(false);
                }
              }}
            >
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Associated Project *
                </label>
                <select
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                  required
                >
                  {projects && projects.length > 0 ? (
                    projects.map((proj) => (
                      <option key={proj.projectCode} value={proj.projectCode}>
                        {proj.projectCode} • {proj.name}
                      </option>
                    ))
                  ) : (
                    <option value="AF-VILLA">AF-VILLA • Villa Horizon</option>
                  )}
                </select>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Every transaction is audited and recorded against this specific studio project.
                </span>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Milestone Name / Description *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Milestone 4: Structural RCC Casting Release"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 450000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Payment Mode
                  </label>
                  <select
                    value={newMode}
                    onChange={(e) => setNewMode(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="NEFT_RTGS">NEFT / RTGS</option>
                    <option value="UPI">UPI</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    UTR / Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UTR-HDFC9823412"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Settlement Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="CONFIRMED">Confirmed / Received</option>
                    <option value="PENDING_CLEARANCE">Pending Clearance</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  style={{
                    padding: '8px 18px',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#0d0f12',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmittingPayment ? 'Recording...' : 'Save Payment Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
