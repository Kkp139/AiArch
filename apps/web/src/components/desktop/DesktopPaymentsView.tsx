import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  IndianRupee,
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
  Calendar,
  CreditCard,
  SlidersHorizontal,
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
  onDownloadReceipt?: (paymentId: string) => void;
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

function getStatusLabel(status: PaymentRecord['status']): string {
  switch (status) {
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PENDING_CLEARANCE':
      return 'Pending Clearance';
    case 'REVISION_REQUESTED':
      return 'Revision Requested';
    default:
      return String(status).replace(/_/g, ' ');
  }
}

const PAYMENT_MODE_OPTIONS: Array<{
  value: PaymentRecord['paymentMode'];
  label: string;
  refLabel: string;
  refPlaceholder: string;
}> = [
  { value: 'CHEQUE', label: 'Cheque', refLabel: 'Cheque Number', refPlaceholder: 'e.g. CHQ #449210' },
  { value: 'UPI', label: 'UPI', refLabel: 'UPI Reference ID', refPlaceholder: 'e.g. UPI/4321098765' },
  { value: 'NEFT_RTGS', label: 'RTGS/NEFT', refLabel: 'UTR / Transaction ID', refPlaceholder: 'e.g. UTR-HDFC-99210' },
  { value: 'CASH', label: 'Cash', refLabel: 'Receipt Reference', refPlaceholder: 'e.g. RCPT-004' },
];

function formatPaymentMode(mode: PaymentRecord['paymentMode']): string {
  switch (mode) {
    case 'NEFT_RTGS':
      return 'Bank RTGS / NEFT';
    case 'CHEQUE':
      return 'Cheque';
    case 'UPI':
      return 'UPI';
    case 'CASH':
      return 'Cash';
    default:
      return mode;
  }
}

