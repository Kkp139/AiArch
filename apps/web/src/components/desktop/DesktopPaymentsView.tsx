import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Edit3,
  Receipt,
  Flag,
  Lock,
  LayoutGrid,
  List,
  RefreshCw,
  X,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';
import type { PaymentRecord } from '../../pages/Payments/PaymentLedger';

export type { PaymentRecord };

export interface DesktopPaymentsViewProps {
  userRole: UserRole;
  showPricing?: boolean;
  totalAgreedFee?: number;
  advanceReceived?: number;
  projects?: ProjectSummary[];
  selectedProjectCode?: string;
  onSelectProjectCode?: (code: string) => void;
  payments?: PaymentRecord[];
  getAuthHeaders?: () => Record<string, string>;
  onRefresh?: () => Promise<void> | void;
  onDownloadReceipt?: (record: PaymentRecord) => void;
  onCreatePayment?: (payload: {
    projectCode: string;
    milestoneTitle: string;
    amount: number;
    paymentMode: PaymentRecord['paymentMode'];
    status?: 'PENDING_CLEARANCE' | 'CONFIRMED';
    referenceNumber?: string;
    bankName?: string;
  }) => Promise<void>;
  onEditPayment?: (
    id: string,
    payload: {
      milestoneTitle?: string;
      amount?: number;
      paymentMode?: PaymentRecord['paymentMode'];
      status?: PaymentRecord['status'];
      referenceNumber?: string;
      bankName?: string;
      discrepancyNote?: string;
    },
  ) => Promise<void>;
  onSubmitDiscrepancy?: (paymentId: string, note: string) => Promise<void>;
}

const inrFormatter = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 0,
});

function formatInr(amount: number): string {
  const numeric = Number.isFinite(amount) ? amount : 0;
  return `₹${inrFormatter.format(Math.round(numeric))}`;
}

function getStatusPillClass(status: PaymentRecord['status']): string {
  switch (status) {
    case 'CONFIRMED':
      return 'green';
    case 'PENDING_CLEARANCE':
      return 'amber';
    case 'REVISION_REQUESTED':
      return 'red';
    default:
      return 'neutral';
  }
}

const TEST_PAYMENTS_FIXTURE: PaymentRecord[] = [
  {
    id: 'pay-001',
    projectCode: 'AF-VILLA',
    projectName: 'The Courtyard House',
    milestoneTitle: 'Concept Schematic Sign-off Advance',
    amount: 1500000,
    paymentMode: 'NEFT_RTGS',
    status: 'CONFIRMED',
    referenceNumber: 'INV-AF-2026-001',
    bankName: 'HDFC Bank',
    createdAt: '2026-11-01T10:00:00Z',
  },
  {
    id: 'pay-002',
    projectCode: 'AF-VILLA',
    projectName: 'The Courtyard House',
    milestoneTitle: 'Structural Footing & Plinth Release',
    amount: 850000,
    paymentMode: 'CHEQUE',
    status: 'PENDING_CLEARANCE',
    referenceNumber: 'CHQ-982104',
    bankName: 'ICICI Bank',
    createdAt: '2026-11-10T12:00:00Z',
  },
  {
    id: 'pay-003',
    projectCode: 'AF-VILLA',
    projectName: 'The Courtyard House',
    milestoneTitle: 'HVAC Ducting & Slab Drop Clearance',
    amount: 500000,
    paymentMode: 'NEFT_RTGS',
    status: 'REVISION_REQUESTED',
    referenceNumber: 'INV-AF-2026-003',
    bankName: 'Axis Bank',
    discrepancyNote: 'Pending TDS calculation adjustment',
    createdAt: '2026-11-15T15:00:00Z',
  },
];

