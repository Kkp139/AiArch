import React, { useState, useEffect } from 'react';
import { UserRole } from '../../context/AuthContext';
import { AnnouncementItem, StudioPolicyItem } from '../../pages/Announcements/AnnouncementsPolicies';
import {
  ChevronLeft,
  Megaphone,
  ShieldCheck,
  Plus,
  Calendar,
  User,
  CheckCircle2,
  X,
  FileText,
  AlertCircle,
  Eye,
  Send,
} from 'lucide-react';
import './mobile.css';

export interface MobileAnnouncementsViewProps {
  userRole: UserRole;
  authHeaders: Record<string, string>;
  onBack: () => void;
}

export const MobileAnnouncementsView: React.FC<MobileAnnouncementsViewProps> = ({
  userRole,
  authHeaders,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'policies'>('announcements');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [policies, setPolicies] = useState<StudioPolicyItem[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<StudioPolicyItem | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // New Broadcast Form State
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newAudience, setNewAudience] = useState<'ALL' | 'STAFF' | 'CLIENT_LEADERS'>('ALL');

  // Fallback demo items if backend is not yet populated
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const resA = await fetch('/api/announcements', { headers: authHeaders });
        if (resA.ok) {
          const data = await resA.json();
          if (Array.isArray(data) && data.length > 0) setAnnouncements(data);
        }
      } catch {
        // Fallback demo data
      }

      try {
        const resP = await fetch('/api/policies', { headers: authHeaders });
        if (resP.ok) {
          const data = await resP.json();
          if (Array.isArray(data) && data.length > 0) setPolicies(data);
        }
      } catch {
        // Fallback demo data
      }
    };

    fetchItems();
  }, [authHeaders]);

  const defaultAnnouncements: AnnouncementItem[] = [
    {
      id: 'anc-1',
      title: 'Studio Diwali Holidays & Site Operations Schedule',
      body: 'Please note the studio will observe Diwali break from Nov 1 to Nov 5. On-site construction supervision will continue with emergency on-call team.',
      audience: 'ALL',
      isWithdrawn: false,
      publisherName: 'Farhan Admani',
      publisherRole: 'Studio Principal',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'anc-2',
      title: 'New BIM Drawing Standards & Layer Nomenclature v2.4',
      body: 'Effective immediately, all architectural drawings submitted to the Vault must adhere to the updated CAD & Revit layering conventions as approved in the technical review.',
      audience: 'STAFF',
      isWithdrawn: false,
      publisherName: 'Farhan Admani',
      publisherRole: 'Studio Principal',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'anc-3',
      title: 'Client Review Milestone Protocol for Q4 Sites',
      body: 'All clients with active structural phases are requested to review updated structural verification notes in their mobile portal before milestone clearance.',
      audience: 'CLIENT_LEADERS',
      isWithdrawn: false,
      publisherName: 'Studio Administration',
      publisherRole: 'Admin',
      createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    },
  ];

  const defaultPolicies: StudioPolicyItem[] = [
    {
      id: 'pol-1',
      title: 'Site Safety & Mandatory PPE Protocol',
      content: 'Helmets, high-visibility vests, and steel-toe safety footwear are mandatory at all project construction sites without exception. Violations will result in immediate gate disqualification.',
      isWithdrawn: false,
      publisherName: 'A&F Operations',
      createdAt: '2026-09-01T00:00:00.000Z',
      isAcknowledged: true,
      acknowledgedAt: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'pol-2',
      title: 'Client Intellectual Property & Drawing Distribution Policy',
      content: 'Drawings bearing the A&F Design official stamp are confidential. Digital distribution must occur strictly through the secure mobile vault. No unauthorized copies permitted.',
      isWithdrawn: false,
      publisherName: 'Studio Legal',
      createdAt: '2026-08-15T00:00:00.000Z',
      isAcknowledged: false,
    },
  ];

  const activeAnnouncements = announcements.length > 0 ? announcements : defaultAnnouncements;
  const activePolicies = policies.length > 0 ? policies : defaultPolicies;

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    const newBroadcast: AnnouncementItem = {
      id: `anc-${Date.now()}`,
      title: newTitle,
      body: newBody,
      audience: newAudience,
      isWithdrawn: false,
      publisherName: 'Admin',
      publisherRole: 'Admin',
      createdAt: new Date().toISOString(),
    };

    setAnnouncements([newBroadcast, ...activeAnnouncements]);
    setIsPublishModalOpen(false);
    setNewTitle('');
    setNewBody('');
  };

  return (
    <div className="figma-mobile-subpage">
      {/* Header */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Bulletins & Policies</h2>
        </div>
        {userRole === 'ADMIN' && (
          <button
            className="figma-primary-btn-sm"
            onClick={() => setIsPublishModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Broadcast</span>
          </button>
        )}
      </div>

      <div className="figma-subpage-body">
        {/* Sub-tabs: Announcements vs Policies (Figma: 401:4776) */}
        <div className="figma-pill-tab-group" style={{ marginBottom: '16px' }}>
          <button
            className={`figma-pill-tab ${activeTab === 'announcements' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcements')}
          >
            <Megaphone size={16} />
            <span>Announcements</span>
          </button>
          <button
            className={`figma-pill-tab ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            <ShieldCheck size={16} />
            <span>Studio Policies</span>
          </button>
        </div>

        {/* Tab 1: Announcements Feed */}
        {activeTab === 'announcements' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="figma-announcement-card"
                  onClick={() => setSelectedAnnouncement(item)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span className="figma-audience-tag">
                      {item.audience === 'ALL' ? 'Studio Broadcast' : item.audience === 'STAFF' ? 'Staff Only' : 'Client Leaders'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#979798' }}>
                      {new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>

                  <h3 className="figma-announcement-title">{item.title}</h3>
                  <p className="figma-announcement-excerpt">{item.body}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #F0F0F2', paddingTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="figma-avatar-xs">{item.publisherName.charAt(0)}</div>
                      <span style={{ fontSize: '12px', color: '#686869' }}>
                        {item.publisherName} • {item.publisherRole}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#BF935A', fontWeight: 600 }}>Read full</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Studio Policies */}
        {activeTab === 'policies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activePolicies.map((policy) => (
              <div
                key={policy.id}
                className="figma-announcement-card"
                onClick={() => setSelectedPolicy(policy)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className="figma-policy-tag">Official Protocol</span>
                  {policy.isAcknowledged ? (
                    <span className="figma-status-badge cleared" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Acknowledged
                    </span>
                  ) : (
                    <span className="figma-status-badge pending">Pending Ack</span>
                  )}
                </div>

                <h3 className="figma-announcement-title">{policy.title}</h3>
                <p className="figma-announcement-excerpt">{policy.content}</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #F0F0F2', paddingTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#686869' }}>Published by {policy.publisherName}</span>
                  <span style={{ fontSize: '12px', color: '#BF935A', fontWeight: 600 }}>Review Document</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Announcement Detail Reader Modal (Figma: 538:4841) */}
      {selectedAnnouncement && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedAnnouncement(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span className="figma-audience-tag">
                {selectedAnnouncement.audience === 'ALL' ? 'Studio Broadcast' : 'Staff Only'}
              </span>
              <button onClick={() => setSelectedAnnouncement(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {selectedAnnouncement.title}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div className="figma-avatar-xs">{selectedAnnouncement.publisherName.charAt(0)}</div>
              <span style={{ fontSize: '12px', color: '#686869' }}>
                {selectedAnnouncement.publisherName} • {selectedAnnouncement.publisherRole} •{' '}
                {new Date(selectedAnnouncement.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="figma-receipt-divider" />

            <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#4A4A4C', whiteSpace: 'pre-line', margin: '16px 0 24px 0' }}>
              {selectedAnnouncement.body}
            </div>

            <button className="figma-btn-gold-full" onClick={() => setSelectedAnnouncement(null)}>
              Close Bulletin
            </button>
          </div>
        </div>
      )}

      {/* Policy Detail Reader & Acknowledge Modal */}
      {selectedPolicy && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedPolicy(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <span className="figma-policy-tag">Official Protocol</span>
              <button onClick={() => setSelectedPolicy(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {selectedPolicy.title}
            </h2>

            <div style={{ fontSize: '12px', color: '#686869', marginBottom: '14px' }}>
              Published by {selectedPolicy.publisherName}
            </div>

            <div className="figma-receipt-divider" />

            <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#4A4A4C', whiteSpace: 'pre-line', margin: '16px 0 24px 0' }}>
              {selectedPolicy.content}
            </div>

            {!selectedPolicy.isAcknowledged ? (
              <button
                className="figma-btn-gold-full"
                onClick={() => {
                  setSelectedPolicy({ ...selectedPolicy, isAcknowledged: true, acknowledgedAt: new Date().toISOString() });
                  alert('Thank you. You have formally acknowledged this studio policy.');
                }}
              >
                <CheckCircle2 size={18} />
                <span>Acknowledge & Sign Compliance</span>
              </button>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px', background: '#E8F8EE', borderRadius: '8px', color: '#12B76A', fontSize: '13px', fontWeight: 600 }}>
                ✓ You formally acknowledged this policy on{' '}
                {new Date(selectedPolicy.acknowledgedAt || Date.now()).toLocaleDateString('en-GB')}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Publish Broadcast Modal */}
      {isPublishModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsPublishModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Publish Studio Broadcast</h3>
              <button onClick={() => setIsPublishModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handlePublishSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Broadcast Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Site Safety Alert / Holiday Schedule"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Target Audience</label>
                <select
                  value={newAudience}
                  onChange={(e) => setNewAudience(e.target.value as any)}
                  className="figma-form-input"
                >
                  <option value="ALL">All Team & Clients</option>
                  <option value="STAFF">Internal Studio Staff Only</option>
                  <option value="CLIENT_LEADERS">Client Leaders Only</option>
                </select>
              </div>

              <div>
                <label className="figma-form-label">Broadcast Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write clear instructions or notice text..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsPublishModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  <Send size={16} />
                  <span>Publish Broadcast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

