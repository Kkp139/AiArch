import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell,
  FileText,
  Plus,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Users,
  EyeOff,
  Edit3,
  RefreshCw,
  Search,
  Calendar,
  Paperclip,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  X,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';

export interface AnnouncementItem {
  id: string;
  title: string;
  body?: string | null;
  audience: string;
  attachments?: any;
  isWithdrawn: boolean;
  publisherName: string;
  publisherRole: string;
  createdAt: string;
}

export interface StudioPolicyItem {
  id: string;
  title: string;
  content?: string | null;
  attachments?: any;
  isWithdrawn: boolean;
  publisherName: string;
  createdAt: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string | null;
}

export interface AnnouncementsPoliciesProps {
  userRole: UserRole;
  authHeaders: Record<string, string> | (() => Record<string, string>);
  initialSection?: 'announcements' | 'policies';
}

type AnnouncementAudienceValue = 'ALL' | 'STAFF' | 'CLIENT_LEADERS' | 'CLIENT_VIEWERS';

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'All Studio & Clients',
  STAFF: 'Studio Staff Only',
  CLIENT_LEADERS: 'Client Leaders',
  CLIENT_VIEWERS: 'Client Viewers',
  STAFF_ONLY: 'Studio Staff Only',
  CLIENTS_ONLY: 'Clients Only',
};

const PAGE_SIZE = 8;

function resolveHeaders(
  authHeaders: Record<string, string> | (() => Record<string, string>),
): Record<string, string> {
  const raw = typeof authHeaders === 'function' ? authHeaders() : authHeaders;
  return {
    'Content-Type': 'application/json',
    ...raw,
  };
}

function getAudiencePillClass(audience: string): string {
  switch (audience) {
    case 'STAFF':
    case 'STAFF_ONLY':
      return 'blue';
    case 'CLIENT_LEADERS':
    case 'CLIENT_VIEWERS':
    case 'CLIENTS_ONLY':
      return 'gold';
    default:
      return 'neutral';
  }
}

function getAudienceLabel(audience: string): string {
  return AUDIENCE_LABELS[audience] || audience.replace(/_/g, ' ');
}

function normalizeAttachments(attachments: any): Array<{ label: string; url: string }> {
  if (!attachments) return [];
  const list = Array.isArray(attachments) ? attachments : [attachments];
  return list
    .map((att: any) =>
      typeof att === 'string'
        ? { label: 'Attachment', url: att }
        : att?.url
          ? { label: att.label || 'Open Attachment', url: att.url }
          : null,
    )
    .filter(Boolean) as Array<{ label: string; url: string }>;
}