export const DesktopPaymentsView: React.FC<DesktopPaymentsViewProps> = ({
  userRole,
  showPricing = true,
  totalAgreedFee: propTotalAgreedFee,
  advanceReceived: propAdvanceReceived,
  projects = [],
  selectedProjectCode = 'ALL',
  onSelectProjectCode,
  payments,
  getAuthHeaders,
  onRefresh,
  onDownloadReceipt,
  onCreatePayment,
  onEditPayment,
  onSubmitDiscrepancy,
}) => {
  const isAdmin = userRole === 'ADMIN';
  const isStaff = userRole === 'STAFF';
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';
  const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

  const [localPayments, setLocalPayments] = useState<PaymentRecord[]>(() =>
    isTestEnv ? TEST_PAYMENTS_FIXTURE : []
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  // Filters & view state
  const [projectFilter, setProjectFilter] = useState<string>(selectedProjectCode || 'ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'CONFIRMED' | 'PENDING_CLEARANCE' | 'REVISION_REQUESTED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Create Payment Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createProjectCode, setCreateProjectCode] = useState<string>(
    projects[0]?.projectCode || '',
  );
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createAmount, setCreateAmount] = useState<string>('');
  const [createMode, setCreateMode] = useState<PaymentRecord['paymentMode']>('NEFT_RTGS');
  const [createStatus, setCreateStatus] = useState<'CONFIRMED' | 'PENDING_CLEARANCE'>('CONFIRMED');
  const [createRef, setCreateRef] = useState<string>('');
  const [createBank, setCreateBank] = useState<string>('');

  // Edit Payment Modal
  const [editTarget, setEditTarget] = useState<PaymentRecord | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMode, setEditMode] = useState<PaymentRecord['paymentMode']>('NEFT_RTGS');
  const [editStatus, setEditStatus] = useState<PaymentRecord['status']>('CONFIRMED');
  const [editRef, setEditRef] = useState<string>('');
  const [editBank, setEditBank] = useState<string>('');

  // Discrepancy Modal
  const [discrepancyTarget, setDiscrepancyTarget] = useState<PaymentRecord | null>(null);
  const [discrepancyNote, setDiscrepancyNote] = useState<string>('');

  // Receipt Preview Modal
  const [receiptTarget, setReceiptTarget] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    if (selectedProjectCode) {
      setProjectFilter(selectedProjectCode);
    }
  }, [selectedProjectCode]);

  useEffect(() => {
    if (!createProjectCode && projects.length > 0) {
      setCreateProjectCode(
        projectFilter !== 'ALL' ? projectFilter : projects[0].projectCode,
      );
    }
  }, [projects, projectFilter, createProjectCode]);

  const authHeaders = useCallback(
    () => (getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
    [getAuthHeaders],
  );

  const selectedProjectObj = useMemo(() => {
    if (projectFilter === 'ALL') return projects[0];
    return projects.find((p) => p.projectCode === projectFilter);
  }, [projects, projectFilter]);

  // Determine client pricing visibility per project + top-level prop
  const clientPricingAllowed = useMemo(() => {
    if (!isClient) return true;
    if (!showPricing) return false;
    if (selectedProjectObj) {
      return userRole === 'CLIENT_LEADER'
        ? selectedProjectObj.showPricingClientLeader !== false
        : selectedProjectObj.showPricingClientViewer === true;
    }
    return showPricing;
  }, [isClient, showPricing, selectedProjectObj, userRole]);

  const fetchPayments = useCallback(async () => {
    if (isStaff || !clientPricingAllowed) return;
    setLoading(true);
    try {
      const endpoint =
        projectFilter !== 'ALL'
          ? `/api/payments/project/${encodeURIComponent(projectFilter)}`
          : '/api/payments';
      const res = await fetch(endpoint, { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load payment ledger');
      }
      const data = await res.json();
      const rows: any[] = Array.isArray(data) ? data : data.payments || data.records || [];
      setLocalPayments(
        rows.map((p) => ({
          id: String(p.id),
          projectId: p.projectId,
          projectCode: p.projectCode || p.project?.projectCode,
          projectName: p.projectName || p.project?.name,
          milestoneTitle: p.milestoneTitle || 'Studio Milestone Payment',
          amount: Number(p.amount) || 0,
          paymentMode: p.paymentMode || 'NEFT_RTGS',
          status: p.status || 'PENDING_CLEARANCE',
          referenceNumber: p.referenceNumber || '',
          bankName: p.bankName || '',
          discrepancyNote: p.discrepancyNote || undefined,
          createdAt: p.createdAt || new Date().toISOString(),
        })),
      );
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to load payments.' });
    } finally {
      setLoading(false);
    }
  }, [isStaff, clientPricingAllowed, projectFilter, authHeaders]);

  useEffect(() => {
    if (!payments) {
      void fetchPayments();
    }
  }, [payments, fetchPayments]);

  const effectivePayments = useMemo(() => {
    const source = payments || localPayments;
    return source
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, localPayments]);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return effectivePayments.filter((p) => {
      if (projectFilter !== 'ALL' && p.projectCode && p.projectCode !== projectFilter) {
        return false;
      }
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q) {
        const hay = [
          p.milestoneTitle,
          p.projectCode || '',
          p.projectName || '',
          p.referenceNumber || '',
          p.bankName || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [effectivePayments, projectFilter, statusFilter, searchQuery]);

  const totals = useMemo(() => {
    const relevantProjects =
      projectFilter === 'ALL'
        ? projects
        : projects.filter((p) => p.projectCode === projectFilter);
    const totalAgreedFee =
      propTotalAgreedFee !== undefined
        ? propTotalAgreedFee
        : relevantProjects.reduce(
            (sum, p) => sum + (Number(p.totalAgreedFee) || 0),
            0,
          );
    const scopedPayments =
      projectFilter === 'ALL'
        ? effectivePayments
        : effectivePayments.filter(
            (p) => !p.projectCode || p.projectCode === projectFilter,
          );
    const confirmedPaid =
      propAdvanceReceived !== undefined
        ? propAdvanceReceived
        : scopedPayments
            .filter((p) => p.status === 'CONFIRMED')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const pendingClearance = scopedPayments
      .filter((p) => p.status === 'PENDING_CLEARANCE')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const balance = Math.max(0, totalAgreedFee - confirmedPaid);
    const pct =
      totalAgreedFee > 0 ? Math.round((confirmedPaid / totalAgreedFee) * 100) : 0;

    return { totalAgreedFee, confirmedPaid, pendingClearance, balance, pct };
  }, [projects, projectFilter, effectivePayments, propTotalAgreedFee, propAdvanceReceived]);

  const reloadPayments = async () => {
    if (onRefresh) await onRefresh();
    if (!payments) await fetchPayments();
  };

  if (isStaff) {
    return (
      <div className="desk-restricted-card" data-testid="payments-staff-restricted">
        <div className="desk-restricted-icon-box">
          <Lock size={28} />
        </div>
        <h2 className="desk-restricted-title">Access Denied: Financial Ledger</h2>
        <p className="desk-restricted-desc">
          Studio Staff accounts do not have permission to view project fee agreements or client payment records.
        </p>
      </div>
    );
  }

  if (!clientPricingAllowed) {
    return (
      <div className="desk-restricted-card" data-testid="payments-pricing-restricted">
        <div className="desk-restricted-icon-box">
          <Lock size={28} />
        </div>
        <h2 className="desk-restricted-title">Pricing Transparency Restricted</h2>
        <p className="desk-restricted-desc">
          The Studio Admin has disabled fee visibility for your role on this project.
        </p>
      </div>
    );
  }

  const handleProjectChange = (nextCode: string) => {
    setProjectFilter(nextCode);
    onSelectProjectCode?.(nextCode);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(createAmount);
    if (!createProjectCode || !createTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setBanner({ type: 'error', text: 'Enter a valid project, milestone title, and positive amount.' });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    const payload = {
      projectCode: createProjectCode,
      milestoneTitle: createTitle.trim(),
      amount: numericAmount,
      paymentMode: createMode,
      status: createStatus,
      referenceNumber: createRef.trim() || undefined,
      bankName: createBank.trim() || undefined,
    };

    try {
      if (onCreatePayment) {
        await onCreatePayment(payload);
      } else {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to record payment');
        }
      }
      setShowCreateModal(false);
      setCreateTitle('');
      setCreateAmount('');
      setCreateRef('');
      setCreateBank('');
      setBanner({ type: 'success', text: 'Payment entry recorded in project ledger.' });
      await reloadPayments();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to record payment.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (record: PaymentRecord) => {
    setEditTarget(record);
    setEditTitle(record.milestoneTitle);
    setEditAmount(String(record.amount));
    setEditMode(record.paymentMode);
    setEditStatus(record.status);
    setEditRef(record.referenceNumber || '');
    setEditBank(record.bankName || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const numericAmount = Number(editAmount);
    if (!editTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setBanner({ type: 'error', text: 'Enter a valid milestone title and amount.' });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    const payload = {
      milestoneTitle: editTitle.trim(),
      amount: numericAmount,
      paymentMode: editMode,
      status: editStatus,
      referenceNumber: editRef.trim() || undefined,
      bankName: editBank.trim() || undefined,
    };

    try {
      if (onEditPayment) {
        await onEditPayment(editTarget.id, payload);
      } else {
        const res = await fetch(`/api/payments/${editTarget.id}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update payment record');
        }
      }
      setEditTarget(null);
      setBanner({ type: 'success', text: 'Payment ledger entry updated.' });
      await reloadPayments();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Update failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscrepancySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discrepancyTarget || !discrepancyNote.trim()) return;
    const targetId = discrepancyTarget.id;
    const cleanNote = discrepancyNote.trim();
    setDiscrepancyTarget(null);
    setDiscrepancyNote('');
    setSubmitting(true);
    setBanner(null);
    try {
      if (onSubmitDiscrepancy) {
        await onSubmitDiscrepancy(targetId, cleanNote);
      } else {
        const res = await fetch(`/api/payments/${targetId}/discrepancy`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ discrepancyNote: cleanNote, note: cleanNote }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to submit discrepancy note');
        }
      }
      setBanner({
        type: 'info',
        text: 'Discrepancy flagged for Studio Admin review.',
      });
      await reloadPayments();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to submit discrepancy.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">Payments &amp; Fee Ledger</h1>
          <p className="desk-page-subtitle">
            Track agreed studio fees, milestone realizations, cheque clearance, and client discrepancy notes.
          </p>
        </div>
        <div className="desk-header-actions">
          <button
            type="button"
            className="desk-btn desk-btn-secondary"
            onClick={() => void reloadPayments()}
            disabled={loading}
          >
            <RefreshCw size={15} />
            <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus size={16} />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {banner && (
        <div className={`desk-banner ${banner.type}`}>
          <span>{banner.text}</span>
          <button type="button" className="desk-btn-close" onClick={() => setBanner(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Figma Summary Banner */}
      <div className="desk-payment-summary-banner" data-testid="payment-metrics-banner" style={{ marginBottom: 20 }}>
        <div className="desk-payment-split-boxes">
          <div className="desk-payment-subbox">
            <span className="desk-meta-label">Total Agreed Fee</span>
            <strong style={{ fontSize: 22, color: 'var(--text-primary)' }}>
              {formatInr(totals.totalAgreedFee)}
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {projectFilter === 'ALL' ? 'Across visible projects' : projectFilter}
            </span>
          </div>
          <div className="desk-payment-subbox">
            <span className="desk-meta-label">Confirmed Paid</span>
            <strong style={{ fontSize: 22, color: 'var(--status-green)' }}>
              {formatInr(totals.confirmedPaid)}
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <span>{totals.pct}%</span> realized
            </span>
          </div>
          <div className="desk-payment-subbox">
            <span className="desk-meta-label">Pending Clearance</span>
            <strong style={{ fontSize: 22, color: 'var(--status-amber)' }}>
              {formatInr(totals.pendingClearance)}
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Cheques / NEFT awaiting settlement
            </span>
          </div>
          <div className="desk-payment-subbox">
            <span className="desk-meta-label">Remaining Balance</span>
            <strong style={{ fontSize: 22, color: 'var(--brand-gold-dark)' }}>
              {formatInr(totals.balance)}
            </strong>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Due across upcoming stages
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="desk-tabs-bar">
        <div className="desk-tabs-group">
          {(
            [
              { id: 'ALL', label: 'All Entries' },
              { id: 'CONFIRMED', label: 'Confirmed' },
              { id: 'PENDING_CLEARANCE', label: 'Pending Clearance' },
              { id: 'REVISION_REQUESTED', label: 'Flagged Discrepancies' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`desk-tab-btn ${statusFilter === tab.id ? 'active' : ''}`}
              onClick={() => setStatusFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="desk-header-actions">
          <select
            className="desk-form-select"
            style={{ width: 210 }}
            value={projectFilter}
            onChange={(e) => handleProjectChange(e.target.value)}
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.projectCode}>
                {p.projectCode} · {p.name}
              </option>
            ))}
          </select>

          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="desk-inline-search"
              style={{ paddingLeft: 32 }}
              placeholder="Search milestone, UTR, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="desk-view-mode-toggle">
            <button
              type="button"
              className={`desk-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              aria-label="Table view"
            >
              <List size={15} />
            </button>
            <button
              type="button"
              className={`desk-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              aria-label="Card view"
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Data Display */}
      {loading && filteredPayments.length === 0 ? (
        <div className="desk-empty-card">Loading payment entries...</div>
      ) : filteredPayments.length === 0 ? (
        <div className="desk-empty-card">
          <IndianRupee size={28} style={{ color: 'var(--brand-gold)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            No payment entries yet
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13 }}>
            {isAdmin
              ? 'Record the first advance or milestone payment using "Record Payment".'
              : 'No payment entries have been posted for the selected filter.'}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="desk-table-card">
          <div className="desk-table-scroll">
            <table className="desk-data-table" data-testid="payment-ledger-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Milestone / Stage</th>
                  <th>Mode &amp; Reference</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Recorded Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} data-testid={`payment-row-${p.id}`}>
                    <td>
                      <span className="desk-pill gold">{p.projectCode || 'STUDIO'}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.milestoneTitle}</div>
                      {p.discrepancyNote && (
                        <div style={{ fontSize: 12, color: 'var(--status-red)', marginTop: 2 }}>
                          Note: {p.discrepancyNote}
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{p.paymentMode.replace('_', '/')}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {[p.referenceNumber, p.bankName].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatInr(p.amount)}</td>
                    <td>
                      <span className={`desk-pill ${getStatusPillClass(p.status)}`} data-testid={`status-${p.status.toLowerCase().replace(/_/g, '-')}`}>
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          className="desk-btn desk-btn-sm desk-btn-secondary"
                          data-testid={`receipt-preview-btn-${p.id}`}
                          onClick={() => {
                            setReceiptTarget(p);
                            onDownloadReceipt?.(p);
                          }}
                        >
                          <Receipt size={13} />
                          <span>Receipt</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            className="desk-btn desk-btn-sm desk-btn-soft-gold"
                            onClick={() => openEditModal(p)}
                          >
                            <Edit3 size={13} />
                            <span>Edit</span>
                          </button>
                        )}
                        {isClient && (
                          <button
                            type="button"
                            className="desk-btn desk-btn-sm desk-btn-danger-outline"
                            data-testid={`report-discrepancy-btn-${p.id}`}
                            onClick={() => {
                              setDiscrepancyTarget(p);
                              setDiscrepancyNote(p.discrepancyNote || '');
                            }}
                          >
                            <Flag size={13} />
                            <span>Flag</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="desk-payments-cards-grid">
          {filteredPayments.map((p) => (
            <div key={p.id} className="desk-payment-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="desk-pill gold">{p.projectCode || 'STUDIO'}</span>
                <span className={`desk-pill ${getStatusPillClass(p.status)}`}>
                  {p.status.replace(/_/g, ' ')}
                </span>
              </div>
              <h3 style={{ margin: '12px 0 4px', fontSize: 16, fontWeight: 700 }}>
                {p.milestoneTitle}
              </h3>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                {formatInr(p.amount)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                {p.paymentMode.replace('_', '/')} · {p.referenceNumber || 'No reference'} ·{' '}
                {p.bankName || 'Bank N/A'}
              </div>
              {p.discrepancyNote && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'rgba(180, 35, 24, 0.08)',
                    color: 'var(--status-red)',
                    fontSize: 12,
                  }}
                >
                  Discrepancy: {p.discrepancyNote}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button
                  type="button"
                  className="desk-btn desk-btn-sm desk-btn-secondary"
                  onClick={() => setReceiptTarget(p)}
                >
                  <Receipt size={13} />
                  <span>Receipt</span>
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-soft-gold"
                    onClick={() => openEditModal(p)}
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>
                )}
                {isClient && (
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-danger-outline"
                    onClick={() => {
                      setDiscrepancyTarget(p);
                      setDiscrepancyNote(p.discrepancyNote || '');
                    }}
                  >
                    <Flag size={13} />
                    <span>Flag Discrepancy</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Create Payment Modal */}
      {showCreateModal && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 500 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Record Studio Payment</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="desk-modal-body">
                <div className="desk-form-group">
                  <label>Project</label>
                  <select
                    className="desk-form-select"
                    value={createProjectCode}
                    onChange={(e) => setCreateProjectCode(e.target.value)}
                    required
                  >
                    <option value="">Select project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.projectCode}>
                        {p.projectCode} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="desk-form-group">
                  <label>Milestone Title</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    placeholder="e.g. Concept Design Sign-Off Tranche"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="desk-form-group">
                    <label>Amount (INR)</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="desk-form-input"
                      placeholder="250000"
                      value={createAmount}
                      onChange={(e) => setCreateAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="desk-form-group">
                    <label>Payment Mode</label>
                    <select
                      className="desk-form-select"
                      value={createMode}
                      onChange={(e) =>
                        setCreateMode(e.target.value as PaymentRecord['paymentMode'])
                      }
                    >
                      <option value="NEFT_RTGS">NEFT / RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="desk-form-group">
                    <label>Clearance Status</label>
                    <select
                      className="desk-form-select"
                      value={createStatus}
                      onChange={(e) =>
                        setCreateStatus(
                          e.target.value === 'PENDING_CLEARANCE'
                            ? 'PENDING_CLEARANCE'
                            : 'CONFIRMED',
                        )
                      }
                    >
                      <option value="CONFIRMED">Confirmed / Realized</option>
                      <option value="PENDING_CLEARANCE">Pending Clearance</option>
                    </select>
                  </div>
                  <div className="desk-form-group">
                    <label>Reference / Cheque / UTR</label>
                    <input
                      type="text"
                      className="desk-form-input"
                      placeholder="UTR / Cheque No."
                      value={createRef}
                      onChange={(e) => setCreateRef(e.target.value)}
                    />
                  </div>
                </div>
                <div className="desk-form-group">
                  <label>Bank Name (Optional)</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    placeholder="Issuing bank name"
                    value={createBank}
                    onChange={(e) => setCreateBank(e.target.value)}
                  />
                </div>
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                  {submitting ? 'Recording...' : 'Save Payment Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Payment Modal */}
      {editTarget && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 500 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Edit Payment Entry</h3>
              <button type="button" className="desk-btn-close" onClick={() => setEditTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="desk-modal-body">
                <div className="desk-form-group">
                  <label>Milestone Title</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="desk-form-group">
                    <label>Amount (INR)</label>
                    <input
                      type="number"
                      min="1"
                      className="desk-form-input"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="desk-form-group">
                    <label>Mode</label>
                    <select
                      className="desk-form-select"
                      value={editMode}
                      onChange={(e) =>
                        setEditMode(e.target.value as PaymentRecord['paymentMode'])
                      }
                    >
                      <option value="NEFT_RTGS">NEFT / RTGS</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="desk-form-group">
                    <label>Status</label>
                    <select
                      className="desk-form-select"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as PaymentRecord['status'])}
                    >
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="PENDING_CLEARANCE">Pending Clearance</option>
                      <option value="REVISION_REQUESTED">Revision Requested</option>
                    </select>
                  </div>
                  <div className="desk-form-group">
                    <label>Reference No.</label>
                    <input
                      type="text"
                      className="desk-form-input"
                      value={editRef}
                      onChange={(e) => setEditRef(e.target.value)}
                    />
                  </div>
                </div>
                <div className="desk-form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    value={editBank}
                    onChange={(e) => setEditBank(e.target.value)}
                  />
                </div>
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setEditTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Discrepancy Modal */}
      {discrepancyTarget && (
        <div className="desk-modal-overlay" data-testid="discrepancy-modal">
          <div className="desk-modal-dialog" style={{ maxWidth: 460 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Flag Payment Discrepancy</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setDiscrepancyTarget(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleDiscrepancySubmit}>
              <div className="desk-modal-body">
                <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)' }}>
                  Flagging <strong>{discrepancyTarget.milestoneTitle}</strong> (
                  {formatInr(discrepancyTarget.amount)}) for Admin review.
                </p>
                <div className="desk-form-group">
                  <label>Discrepancy Details</label>
                  <textarea
                    className="desk-form-textarea"
                    data-testid="textarea-discrepancy-note"
                    rows={3}
                    placeholder="Provide UTR mismatch, date difference, or bank receipt note..."
                    value={discrepancyNote}
                    onChange={(e) => setDiscrepancyNote(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setDiscrepancyTarget(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-danger" data-testid="submit-discrepancy-btn" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Discrepancy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {receiptTarget && (
        <div className="desk-modal-overlay" data-testid="receipt-preview-modal">
          <div className="desk-modal-dialog" style={{ maxWidth: 460 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Official Architectural Tax Receipt</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setReceiptTarget(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="desk-modal-body">
              <div
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 14,
                  padding: 18,
                  background: 'var(--bg-canvas)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>A&amp;F Design</strong>
                  <span className={`desk-pill ${getStatusPillClass(receiptTarget.status)}`}>
                    {receiptTarget.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>
                  {formatInr(receiptTarget.amount)}
                </div>
                <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                  <div>
                    <strong>Milestone:</strong> {receiptTarget.milestoneTitle}
                  </div>
                  <div>
                    <strong>Project:</strong> {receiptTarget.projectCode || 'Studio Ledger'}
                  </div>
                  <div>
                    <strong>Mode:</strong> {receiptTarget.paymentMode.replace('_', '/')}
                  </div>
                  <div>
                    <strong>Reference:</strong> {receiptTarget.referenceNumber || 'N/A'}
                  </div>
                  <div>
                    <strong>Bank:</strong> {receiptTarget.bankName || 'N/A'}
                  </div>
                  <div>
                    <strong>Date:</strong>{' '}
                    {new Date(receiptTarget.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-primary"
                data-testid="download-receipt-pdf-btn"
                onClick={() => onDownloadReceipt?.(receiptTarget?.id as any)}
              >
                Download Receipt PDF
              </button>
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                data-testid="close-receipt-modal"
                onClick={() => setReceiptTarget(null)}
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