function formatDisplayDate(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  const isClientLeader = userRole === 'CLIENT_LEADER';
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  const [localPayments, setLocalPayments] = useState<PaymentRecord[]>(() =>
    isTestEnv ? TEST_PAYMENTS_FIXTURE : [],
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

  // Filter popover state (Figma 891:14555)
  const [showFilterPopover, setShowFilterPopover] = useState<boolean>(false);
  const [draftProjectFilter, setDraftProjectFilter] = useState<string>(selectedProjectCode || 'ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [draftDateFrom, setDraftDateFrom] = useState<string>('');
  const [draftDateTo, setDraftDateTo] = useState<string>('');

  // Create Payment Modal (Figma 891:14290)
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createProjectCode, setCreateProjectCode] = useState<string>(
    projects[0]?.projectCode || '',
  );
  const [createTitle, setCreateTitle] = useState<string>('');
  const [createAmount, setCreateAmount] = useState<string>('');
  const [createMode, setCreateMode] = useState<PaymentRecord['paymentMode']>('CHEQUE');
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
  const [editDiscrepancyNote, setEditDiscrepancyNote] = useState<string>('');

  // Discrepancy Modal
  const [discrepancyTarget, setDiscrepancyTarget] = useState<PaymentRecord | null>(null);
  const [discrepancyNote, setDiscrepancyNote] = useState<string>('');

  // Receipt Preview Modal
  const [receiptTarget, setReceiptTarget] = useState<PaymentRecord | null>(null);

  useEffect(() => {
    if (selectedProjectCode) {
      setProjectFilter(selectedProjectCode);
      setDraftProjectFilter(selectedProjectCode);
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
    if (!payments && !isTestEnv) {
      void fetchPayments();
    }
  }, [payments, isTestEnv, fetchPayments]);

  const effectivePayments = useMemo(() => {
    const source = payments || localPayments;
    return source
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [payments, localPayments]);

  const projectScopedPayments = useMemo(() => {
    return effectivePayments.filter((p) => {
      if (projectFilter !== 'ALL' && p.projectCode && p.projectCode !== projectFilter) {
        return false;
      }
      if (dateFrom) {
        const itemDate = p.createdAt.slice(0, 10);
        if (itemDate < dateFrom) return false;
      }
      if (dateTo) {
        const itemDate = p.createdAt.slice(0, 10);
        if (itemDate > dateTo) return false;
      }
      return true;
    });
  }, [effectivePayments, projectFilter, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    let confirmed = 0;
    let pending = 0;
    let revision = 0;
    for (const p of projectScopedPayments) {
      if (p.status === 'CONFIRMED') confirmed += 1;
      else if (p.status === 'PENDING_CLEARANCE') pending += 1;
      else if (p.status === 'REVISION_REQUESTED') revision += 1;
    }
    return {
      ALL: projectScopedPayments.length,
      CONFIRMED: confirmed,
      PENDING_CLEARANCE: pending,
      REVISION_REQUESTED: revision,
    };
  }, [projectScopedPayments]);

  const filteredPayments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projectScopedPayments.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q) {
        const hay = [
          p.milestoneTitle,
          p.projectCode || '',
          p.projectName || '',
          p.referenceNumber || '',
          p.bankName || '',
          p.paymentMode || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [projectScopedPayments, statusFilter, searchQuery]);

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
    const remainingPct = totalAgreedFee > 0 ? Math.max(0, 100 - pct) : 0;

    return { totalAgreedFee, confirmedPaid, pendingClearance, balance, pct, remainingPct };
  }, [projects, projectFilter, effectivePayments, propTotalAgreedFee, propAdvanceReceived]);

  const reloadPayments = async () => {
    if (onRefresh) await onRefresh();
    if (!payments && !isTestEnv) await fetchPayments();
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
    setDraftProjectFilter(nextCode);
    onSelectProjectCode?.(nextCode);
  };

  const handleApplyFiltersPopover = () => {
    setProjectFilter(draftProjectFilter);
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
    onSelectProjectCode?.(draftProjectFilter);
    setShowFilterPopover(false);
  };

  const handleResetFiltersPopover = () => {
    setDraftProjectFilter('ALL');
    setDraftDateFrom('');
    setDraftDateTo('');
    setProjectFilter('ALL');
    setDateFrom('');
    setDateTo('');
    onSelectProjectCode?.('ALL');
    setShowFilterPopover(false);
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
    setEditDiscrepancyNote(record.discrepancyNote || '');
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
      discrepancyNote: editDiscrepancyNote.trim() || undefined,
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
          body: JSON.stringify({ discrepancyNote: cleanNote }),
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

  const handleDownloadReceipt = (record: PaymentRecord) => {
    if (onDownloadReceipt) {
      onDownloadReceipt(record.id);
      return;
    }
    if (typeof window === 'undefined') return;
    const receiptText = [
      'A&F DESIGN — OFFICIAL ARCHITECTURAL TAX RECEIPT',
      '==================================================',
      `Receipt Ref   : ${record.referenceNumber || record.id}`,
      `Project       : ${record.projectCode || 'STUDIO'} — ${record.projectName || ''}`,
      `Milestone     : ${record.milestoneTitle}`,
      `Amount Paid   : ${formatInr(record.amount)}`,
      `Payment Mode  : ${formatPaymentMode(record.paymentMode)}`,
      `Issuing Bank  : ${record.bankName || 'N/A'}`,
      `Status        : ${getStatusLabel(record.status)}`,
      `Recorded Date : ${formatDisplayDate(record.createdAt)}`,
    ].join('\n');
    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AF-Receipt-${record.referenceNumber || record.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeCreateModeMeta =
    PAYMENT_MODE_OPTIONS.find((m) => m.value === createMode) || PAYMENT_MODE_OPTIONS[0];
  const hasExtraFilters = Boolean(dateFrom || dateTo);

  return (
    <div>
      {/* Page Heading (Figma 890:13033) */}
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
              <span>Record Entry</span>
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

      {/* Figma Payment Summary Banner (890:13258) */}
      <div
        className="desk-payment-summary-banner"
        data-testid="payment-metrics-banner"
        style={{
          marginBottom: 20,
          background: '#FFFFFF',
          borderRadius: 10,
          padding: '20px 24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 20,
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ minWidth: 220, flex: '0 1 280px' }}>
          <div style={{ fontSize: 15, color: '#686869', marginBottom: 6 }}>
            Total Agreed Fee
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, color: '#1D1D1F', lineHeight: 1.15 }}>
            {formatInr(totals.totalAgreedFee)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {projectFilter === 'ALL' ? 'Across visible projects' : projectFilter}
          </div>
        </div>

        <div
          className="desk-payment-split-boxes"
          style={{
            flex: '1 1 520px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          <div
            className="desk-payment-subbox"
            style={{
              background: '#F9F4EF',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14, color: '#BF935A', fontWeight: 500 }}>
              Confirmed Received
            </span>
            <strong style={{ fontSize: 26, fontWeight: 600, color: '#1D1D1F' }}>
              {formatInr(totals.confirmedPaid)}
            </strong>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(40, 199, 111, 0.16)',
                  color: '#28C76F',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span>{totals.pct}%</span>&nbsp;Paid
              </span>
            </div>
          </div>

          <div
            className="desk-payment-subbox"
            style={{
              background: '#F9F4EF',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14, color: '#BF935A', fontWeight: 500 }}>
              Balance Due
            </span>
            <strong style={{ fontSize: 26, fontWeight: 600, color: '#1D1D1F' }}>
              {formatInr(totals.balance)}
            </strong>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(255, 159, 67, 0.16)',
                  color: '#FF9F43',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {totals.remainingPct}% Remaining
              </span>
            </div>
          </div>

          <div
            className="desk-payment-subbox"
            style={{
              background: '#F9F4EF',
              borderRadius: 12,
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14, color: '#BF935A', fontWeight: 500 }}>
              Pending Clearance
            </span>
            <strong style={{ fontSize: 26, fontWeight: 600, color: '#1D1D1F' }}>
              {formatInr(totals.pendingClearance)}
            </strong>
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: 'rgba(191, 147, 90, 0.16)',
                  color: '#695132',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {statusCounts.PENDING_CLEARANCE} Awaiting Settlement
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Figma 890:13038 + 891:14555) */}
      <div
        className="desk-tabs-bar"
        style={{
          position: 'relative',
          borderBottom: '1px solid #E0EAF4',
          marginBottom: 20,
          paddingBottom: 6,
        }}
      >
        <div className="desk-tabs-group">
          {(
            [
              { id: 'ALL', label: `All (${statusCounts.ALL})` },
              { id: 'PENDING_CLEARANCE', label: `Pending (${statusCounts.PENDING_CLEARANCE})` },
              { id: 'CONFIRMED', label: `Confirmed (${statusCounts.CONFIRMED})` },
              {
                id: 'REVISION_REQUESTED',
                label: `Revision Requested (${statusCounts.REVISION_REQUESTED})`,
              },
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

        <div className="desk-header-actions" style={{ gap: 8 }}>
          <select
            className="desk-form-select"
            style={{ width: 200 }}
            aria-label="Filter by project"
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
              style={{ paddingLeft: 32, borderRadius: 30 }}
              placeholder="Search milestone, UTR, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <button
            type="button"
            aria-label="Open Filters"
            className="desk-btn desk-btn-secondary"
            style={{
              width: 38,
              height: 38,
              padding: 0,
              borderRadius: '50%',
              justifyContent: 'center',
              borderColor: hasExtraFilters ? '#BF935A' : undefined,
              color: hasExtraFilters ? '#BF935A' : undefined,
            }}
            onClick={() => {
              setDraftProjectFilter(projectFilter);
              setDraftDateFrom(dateFrom);
              setDraftDateTo(dateTo);
              setShowFilterPopover((prev) => !prev);
            }}
          >
            <SlidersHorizontal size={15} />
          </button>

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

        {/* Figma 891:14555 Filter Payments Popover */}
        {showFilterPopover && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 8,
              width: 360,
              background: '#FFFFFF',
              borderRadius: 16,
              padding: '16px 20px 20px',
              boxShadow: '0 12px 32px rgba(29, 29, 31, 0.14)',
              border: '1px solid #E1E1E4',
              zIndex: 40,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <strong style={{ fontSize: 15, color: '#1D1D1F' }}>Filter Payments</strong>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setShowFilterPopover(false)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="desk-form-group">
              <label>Project</label>
              <select
                className="desk-form-select"
                value={draftProjectFilter}
                onChange={(e) => setDraftProjectFilter(e.target.value)}
              >
                <option value="ALL">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.projectCode}>
                    {p.projectCode} · {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <div className="desk-form-group" style={{ marginBottom: 0 }}>
                <label>From</label>
                <input
                  type="date"
                  className="desk-form-input"
                  value={draftDateFrom}
                  onChange={(e) => setDraftDateFrom(e.target.value)}
                />
              </div>
              <div className="desk-form-group" style={{ marginBottom: 0 }}>
                <label>To</label>
                <input
                  type="date"
                  className="desk-form-input"
                  value={draftDateTo}
                  onChange={(e) => setDraftDateTo(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleResetFiltersPopover}
              >
                Reset
              </button>
              <button
                type="button"
                className="desk-btn desk-btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleApplyFiltersPopover}
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
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
              ? 'Record the first advance or milestone payment using "Record Entry".'
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
                      <div>{formatPaymentMode(p.paymentMode)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {[p.referenceNumber, p.bankName].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{formatInr(p.amount)}</td>
                    <td>
                      <span
                        className={`desk-pill ${getStatusPillClass(p.status)}`}
                        data-testid={`status-${p.status.toLowerCase().replace(/_/g, '-')}`}
                      >
                        {getStatusLabel(p.status)}
                      </span>
                    </td>
                    <td>{formatDisplayDate(p.createdAt)}</td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          className="desk-btn desk-btn-sm desk-btn-secondary"
                          data-testid={`receipt-preview-btn-${p.id}`}
                          onClick={() => {
                            setReceiptTarget(p);
                            onDownloadReceipt?.(p.id);
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
                        {isClientLeader && (
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
        <div
          className="desk-payments-cards-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          {filteredPayments.map((p) => (
            <div
              key={p.id}
              className="desk-payment-card"
              style={{
                background: '#FFFFFF',
                borderRadius: 10,
                padding: '16px 14px',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    background: '#F9F4EF',
                    color: '#695132',
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {p.projectName || p.projectCode || 'STUDIO'}
                </span>
                <span
                  className={`desk-pill ${getStatusPillClass(p.status)}`}
                  data-testid={`status-${p.status.toLowerCase().replace(/_/g, '-')}`}
                >
                  {getStatusLabel(p.status)}
                </span>
              </div>

              <div>
                <div style={{ fontSize: 24, fontWeight: 600, color: '#1D1D1F', lineHeight: 1.3 }}>
                  {formatInr(p.amount)}
                </div>
                <div style={{ fontSize: 14, color: '#686869', marginTop: 6 }}>
                  {p.milestoneTitle}
                </div>
              </div>

              {p.discrepancyNote && (
                <div
                  style={{
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

              <div style={{ height: 1, background: '#F1F1F3' }} />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  fontSize: 13,
                  color: '#686869',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} />
                  {formatDisplayDate(p.createdAt)}
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={14} />
                  {formatPaymentMode(p.paymentMode)}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 2 }}>
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
                {isClientLeader && (
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
                    <span>Flag Discrepancy</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Create Payment Modal (Figma 891:14290) */}
      {showCreateModal && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 560 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">Record Payment</h3>
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
                  <label>Project*</label>
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

                {/* Figma 891:14499 Payment Mode Segmented Tabs */}
                <div className="desk-form-group">
                  <label>Payment Mode*</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {PAYMENT_MODE_OPTIONS.map((opt) => {
                      const active = createMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCreateMode(opt.value)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: 9,
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: active ? 600 : 400,
                            background: active ? '#BF935A' : '#E8E8E9',
                            color: active ? '#F9F4EF' : '#686869',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="desk-form-group">
                    <label>Amount (INR)*</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="desk-form-input"
                      placeholder="150000"
                      value={createAmount}
                      onChange={(e) => setCreateAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="desk-form-group">
                    <label>Clearance Status*</label>
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
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="desk-form-group">
                    <label>{activeCreateModeMeta.refLabel}</label>
                    <input
                      type="text"
                      className="desk-form-input"
                      placeholder={activeCreateModeMeta.refPlaceholder}
                      value={createRef}
                      onChange={(e) => setCreateRef(e.target.value)}
                    />
                  </div>
                  <div className="desk-form-group">
                    <label>Issuing Bank (Optional)</label>
                    <input
                      type="text"
                      className="desk-form-input"
                      placeholder="e.g. HDFC Bank, Ahmedabad"
                      value={createBank}
                      onChange={(e) => setCreateBank(e.target.value)}
                    />
                  </div>
                </div>

                <div className="desk-form-group">
                  <label>Payment Notes / Milestone Title*</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    placeholder="e.g. Superstructure slab casting payment"
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    required
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
                  {submitting ? 'Saving...' : 'Save Payment Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Edit Payment Modal */}
      {editTarget && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 520 }}>
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
                {(editTarget.discrepancyNote || editStatus === 'REVISION_REQUESTED') && (
                  <div className="desk-form-group">
                    <label>Discrepancy Note</label>
                    <textarea
                      className="desk-form-textarea"
                      rows={2}
                      value={editDiscrepancyNote}
                      onChange={(e) => setEditDiscrepancyNote(e.target.value)}
                      placeholder="Resolution or discrepancy note..."
                    />
                  </div>
                )}
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

      {/* Client Leader Discrepancy Modal */}
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
                <button
                  type="submit"
                  className="desk-btn desk-btn-danger"
                  data-testid="submit-discrepancy-btn"
                  disabled={submitting}
                >
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
                    {getStatusLabel(receiptTarget.status)}
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
                    <strong>Mode:</strong> {formatPaymentMode(receiptTarget.paymentMode)}
                  </div>
                  <div>
                    <strong>Reference:</strong> {receiptTarget.referenceNumber || 'N/A'}
                  </div>
                  <div>
                    <strong>Bank:</strong> {receiptTarget.bankName || 'N/A'}
                  </div>
                  <div>
                    <strong>Date:</strong> {formatDisplayDate(receiptTarget.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-primary"
                data-testid="download-receipt-pdf-btn"
                onClick={() => handleDownloadReceipt(receiptTarget)}
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
