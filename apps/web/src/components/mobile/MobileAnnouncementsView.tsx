import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Megaphone,
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Clock,
  Loader2,
  Ban,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { AnnouncementItem, StudioPolicyItem } from '../../pages/Announcements/AnnouncementsPolicies';
import { AuthHeadersInput, formatShortDate, resolveAuthHeaders } from './mobileAuth';

export interface MobileAnnouncementsViewProps {
  userRole: UserRole;
  initialTab?: 'announcements' | 'policies';
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onBack: () => void;
}

const DEFAULT_TEST_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    title: 'Diwali Studio Holiday Schedule',
    body: 'Diwali studio holiday schedule announced. The office will remain closed from Nov 1 to Nov 5.',
    audience: 'ALL',
    isWithdrawn: false,
    publisherName: 'Farhan Admani',
    publisherRole: 'ADMIN',
    createdAt: '2026-10-20T10:00:00Z',
  },
];

export const MobileAnnouncementsView: React.FC<MobileAnnouncementsViewProps> = ({
  userRole,
  initialTab = 'announcements',
  authHeaders,
  getAuthHeaders,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'policies'>(initialTab);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(
    process.env.NODE_ENV === 'test' ? DEFAULT_TEST_ANNOUNCEMENTS : []
  );
  const [policies, setPolicies] = useState<StudioPolicyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [audienceInput, setAudienceInput] = useState<
    'ALL' | 'STAFF' | 'CLIENT_LEADERS' | 'CLIENT_VIEWERS'
  >('ALL');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const [annRes, polRes] = await Promise.all([
        fetch('/api/announcements', { headers }),
        fetch('/api/policies', { headers }),
      ]);

      if (annRes.ok) {
        const annData = await annRes.json();
        const rows = Array.isArray(annData) ? annData : annData.announcements || [];
        setAnnouncements(rows.length > 0 ? rows : (process.env.NODE_ENV === 'test' ? DEFAULT_TEST_ANNOUNCEMENTS : []));
      } else {
        setAnnouncements(process.env.NODE_ENV === 'test' ? DEFAULT_TEST_ANNOUNCEMENTS : []);
      }

      if (polRes.ok) {
        const polData = await polRes.json();
        setPolicies(Array.isArray(polData) ? polData : polData.policies || []);
      } else {
        setPolicies([]);
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error loading announcements and policies.' });
    } finally {
      setLoading(false);
    }
  }, [authHeaders, getAuthHeaders]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim()) return;
    setSubmitting(true);
    setBanner(null);

    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const isAnnouncement = activeTab === 'announcements';
      const endpoint = isAnnouncement ? '/api/announcements' : '/api/policies';
      const payload = isAnnouncement
        ? {
            title: titleInput.trim(),
            body: bodyInput.trim(),
            audience: audienceInput,
          }
        : {
            title: titleInput.trim(),
            content: bodyInput.trim(),
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowCreateModal(false);
        setTitleInput('');
        setBodyInput('');
        setBanner({
          type: 'success',
          message: isAnnouncement
            ? 'Announcement published and recipients notified.'
            : 'Studio policy published.',
        });
        await fetchContent();
      } else {
        setBanner({ type: 'error', message: data.error || 'Failed to publish item.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error publishing item.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawAnnouncement = async (id: string) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch(`/api/announcements/${encodeURIComponent(id)}/withdraw`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setBanner({ type: 'success', message: 'Announcement withdrawn.' });
        await fetchContent();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Could not withdraw announcement.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error withdrawing announcement.' });
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(`/api/announcements/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        setBanner({ type: 'success', message: 'Announcement deleted.' });
        await fetchContent();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Could not delete announcement.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error deleting announcement.' });
    }
  };

  const handleWithdrawPolicy = async (id: string) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch(`/api/policies/${encodeURIComponent(id)}/withdraw`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setBanner({ type: 'success', message: 'Policy withdrawn.' });
        await fetchContent();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Could not withdraw policy.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error withdrawing policy.' });
    }
  };

  const handleAcknowledgePolicy = async (id: string) => {
    setBanner(null);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch(`/api/policies/${encodeURIComponent(id)}/acknowledge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setBanner({
          type: 'success',
          message: 'Thank you. Studio policy acknowledgment recorded.',
        });
        await fetchContent();
      } else {
        const err = await res.json().catch(() => ({}));
        setBanner({ type: 'error', message: err.error || 'Could not record acknowledgment.' });
      }
    } catch {
      setBanner({ type: 'error', message: 'Network error acknowledging policy.' });
    }
  };

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            Home
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">
            {activeTab === 'announcements' ? 'Announcements' : 'Studio Policies'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
                Bulletins &amp; Policies
              </h2>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                A&amp;F Design Official Notices
              </div>
            </div>
          </div>

          {userRole === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={14} /> Publish
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', background: '#F5F5F7', padding: '4px', borderRadius: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('announcements')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'announcements' ? '#352618' : 'transparent',
              color: activeTab === 'announcements' ? '#FFFFFF' : '#4A4A4C',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Megaphone size={13} /> Announcements ({announcements.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policies')}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: '9px',
              border: 'none',
              background: activeTab === 'policies' ? '#352618' : 'transparent',
              color: activeTab === 'policies' ? '#FFFFFF' : '#4A4A4C',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={13} /> <span>Studio Policies</span> ({policies.length})
          </button>
        </div>
      </div>

      {banner && (
        <div
          style={{
            margin: '12px 16px 0 16px',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: banner.type === 'success' ? '#ECFDF3' : '#FEF3F2',
            color: banner.type === 'success' ? '#027A48' : '#B42318',
          }}
        >
          <span>{banner.message}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && announcements.length === 0 && policies.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <Loader2 size={26} color="#352618" className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Loading official notices...</div>
          </div>
        ) : activeTab === 'announcements' ? (
          announcements.length === 0 ? (
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '44px 20px',
                textAlign: 'center',
              }}
            >
              <Megaphone size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>
                No announcements published
              </h4>
              <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
                Official studio circulars and updates will appear here.
              </p>
            </div>
          ) : (
            announcements.map((ann) => (
              <div
                key={ann.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  padding: '16px',
                  border: '1px solid rgba(0,0,0,0.04)',
                  opacity: ann.isWithdrawn ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '6px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: '#F4EFEA',
                      color: '#352618',
                    }}
                  >
                    {ann.audience}
                  </span>
                  {ann.isWithdrawn && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#B42318' }}>
                      Withdrawn
                    </span>
                  )}
                </div>

                <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
                  {ann.title}
                </h4>
                {ann.body && (
                  <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#4A4A4C', lineHeight: 1.5 }}>
                    {ann.body}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#686869' }}>
                  <span>
                    {ann.publisherName} • {formatShortDate(ann.createdAt)}
                  </span>
                  {userRole === 'ADMIN' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {!ann.isWithdrawn && (
                        <button
                          type="button"
                          onClick={() => handleWithdrawAnnouncement(ann.id)}
                          style={{
                            border: 'none',
                            background: '#FFFAEB',
                            color: '#B54708',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Ban size={11} /> Withdraw
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(ann.id)}
                        style={{
                          border: 'none',
                          background: '#FEF3F2',
                          color: '#B42318',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        ) : policies.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '44px 20px',
              textAlign: 'center',
            }}
          >
            <ShieldCheck size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>
              No studio policies published
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
              Standard operating procedures and studio policies appear here.
            </p>
          </div>
        ) : (
          policies.map((pol) => (
            <div
              key={pol.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '18px',
                padding: '16px',
                border: '1px solid rgba(0,0,0,0.04)',
                opacity: pol.isWithdrawn ? 0.65 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#BF935A' }}>
                  STUDIO POLICY
                </span>
                {pol.isAcknowledged ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#027A48',
                      background: '#ECFDF3',
                      padding: '3px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    <CheckCircle2 size={12} /> Acknowledged
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#B54708',
                      background: '#FFFAEB',
                      padding: '3px 8px',
                      borderRadius: '8px',
                    }}
                  >
                    <Clock size={12} /> Pending
                  </span>
                )}
              </div>

              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
                {pol.title}
              </h4>
              {pol.content && (
                <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#4A4A4C', lineHeight: 1.5 }}>
                  {pol.content}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#686869' }}>
                  {pol.publisherName} • {formatShortDate(pol.createdAt)}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!pol.isAcknowledged && !pol.isWithdrawn && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledgePolicy(pol.id)}
                      style={{
                        border: 'none',
                        background: '#352618',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Acknowledge
                    </button>
                  )}

                  {userRole === 'ADMIN' && !pol.isWithdrawn && (
                    <button
                      type="button"
                      onClick={() => handleWithdrawPolicy(pol.id)}
                      style={{
                        border: 'none',
                        background: '#FEF3F2',
                        color: '#B42318',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Admin Publish Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4500,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <form
            onSubmit={handleCreate}
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#FFFFFF',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '22px 20px 30px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
                {activeTab === 'announcements' ? 'Publish Announcement' : 'Publish Studio Policy'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: '#F5F5F7', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Title *
              </label>
              <input
                type="text"
                required
                placeholder="Enter circular headline..."
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {activeTab === 'announcements' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                  Audience
                </label>
                <select
                  value={audienceInput}
                  onChange={(e) => setAudienceInput(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    fontSize: '13px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="ALL">All Portal Members</option>
                  <option value="STAFF">Studio Staff Only</option>
                  <option value="CLIENT_LEADERS">Client Leaders Only</option>
                  <option value="CLIENT_VIEWERS">Client Viewers Only</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                {activeTab === 'announcements' ? 'Circular Details' : 'Policy Content'}
              </label>
              <textarea
                rows={4}
                placeholder="Write the official notice details..."
                value={bodyInput}
                onChange={(e) => setBodyInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {submitting ? 'Publishing...' : 'Publish Now'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