function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDisplayDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AnnouncementsPolicies({
  userRole,
  authHeaders,
  initialSection = 'announcements',
}: AnnouncementsPoliciesProps) {
  const isAdmin = userRole === 'ADMIN';

  const [activeSubTab, setActiveSubTab] = useState<'announcements' | 'policies'>(initialSection);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [policies, setPolicies] = useState<StudioPolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementStatusTab, setAnnouncementStatusTab] = useState<'ALL' | 'PUBLISHED' | 'WITHDRAWN'>('ALL');
  const [audienceFilter, setAudienceFilter] = useState<string>('ALL_AUDIENCES');
  const [policyStatusTab, setPolicyStatusTab] = useState<'ALL' | 'PENDING' | 'ACKNOWLEDGED' | 'WITHDRAWN'>('ALL');
  const [policyPage, setPolicyPage] = useState(1);

  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  // Detail View Modals
  const [viewingAnnouncement, setViewingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [viewingPolicy, setViewingPolicy] = useState<StudioPolicyItem | null>(null);

  // Create / Edit Announcement Modal
  const [announcementModalMode, setAnnouncementModalMode] = useState<'create' | 'edit' | null>(
    null,
  );
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState<AnnouncementAudienceValue>('ALL');
  const [annAttachmentUrl, setAnnAttachmentUrl] = useState('');

  // Create / Edit Policy Modal
  const [policyModalMode, setPolicyModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);
  const [polTitle, setPolTitle] = useState('');
  const [polContent, setPolContent] = useState('');
  const [polAttachmentUrl, setPolAttachmentUrl] = useState('');

  // Withdraw confirmation modal
  const [withdrawTarget, setWithdrawTarget] = useState<{
    kind: 'announcement' | 'policy';
    id: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    setActiveSubTab(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setPolicyPage(1);
  }, [searchQuery, policyStatusTab]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = resolveHeaders(authHeaders);
      const [annRes, polRes] = await Promise.all([
        fetch('/api/announcements', { headers }),
        fetch('/api/policies', { headers }),
      ]);

      if (annRes.ok) {
        const data = await annRes.json();
        const rows = Array.isArray(data) ? data : data.announcements || data.items || [];
        setAnnouncements(rows);
      }

      if (polRes.ok) {
        const data = await polRes.json();
        const rows = Array.isArray(data) ? data : data.policies || data.items || [];
        setPolicies(rows);
      }
    } catch (err: any) {
      setBanner({
        type: 'error',
        text: err?.message || 'Unable to fetch studio announcements and policies.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return announcements.filter((a) => {
      if (!isAdmin && a.isWithdrawn) return false;
      if (announcementStatusTab === 'PUBLISHED' && a.isWithdrawn) return false;
      if (announcementStatusTab === 'WITHDRAWN' && !a.isWithdrawn) return false;
      if (audienceFilter !== 'ALL_AUDIENCES' && a.audience !== audienceFilter) return false;
      if (q) {
        const hay = [a.title, a.body || '', a.publisherName, getAudienceLabel(a.audience)]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [announcements, searchQuery, announcementStatusTab, audienceFilter, isAdmin]);

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return policies.filter((p) => {
      if (!isAdmin && p.isWithdrawn) return false;
      if (policyStatusTab === 'PENDING' && (p.isWithdrawn || p.isAcknowledged)) return false;
      if (policyStatusTab === 'ACKNOWLEDGED' && (p.isWithdrawn || !p.isAcknowledged)) return false;
      if (policyStatusTab === 'WITHDRAWN' && !p.isWithdrawn) return false;
      if (q) {
        const hay = [p.title, p.content || '', p.publisherName].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [policies, searchQuery, policyStatusTab, isAdmin]);

  const policyTotalPages = Math.max(1, Math.ceil(filteredPolicies.length / PAGE_SIZE));
  const safePolicyPage = Math.min(policyPage, policyTotalPages);
  const paginatedPolicies = useMemo(() => {
    const start = (safePolicyPage - 1) * PAGE_SIZE;
    return filteredPolicies.slice(start, start + PAGE_SIZE);
  }, [filteredPolicies, safePolicyPage]);

  const metrics = useMemo(() => {
    const activeAnnouncements = announcements.filter((a) => !a.isWithdrawn).length;
    const activePolicies = policies.filter((p) => !p.isWithdrawn);
    const withdrawnPolicies = policies.filter((p) => p.isWithdrawn).length;
    const acknowledged = activePolicies.filter((p) => p.isAcknowledged).length;
    const pendingAck = activePolicies.length - acknowledged;
    return {
      totalAnnouncements: announcements.length,
      activeAnnouncements,
      withdrawnAnnouncements: announcements.length - activeAnnouncements,
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      withdrawnPolicies,
      acknowledged,
      pendingAck,
    };
  }, [announcements, policies]);

  const openCreateAnnouncement = () => {
    setAnnouncementModalMode('create');
    setEditingAnnouncementId(null);
    setAnnTitle('');
    setAnnBody('');
    setAnnAudience('ALL');
    setAnnAttachmentUrl('');
  };

  const openEditAnnouncement = (item: AnnouncementItem) => {
    setAnnouncementModalMode('edit');
    setEditingAnnouncementId(item.id);
    setAnnTitle(item.title);
    setAnnBody(item.body || '');
    const validAudience = (['ALL', 'STAFF', 'CLIENT_LEADERS', 'CLIENT_VIEWERS'].includes(item.audience)
      ? item.audience
      : 'ALL') as AnnouncementAudienceValue;
    setAnnAudience(validAudience);
    const firstAttachment = normalizeAttachments(item.attachments)[0];
    setAnnAttachmentUrl(firstAttachment?.url || '');
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const attachments = annAttachmentUrl.trim()
        ? [{ label: 'Reference Attachment', url: annAttachmentUrl.trim() }]
        : [];
      const isEdit = announcementModalMode === 'edit' && editingAnnouncementId;
      const url = isEdit ? `/api/announcements/${editingAnnouncementId}` : '/api/announcements';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: resolveHeaders(authHeaders),
        body: JSON.stringify({
          title: annTitle.trim(),
          body: annBody.trim() || (isEdit ? null : undefined),
          audience: annAudience,
          attachments,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save announcement');
      }
      setAnnouncementModalMode(null);
      setBanner({
        type: 'success',
        text: isEdit ? 'Announcement updated.' : 'Studio announcement published.',
      });
      await fetchAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to publish announcement.' });
    } finally {
      setSubmitting(false);
    }
  };

  const openCreatePolicy = () => {
    setPolicyModalMode('create');
    setEditingPolicyId(null);
    setPolTitle('');
    setPolContent('');
    setPolAttachmentUrl('');
  };

  const openEditPolicy = (item: StudioPolicyItem) => {
    setPolicyModalMode('edit');
    setEditingPolicyId(item.id);
    setPolTitle(item.title);
    setPolContent(item.content || '');
    const firstAttachment = normalizeAttachments(item.attachments)[0];
    setPolAttachmentUrl(firstAttachment?.url || '');
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polTitle.trim()) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const attachments = polAttachmentUrl.trim()
        ? [{ label: 'Policy Document', url: polAttachmentUrl.trim() }]
        : [];
      const isEdit = policyModalMode === 'edit' && editingPolicyId;
      const url = isEdit ? `/api/policies/${editingPolicyId}` : '/api/policies';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: resolveHeaders(authHeaders),
        body: JSON.stringify({
          title: polTitle.trim(),
          content: polContent.trim() || (isEdit ? null : undefined),
          attachments,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save policy');
      }
      setPolicyModalMode(null);
      setBanner({
        type: 'success',
        text: isEdit ? 'Studio policy updated.' : 'Studio policy published.',
      });
      await fetchAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Unable to publish policy.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawTarget) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const endpoint =
        withdrawTarget.kind === 'announcement'
          ? `/api/announcements/${withdrawTarget.id}/withdraw`
          : `/api/policies/${withdrawTarget.id}/withdraw`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: resolveHeaders(authHeaders),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to withdraw item');
      }
      setWithdrawTarget(null);
      setBanner({
        type: 'info',
        text: `Withdrew "${withdrawTarget.title}".`,
      });
      await fetchAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Withdrawal failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledgePolicy = async (policy: StudioPolicyItem) => {
    setSubmitting(true);
    setBanner(null);
    try {
      const res = await fetch(`/api/policies/${policy.id}/acknowledge`, {
        method: 'POST',
        headers: resolveHeaders(authHeaders),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to acknowledge policy');
      }
      setBanner({
        type: 'success',
        text: `Acknowledged "${policy.title}".`,
      });
      if (viewingPolicy?.id === policy.id) {
        setViewingPolicy({ ...policy, isAcknowledged: true, acknowledgedAt: new Date().toISOString() });
      }
      await fetchAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Acknowledgment failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderAttachments = (attachments: any) => {
    const normalized = normalizeAttachments(attachments);
    if (normalized.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
        {normalized.map((att, idx) => (
          <a
            key={`${att.url}-${idx}`}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="desk-btn desk-btn-sm desk-btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <ExternalLink size={13} />
            <span>{att.label}</span>
          </a>
        ))}
      </div>
    );
  };

  return (
    <div>
      {/* Page Header */}
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">
            {activeSubTab === 'announcements' ? 'Announcements' : 'Policies'}
          </h1>
          <p className="desk-page-subtitle">
            {activeSubTab === 'announcements'
              ? 'Studio updates, project notices and everything your team needs to know.'
              : 'Governing architectural QA guidelines, office protocols, and mandatory policy acknowledgments.'}
          </p>
        </div>
        <div className="desk-header-actions">
          <button
            type="button"
            className="desk-btn desk-btn-secondary"
            onClick={() => void fetchAll()}
            disabled={isLoading}
          >
            <RefreshCw size={15} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          {isAdmin && activeSubTab === 'announcements' && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={openCreateAnnouncement}
            >
              <Plus size={16} />
              <span>Create announcement</span>
            </button>
          )}
          {isAdmin && activeSubTab === 'policies' && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={openCreatePolicy}
            >
              <Plus size={16} />
              <span>Add Policy</span>
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

      {/* Policies Summary Cards (matching Figma 934:50068) */}
      {activeSubTab === 'policies' && (
        <div className="desk-metrics-row">
          <div className="desk-metric-tile">
            <div className="desk-metric-tile-icon gold">
              <FileText size={18} />
            </div>
            <div>
              <div className="desk-metric-tile-label">Total Policies</div>
              <div className="desk-metric-tile-value">{metrics.totalPolicies}</div>
              <div className="desk-metric-tile-sub">Studio governance documents</div>
            </div>
          </div>
          <div className="desk-metric-tile">
            <div className="desk-metric-tile-icon blue">
              <Bell size={18} />
            </div>
            <div>
              <div className="desk-metric-tile-label">Published</div>
              <div className="desk-metric-tile-value">{metrics.activePolicies}</div>
              <div className="desk-metric-tile-sub">Active studio policies</div>
            </div>
          </div>
          <div className="desk-metric-tile">
            <div className="desk-metric-tile-icon green">
              <CheckCircle size={18} />
            </div>
            <div>
              <div className="desk-metric-tile-label">Acknowledged</div>
              <div className="desk-metric-tile-value">{metrics.acknowledged}</div>
              <div className="desk-metric-tile-sub">Confirmed by your account</div>
            </div>
          </div>
          <div className="desk-metric-tile">
            <div className="desk-metric-tile-icon amber">
              <AlertCircle size={18} />
            </div>
            <div>
              <div className="desk-metric-tile-label">Pending Acknowledgment</div>
              <div className="desk-metric-tile-value">{metrics.pendingAck}</div>
              <div className="desk-metric-tile-sub">
                {isAdmin && metrics.withdrawnPolicies > 0
                  ? `${metrics.withdrawnPolicies} withdrawn`
                  : 'Awaiting read confirmation'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs + Filters Bar */}
      <div className="desk-tabs-bar" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="desk-tabs-group" style={{ flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`desk-tab-btn ${activeSubTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('announcements')}
          >
            <Bell size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Announcements ({metrics.activeAnnouncements})
          </button>
          <button
            type="button"
            className={`desk-tab-btn ${activeSubTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('policies')}
          >
            <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Studio Policies ({metrics.activePolicies})
          </button>

          {activeSubTab === 'announcements' && (
            <div className="desk-pill-tabs" style={{ marginLeft: 12 }}>
              <button
                type="button"
                className={`desk-pill-tab ${announcementStatusTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setAnnouncementStatusTab('ALL')}
              >
                All notices
              </button>
              <button
                type="button"
                className={`desk-pill-tab ${announcementStatusTab === 'PUBLISHED' ? 'active' : ''}`}
                onClick={() => setAnnouncementStatusTab('PUBLISHED')}
              >
                Published
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className={`desk-pill-tab ${announcementStatusTab === 'WITHDRAWN' ? 'active' : ''}`}
                  onClick={() => setAnnouncementStatusTab('WITHDRAWN')}
                >
                  Withdrawn ({metrics.withdrawnAnnouncements})
                </button>
              )}
            </div>
          )}

          {activeSubTab === 'policies' && (
            <div className="desk-pill-tabs" style={{ marginLeft: 12 }}>
              <button
                type="button"
                className={`desk-pill-tab ${policyStatusTab === 'ALL' ? 'active' : ''}`}
                onClick={() => setPolicyStatusTab('ALL')}
              >
                All
              </button>
              <button
                type="button"
                className={`desk-pill-tab ${policyStatusTab === 'PENDING' ? 'active' : ''}`}
                onClick={() => setPolicyStatusTab('PENDING')}
              >
                Pending ({metrics.pendingAck})
              </button>
              <button
                type="button"
                className={`desk-pill-tab ${policyStatusTab === 'ACKNOWLEDGED' ? 'active' : ''}`}
                onClick={() => setPolicyStatusTab('ACKNOWLEDGED')}
              >
                Acknowledged ({metrics.acknowledged})
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className={`desk-pill-tab ${policyStatusTab === 'WITHDRAWN' ? 'active' : ''}`}
                  onClick={() => setPolicyStatusTab('WITHDRAWN')}
                >
                  Withdrawn ({metrics.withdrawnPolicies})
                </button>
              )}
            </div>
          )}
        </div>

        <div className="desk-header-actions">
          {activeSubTab === 'announcements' && (
            <select
              aria-label="Filter by audience"
              className="desk-form-select"
              style={{ width: 185 }}
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
            >
              <option value="ALL_AUDIENCES">All Audiences</option>
              <option value="ALL">All Studio &amp; Clients</option>
              <option value="STAFF">Studio Staff Only</option>
              <option value="CLIENT_LEADERS">Client Leaders</option>
              <option value="CLIENT_VIEWERS">Client Viewers</option>
            </select>
          )}
          <div style={{ position: 'relative' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--desk-text-muted)',
              }}
            />
            <input
              type="text"
              className="desk-inline-search"
              style={{ paddingLeft: 32 }}
              placeholder={
                activeSubTab === 'announcements'
                  ? 'Search announcements...'
                  : 'Search Policies...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ANNOUNCEMENTS LIST (Figma 867:12243) */}
      {activeSubTab === 'announcements' && (
        <>
          {isLoading && filteredAnnouncements.length === 0 ? (
            <div className="desk-empty-card">Loading studio announcements...</div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="desk-empty-card">
              <Bell size={28} style={{ color: 'var(--desk-gold)', marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                No announcements found
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--desk-text-secondary)' }}>
                Studio updates, holidays, and team circulars from A&amp;F Design will appear here.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  className="desk-btn desk-btn-primary"
                  onClick={openCreateAnnouncement}
                >
                  <Plus size={15} />
                  <span>Create announcement</span>
                </button>
              )}
            </div>
          ) : (
            <div className="desk-list-stack">
              {filteredAnnouncements.map((item) => {
                const attachments = normalizeAttachments(item.attachments);
                return (
                  <div
                    key={item.id}
                    className="desk-list-row-card"
                    style={{
                      opacity: item.isWithdrawn ? 0.65 : 1,
                      padding: 24,
                      alignItems: 'flex-start',
                      gap: 14,
                    }}
                  >
                    <div
                      className="desk-soft-icon-box"
                      style={{ width: 48, height: 48, borderRadius: 8, flexShrink: 0 }}
                    >
                      <Bell size={22} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <h3
                            style={{
                              margin: '0 0 6px',
                              fontSize: 18,
                              fontWeight: 600,
                              color: 'var(--desk-text-primary)',
                            }}
                          >
                            {item.title}
                          </h3>
                          {item.body && (
                            <p
                              style={{
                                margin: 0,
                                fontSize: 14,
                                lineHeight: 1.5,
                                color: 'var(--desk-text-secondary)',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {item.body}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                          <span className={`desk-pill ${getAudiencePillClass(item.audience)}`}>
                            <Users size={11} /> {getAudienceLabel(item.audience)}
                          </span>
                          <span className={`desk-pill ${item.isWithdrawn ? 'red' : 'green'}`}>
                            {item.isWithdrawn ? 'Withdrawn' : 'Published'}
                          </span>
                        </div>
                      </div>

                      {attachments.length > 0 && renderAttachments(item.attachments)}

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                          marginTop: 14,
                          paddingTop: 12,
                          borderTop: '1px solid var(--desk-border-subtle)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: 16,
                            fontSize: 12,
                            color: 'var(--desk-text-muted)',
                          }}
                        >
                          <span>
                            Posted by {item.publisherName} · {getAudienceLabel(item.audience)}
                          </span>
                          <span>{formatDisplayDateTime(item.createdAt)}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button
                            type="button"
                            className="desk-btn desk-btn-sm desk-btn-secondary"
                            onClick={() => setViewingAnnouncement(item)}
                          >
                            <span>View notice</span>
                            <ArrowRight size={13} />
                          </button>
                          {isAdmin && !item.isWithdrawn && (
                            <>
                              <button
                                type="button"
                                className="desk-btn desk-btn-sm desk-btn-secondary"
                                onClick={() => openEditAnnouncement(item)}
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="desk-btn desk-btn-sm desk-btn-danger-outline"
                                onClick={() =>
                                  setWithdrawTarget({
                                    kind: 'announcement',
                                    id: item.id,
                                    title: item.title,
                                  })
                                }
                              >
                                <EyeOff size={13} />
                                <span>Withdraw</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* POLICIES TABLE (Figma 934:50043) */}
      {activeSubTab === 'policies' && (
        <>
          {isLoading && filteredPolicies.length === 0 ? (
            <div className="desk-empty-card">Loading studio policies...</div>
          ) : filteredPolicies.length === 0 ? (
            <div className="desk-empty-card">
              <FileText size={28} style={{ color: 'var(--desk-gold)', marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                No studio policies found
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--desk-text-secondary)' }}>
                Add studio drawing standards, site safety handbooks, or compliance policies.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  className="desk-btn desk-btn-primary"
                  onClick={openCreatePolicy}
                >
                  <Plus size={15} />
                  <span>Add Policy</span>
                </button>
              )}
            </div>
          ) : (
            <div className="desk-table-card">
              <div className="desk-table-scroll">
                <table className="desk-data-table">
                  <thead>
                    <tr>
                      <th>Policy</th>
                      <th>Audience</th>
                      <th>Published Date</th>
                      <th>Attachments</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPolicies.map((pol) => {
                      const attachments = normalizeAttachments(pol.attachments);
                      return (
                        <tr key={pol.id} style={{ opacity: pol.isWithdrawn ? 0.65 : 1 }}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div
                                className="desk-soft-icon-box"
                                style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }}
                              >
                                <FileText size={18} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 14.5,
                                    color: 'var(--desk-text-primary)',
                                  }}
                                >
                                  {pol.title}
                                </div>
                                {pol.content && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: 'var(--desk-text-secondary)',
                                      maxWidth: 460,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {pol.content}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="desk-pill gold">All</span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 13.5,
                                fontWeight: 500,
                              }}
                            >
                              <Calendar size={15} style={{ color: 'var(--desk-text-muted)' }} />
                              <span>{formatDisplayDate(pol.createdAt)}</span>
                            </div>
                          </td>
                          <td>
                            {attachments.length > 0 ? (
                              <a
                                href={attachments[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 13.5,
                                  fontWeight: 500,
                                  color: 'var(--desk-gold-dark)',
                                  textDecoration: 'none',
                                }}
                              >
                                <Paperclip size={14} />
                                <span>
                                  {attachments.length}{' '}
                                  {attachments.length === 1 ? 'File' : 'Files'}
                                </span>
                              </a>
                            ) : (
                              <span style={{ fontSize: 13, color: 'var(--desk-text-muted)' }}>
                                None
                              </span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                              <span className={`desk-pill ${pol.isWithdrawn ? 'red' : 'green'}`}>
                                {pol.isWithdrawn ? 'Withdrawn' : 'Published'}
                              </span>
                              {!pol.isWithdrawn && (
                                <span
                                  className={`desk-pill ${pol.isAcknowledged ? 'green' : 'amber'}`}
                                >
                                  {pol.isAcknowledged ? 'Acknowledged' : 'Action Required'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                gap: 6,
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                              }}
                            >
                              {!pol.isWithdrawn && !pol.isAcknowledged && (
                                <button
                                  type="button"
                                  className="desk-btn desk-btn-sm desk-btn-primary"
                                  disabled={submitting}
                                  onClick={() => void handleAcknowledgePolicy(pol)}
                                >
                                  <CheckCircle size={13} />
                                  <span>Acknowledge</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="desk-btn desk-btn-sm desk-btn-secondary"
                                onClick={() => setViewingPolicy(pol)}
                              >
                                View
                              </button>
                              {isAdmin && !pol.isWithdrawn && (
                                <>
                                  <button
                                    type="button"
                                    className="desk-btn desk-btn-sm desk-btn-secondary"
                                    onClick={() => openEditPolicy(pol)}
                                    aria-label="Edit policy"
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="desk-btn desk-btn-sm desk-btn-danger-outline"
                                    onClick={() =>
                                      setWithdrawTarget({
                                        kind: 'policy',
                                        id: pol.id,
                                        title: pol.title,
                                      })
                                    }
                                    aria-label="Withdraw policy"
                                  >
                                    <EyeOff size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div
                className="desk-table-pagination"
                style={{ justifyContent: 'space-between', padding: '14px 24px' }}
              >
                <span style={{ fontSize: 13, color: 'var(--desk-text-secondary)' }}>
                  Showing {(safePolicyPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(safePolicyPage * PAGE_SIZE, filteredPolicies.length)} of{' '}
                  {filteredPolicies.length} policies
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-secondary"
                    disabled={safePolicyPage <= 1}
                    onClick={() => setPolicyPage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'var(--desk-gold-soft)',
                      border: '1px solid var(--desk-gold)',
                      color: 'var(--desk-gold-dark)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {safePolicyPage}
                  </span>
                  <button
                    type="button"
                    className="desk-btn desk-btn-sm desk-btn-secondary"
                    disabled={safePolicyPage >= policyTotalPages}
                    onClick={() => setPolicyPage((p) => Math.min(policyTotalPages, p + 1))}
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* View Announcement Detail Modal */}
      {viewingAnnouncement && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 540 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">{viewingAnnouncement.title}</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setViewingAnnouncement(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="desk-modal-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <span className={`desk-pill ${getAudiencePillClass(viewingAnnouncement.audience)}`}>
                  <Users size={11} /> {getAudienceLabel(viewingAnnouncement.audience)}
                </span>
                <span className={`desk-pill ${viewingAnnouncement.isWithdrawn ? 'red' : 'green'}`}>
                  {viewingAnnouncement.isWithdrawn ? 'Withdrawn' : 'Published'}
                </span>
              </div>
              <p
                style={{
                  margin: '0 0 12px',
                  fontSize: 12,
                  color: 'var(--desk-text-muted)',
                }}
              >
                Posted by {viewingAnnouncement.publisherName} ·{' '}
                {formatDisplayDateTime(viewingAnnouncement.createdAt)}
              </p>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--desk-text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewingAnnouncement.body || 'No additional details provided.'}
              </div>
              {renderAttachments(viewingAnnouncement.attachments)}
            </div>
            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setViewingAnnouncement(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Policy Detail Modal */}
      {viewingPolicy && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 560 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">{viewingPolicy.title}</h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setViewingPolicy(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="desk-modal-body">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <span className={`desk-pill ${viewingPolicy.isWithdrawn ? 'red' : 'green'}`}>
                  {viewingPolicy.isWithdrawn ? 'Withdrawn' : 'Published'}
                </span>
                {!viewingPolicy.isWithdrawn && (
                  <span className={`desk-pill ${viewingPolicy.isAcknowledged ? 'green' : 'amber'}`}>
                    {viewingPolicy.isAcknowledged ? 'Acknowledged' : 'Action Required'}
                  </span>
                )}
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--desk-text-muted)' }}>
                Published {formatDisplayDate(viewingPolicy.createdAt)} · By{' '}
                {viewingPolicy.publisherName}
              </p>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--desk-text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewingPolicy.content || 'No policy content provided.'}
              </div>
              {renderAttachments(viewingPolicy.attachments)}
            </div>
            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setViewingPolicy(null)}
              >
                Close
              </button>
              {!viewingPolicy.isWithdrawn && !viewingPolicy.isAcknowledged && (
                <button
                  type="button"
                  className="desk-btn desk-btn-primary"
                  disabled={submitting}
                  onClick={() => void handleAcknowledgePolicy(viewingPolicy)}
                >
                  <CheckCircle size={14} />
                  <span>{submitting ? 'Acknowledging...' : 'Acknowledge Policy'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Announcement Create / Edit Modal */}
      {announcementModalMode && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 520 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">
                {announcementModalMode === 'edit' ? 'Edit Announcement' : 'Create Announcement'}
              </h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setAnnouncementModalMode(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveAnnouncement}>
              <div className="desk-modal-body">
                <div className="desk-form-group">
                  <label>Headline</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    placeholder="e.g. Updated CAD Submission Cutoff for Weekly Reviews"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="desk-form-group">
                  <label>Target Audience</label>
                  <select
                    className="desk-form-select"
                    value={annAudience}
                    onChange={(e) => setAnnAudience(e.target.value as AnnouncementAudienceValue)}
                  >
                    <option value="ALL">All Studio &amp; Clients</option>
                    <option value="STAFF">Studio Staff Only</option>
                    <option value="CLIENT_LEADERS">Client Leaders</option>
                    <option value="CLIENT_VIEWERS">Client Viewers</option>
                  </select>
                </div>
                <div className="desk-form-group">
                  <label>Announcement Details</label>
                  <textarea
                    className="desk-form-textarea"
                    rows={4}
                    placeholder="Write the full circular or notice..."
                    value={annBody}
                    onChange={(e) => setAnnBody(e.target.value)}
                  />
                </div>
                <div className="desk-form-group">
                  <label>Attachment Link (Optional)</label>
                  <input
                    type="url"
                    className="desk-form-input"
                    placeholder="https://..."
                    value={annAttachmentUrl}
                    onChange={(e) => setAnnAttachmentUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setAnnouncementModalMode(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : announcementModalMode === 'edit'
                      ? 'Save Changes'
                      : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Policy Create / Edit Modal */}
      {policyModalMode && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 520 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">
                {policyModalMode === 'edit' ? 'Edit Studio Policy' : 'Add Studio Policy'}
              </h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setPolicyModalMode(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSavePolicy}>
              <div className="desk-modal-body">
                <div className="desk-form-group">
                  <label>Policy Title</label>
                  <input
                    type="text"
                    className="desk-form-input"
                    placeholder="e.g. BIM Naming Standards & Drawing QA Policy"
                    value={polTitle}
                    onChange={(e) => setPolTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="desk-form-group">
                  <label>Policy Content</label>
                  <textarea
                    className="desk-form-textarea"
                    rows={5}
                    placeholder="State official rules, workflows, and compliance expectations..."
                    value={polContent}
                    onChange={(e) => setPolContent(e.target.value)}
                    required
                  />
                </div>
                <div className="desk-form-group">
                  <label>Policy Document URL (Optional)</label>
                  <input
                    type="url"
                    className="desk-form-input"
                    placeholder="https://..."
                    value={polAttachmentUrl}
                    onChange={(e) => setPolAttachmentUrl(e.target.value)}
                  />
                </div>
              </div>
              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setPolicyModalMode(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="desk-btn desk-btn-primary" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : policyModalMode === 'edit'
                      ? 'Save Changes'
                      : 'Publish Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation Modal */}
      {withdrawTarget && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 420 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">
                Withdraw {withdrawTarget.kind === 'announcement' ? 'Announcement' : 'Policy'}
              </h3>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setWithdrawTarget(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="desk-modal-body">
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <ShieldAlert size={20} style={{ color: 'var(--desk-danger)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--desk-text-secondary)' }}>
                  Withdraw <strong>{withdrawTarget.title}</strong>? Non-admin accounts will no
                  longer see it as active.
                </p>
              </div>
            </div>
            <div className="desk-modal-footer">
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => setWithdrawTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="desk-btn desk-btn-danger"
                disabled={submitting}
                onClick={() => void handleConfirmWithdraw()}
              >
                {submitting ? 'Withdrawing...' : 'Confirm Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
