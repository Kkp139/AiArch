import React, { useState, useEffect, useCallback } from 'react';
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
  authHeaders: Record<string, string>;
}

export function AnnouncementsPolicies({ userRole, authHeaders }: AnnouncementsPoliciesProps) {
  const [activeSubTab, setActiveSubTab] = useState<'announcements' | 'policies'>('announcements');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [policies, setPolicies] = useState<StudioPolicyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Form states for Admin publishing
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [audience, setAudience] = useState<'ALL' | 'STAFF' | 'CLIENT_LEADERS' | 'CLIENT_VIEWERS'>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/announcements', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (err) {
      console.error('Failed to load announcements', err);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/policies', { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (activeSubTab === 'announcements') {
      fetchAnnouncements();
    } else {
      fetchPolicies();
    }
  }, [activeSubTab, fetchAnnouncements, fetchPolicies]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const endpoint = activeSubTab === 'announcements' ? '/api/announcements' : '/api/policies';
      const payload = activeSubTab === 'announcements'
        ? { title: title.trim(), body: bodyText.trim() || undefined, audience }
        : { title: title.trim(), content: bodyText.trim() || undefined };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setTitle('');
        setBodyText('');
        setIsPublishModalOpen(false);
        if (activeSubTab === 'announcements') {
          await fetchAnnouncements();
        } else {
          await fetchPolicies();
        }
      } else {
        const err = await res.json();
        alert(`Publish failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Publish error', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to withdraw this announcement?')) return;
    try {
      const res = await fetch(`/api/announcements/${id}/withdraw`, {
        method: 'PATCH',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchAnnouncements();
      }
    } catch (err) {
      console.error('Withdraw announcement failed', err);
    }
  };

  const handleWithdrawPolicy = async (id: string) => {
    if (!confirm('Are you sure you want to withdraw this policy?')) return;
    try {
      const res = await fetch(`/api/policies/${id}/withdraw`, {
        method: 'PATCH',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchPolicies();
      }
    } catch (err) {
      console.error('Withdraw policy failed', err);
    }
  };

  const handleAcknowledgePolicy = async (id: string) => {
    try {
      const res = await fetch(`/api/policies/${id}/acknowledge`, {
        method: 'POST',
        headers: authHeaders,
      });
      if (res.ok) {
        await fetchPolicies();
      } else {
        const err = await res.json();
        alert(`Acknowledgment failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Acknowledge policy error', err);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Sub-tab Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700 }}>
            Studio Governance & Communications
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
            Announcements & Studio Policies
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Administrative circulars, operational notices, and acknowledged office standards.
          </p>
        </div>

        {userRole === 'ADMIN' && (
          <button
            onClick={() => setIsPublishModalOpen(true)}
            style={{
              backgroundColor: 'var(--accent-gold)',
              color: '#1A1D20',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Plus size={16} />
            Publish {activeSubTab === 'announcements' ? 'Circular' : 'Policy'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveSubTab('announcements')}
          style={{
            backgroundColor: activeSubTab === 'announcements' ? 'var(--accent-gold)' : 'transparent',
            color: activeSubTab === 'announcements' ? '#1A1D20' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Bell size={15} />
          Studio Circulars ({announcements.length})
        </button>

        <button
          onClick={() => setActiveSubTab('policies')}
          style={{
            backgroundColor: activeSubTab === 'policies' ? 'var(--accent-gold)' : 'transparent',
            color: activeSubTab === 'policies' ? '#1A1D20' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <FileText size={15} />
          Studio Policies ({policies.length})
        </button>
      </div>

      {/* Content Feed */}
      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading governance documents...
        </div>
      ) : activeSubTab === 'announcements' ? (
        announcements.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
            <Bell size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No active announcements published for your role.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {announcements.map((item) => (
              <div
                key={item.id}
                style={{
                  backgroundColor: item.isWithdrawn ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-secondary)',
                  border: item.isWithdrawn ? '1px dashed rgba(239, 68, 68, 0.3)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  opacity: item.isWithdrawn ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(224, 169, 109, 0.15)',
                        color: 'var(--accent-gold)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {item.audience}
                    </span>
                    {item.isWithdrawn && (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          fontWeight: 700,
                        }}
                      >
                        WITHDRAWN
                      </span>
                    )}
                  </div>

                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Published by {item.publisherName} • {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {item.title}
                </h3>

                {item.body && (
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {item.body}
                  </p>
                )}

                {userRole === 'ADMIN' && !item.isWithdrawn && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => handleWithdrawAnnouncement(item.id)}
                      style={{
                        background: 'transparent',
                        color: '#f87171',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Withdraw Notice
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : policies.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-subtle)' }}>
          <FileText size={32} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>No studio policies published yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {policies.map((policy) => (
            <div
              key={policy.id}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  {policy.title}
                </h3>

                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Effective {new Date(policy.createdAt).toLocaleDateString()}
                </span>
              </div>

              {policy.content && (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                  {policy.content}
                </p>
              )}

              {/* Acknowledgment Status & Action */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: '8px',
                }}
              >
                {policy.isAcknowledged ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '13px', fontWeight: 600 }}>
                    <CheckCircle size={16} />
                    Acknowledged by you on {new Date(policy.acknowledgedAt!).toLocaleDateString()}
                  </div>
                ) : (
                  <button
                    onClick={() => handleAcknowledgePolicy(policy.id)}
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--accent-gold)',
                      border: '1px solid var(--accent-gold)',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    I Acknowledge & Agree to Policy
                  </button>
                )}

                {userRole === 'ADMIN' && !policy.isWithdrawn && (
                  <button
                    onClick={() => handleWithdrawPolicy(policy.id)}
                    style={{
                      background: 'transparent',
                      color: '#f87171',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Withdraw Policy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Publish Modal */}
      {isPublishModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Publish {activeSubTab === 'announcements' ? 'Studio Circular' : 'Studio Policy'}
            </h2>

            <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Document Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Revised Drawing Submission Protocol"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {activeSubTab === 'announcements' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                    Target Audience *
                  </label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="ALL">All Users (Studio & Clients)</option>
                    <option value="STAFF">Staff Only</option>
                    <option value="CLIENT_LEADERS">Client Leaders Only</option>
                    <option value="CLIENT_VIEWERS">Client Viewers Only</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Message Content / Policy Guidelines
                </label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Provide comprehensive details or operational instructions..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent-gold)',
                    color: '#1A1D20',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSubmitting ? 'Publishing...' : 'Publish to Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
