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
    case 'STAFF_ONLY':
      return 'blue';
    case 'CLIENTS_ONLY':
      return 'gold';
    default:
      return 'neutral';
  }
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null,
  );

  // Create / Edit Announcement Modal
  const [announcementModalMode, setAnnouncementModalMode] = useState<'create' | 'edit' | null>(
    null,
  );
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [annTitle, setAnnTitle] = useState('');
  const [annBody, setAnnBody] = useState('');
  const [annAudience, setAnnAudience] = useState('ALL');
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
      if (!showWithdrawn && a.isWithdrawn) return false;
      if (q) {
        const hay = [a.title, a.body || '', a.publisherName, a.audience].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [announcements, searchQuery, showWithdrawn]);

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return policies.filter((p) => {
      if (!showWithdrawn && p.isWithdrawn) return false;
      if (q) {
        const hay = [p.title, p.content || '', p.publisherName].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [policies, searchQuery, showWithdrawn]);

  const metrics = useMemo(() => {
    const activeAnnouncements = announcements.filter((a) => !a.isWithdrawn).length;
    const activePolicies = policies.filter((p) => !p.isWithdrawn);
    const acknowledged = activePolicies.filter((p) => p.isAcknowledged).length;
    const pendingAck = activePolicies.length - acknowledged;
    return {
      activeAnnouncements,
      activePolicies: activePolicies.length,
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
    setAnnAudience(item.audience || 'ALL');
    const firstAttachment = Array.isArray(item.attachments) ? item.attachments[0] : item.attachments;
    setAnnAttachmentUrl(typeof firstAttachment === 'string' ? firstAttachment : firstAttachment?.url || '');
  };

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const attachments = annAttachmentUrl.trim()
        ? [{ label: 'Reference Attachment', url: annAttachmentUrl.trim() }]
        : undefined;
      const isEdit = announcementModalMode === 'edit' && editingAnnouncementId;
      const url = isEdit ? `/api/announcements/${editingAnnouncementId}` : '/api/announcements';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: resolveHeaders(authHeaders),
        body: JSON.stringify({
          title: annTitle.trim(),
          body: annBody.trim() || null,
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
    const firstAttachment = Array.isArray(item.attachments) ? item.attachments[0] : item.attachments;
    setPolAttachmentUrl(typeof firstAttachment === 'string' ? firstAttachment : firstAttachment?.url || '');
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polTitle.trim()) return;
    setSubmitting(true);
    setBanner(null);
    try {
      const attachments = polAttachmentUrl.trim()
        ? [{ label: 'Policy Document', url: polAttachmentUrl.trim() }]
        : undefined;
      const isEdit = policyModalMode === 'edit' && editingPolicyId;
      const url = isEdit ? `/api/policies/${editingPolicyId}` : '/api/policies';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: resolveHeaders(authHeaders),
        body: JSON.stringify({
          title: polTitle.trim(),
          content: polContent.trim() || null,
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
      await fetchAll();
    } catch (err: any) {
      setBanner({ type: 'error', text: err?.message || 'Acknowledgment failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderAttachments = (attachments: any) => {
    if (!attachments) return null;
    const list = Array.isArray(attachments) ? attachments : [attachments];
    const normalized = list
      .map((att: any) =>
        typeof att === 'string'
          ? { label: 'Attachment', url: att }
          : att?.url
            ? { label: att.label || 'Open Attachment', url: att.url }
            : null,
      )
      .filter(Boolean) as Array<{ label: string; url: string }>;

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
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">
            {activeSubTab === 'announcements' ? 'Studio Announcements' : 'Studio Policies & Handbook'}
          </h1>
          <p className="desk-page-subtitle">
            {activeSubTab === 'announcements'
              ? 'Official studio broadcasts, holiday schedules, and client-facing notices from A&F Design.'
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
              <span>Publish Announcement</span>
            </button>
          )}
          {isAdmin && activeSubTab === 'policies' && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={openCreatePolicy}
            >
              <Plus size={16} />
              <span>Add Studio Policy</span>
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

      {/* Metrics Strip */}
      <div className="desk-metrics-row">
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon gold">
            <Bell size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Active Announcements</div>
            <div className="desk-metric-tile-value">{metrics.activeAnnouncements}</div>
            <div className="desk-metric-tile-sub">Published studio notices</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon blue">
            <FileText size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Active Policies</div>
            <div className="desk-metric-tile-value">{metrics.activePolicies}</div>
            <div className="desk-metric-tile-sub">A&amp;F Design governance</div>
          </div>
        </div>
        <div className="desk-metric-tile">
          <div className="desk-metric-tile-icon green">
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="desk-metric-tile-label">Acknowledged Policies</div>
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
            <div className="desk-metric-tile-sub">Policies awaiting read confirmation</div>
          </div>
        </div>
      </div>

      {/* Section Tabs + Search */}
      <div className="desk-tabs-bar">
        <div className="desk-tabs-group">
          <button
            type="button"
            className={`desk-tab-btn ${activeSubTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('announcements')}
          >
            <Bell size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Announcements ({filteredAnnouncements.length})
          </button>
          <button
            type="button"
            className={`desk-tab-btn ${activeSubTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('policies')}
          >
            <FileText size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Studio Policies ({filteredPolicies.length})
          </button>
        </div>

        <div className="desk-header-actions">
          {isAdmin && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={showWithdrawn}
                onChange={(e) => setShowWithdrawn(e.target.checked)}
              />
              <span>Show withdrawn</span>
            </label>
          )}
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
              placeholder={
                activeSubTab === 'announcements'
                  ? 'Search announcements...'
                  : 'Search policies...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ANNOUNCEMENTS LIST */}
      {activeSubTab === 'announcements' && (
        <>
          {isLoading && filteredAnnouncements.length === 0 ? (
            <div className="desk-empty-card">Loading studio announcements...</div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="desk-empty-card">
              <Bell size={28} style={{ color: 'var(--brand-gold)', marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                No announcements yet
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                Studio updates, holidays, and team circulars from A&amp;F Design will appear here.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  className="desk-btn desk-btn-primary"
                  onClick={openCreateAnnouncement}
                >
                  <Plus size={15} />
                  <span>Publish Announcement</span>
                </button>
              )}
            </div>
          ) : (
            <div className="desk-list-stack">
              {filteredAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="desk-list-row-card"
                  style={{ opacity: item.isWithdrawn ? 0.65 : 1 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span className={`desk-pill ${getAudiencePillClass(item.audience)}`}>
                        <Users size={11} /> {item.audience.replace(/_/g, ' ')}
                      </span>
                      {item.isWithdrawn && <span className="desk-pill red">Withdrawn</span>}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {new Date(item.createdAt).toLocaleDateString()} · By {item.publisherName}
                      </span>
                    </div>
                    <h3 style={{ margin: '8px 0 4px', fontSize: 16, fontWeight: 700 }}>
                      {item.title}
                    </h3>
                    {item.body && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {item.body}
                      </p>
                    )}
                    {renderAttachments(item.attachments)}
                  </div>

                  {isAdmin && !item.isWithdrawn && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* POLICIES LIST */}
      {activeSubTab === 'policies' && (
        <>
          {isLoading && filteredPolicies.length === 0 ? (
            <div className="desk-empty-card">Loading studio policies...</div>
          ) : filteredPolicies.length === 0 ? (
            <div className="desk-empty-card">
              <FileText size={28} style={{ color: 'var(--brand-gold)', marginBottom: 8 }} />
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                No studio policies published yet
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
                Add studio drawing standards, site safety handbooks, or compliance policies.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  className="desk-btn desk-btn-primary"
                  onClick={openCreatePolicy}
                >
                  <Plus size={15} />
                  <span>Add Studio Policy</span>
                </button>
              )}
            </div>
          ) : (
            <div className="desk-list-stack">
              {filteredPolicies.map((pol) => (
                <div
                  key={pol.id}
                  className="desk-list-row-card"
                  style={{ opacity: pol.isWithdrawn ? 0.65 : 1 }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                      <span
                        className={`desk-pill ${
                          pol.isWithdrawn ? 'red' : pol.isAcknowledged ? 'green' : 'amber'
                        }`}
                      >
                        {pol.isWithdrawn
                          ? 'Withdrawn'
                          : pol.isAcknowledged
                            ? 'Acknowledged'
                            : 'Action Required'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Published {new Date(pol.createdAt).toLocaleDateString()} · By{' '}
                        {pol.publisherName}
                      </span>
                    </div>
                    <h3 style={{ margin: '8px 0 4px', fontSize: 16, fontWeight: 700 }}>
                      {pol.title}
                    </h3>
                    {pol.content && (
                      <p
                        style={{
                          margin: 0,
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {pol.content}
                      </p>
                    )}
                    {renderAttachments(pol.attachments)}
                  </div>

                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
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
                    {isAdmin && !pol.isWithdrawn && (
                      <>
                        <button
                          type="button"
                          className="desk-btn desk-btn-sm desk-btn-secondary"
                          onClick={() => openEditPolicy(pol)}
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
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
                        >
                          <EyeOff size={13} />
                          <span>Withdraw</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Announcement Create / Edit Modal */}
      {announcementModalMode && (
        <div className="desk-modal-overlay">
          <div className="desk-modal-dialog" style={{ maxWidth: 520 }}>
            <div className="desk-modal-header">
              <h3 className="desk-modal-title">
                {announcementModalMode === 'edit' ? 'Edit Announcement' : 'Publish Announcement'}
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
                    onChange={(e) => setAnnAudience(e.target.value)}
                  >
                    <option value="ALL">All Studio &amp; Client Accounts</option>
                    <option value="STAFF_ONLY">Studio Staff Only</option>
                    <option value="CLIENTS_ONLY">Clients Only</option>
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
                {policyModalMode === 'edit' ? 'Edit Studio Policy' : 'Publish Studio Policy'}
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
                <ShieldAlert size={20} style={{ color: 'var(--status-red)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
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
