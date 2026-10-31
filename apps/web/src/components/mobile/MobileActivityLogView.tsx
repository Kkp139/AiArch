import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  Activity,
  FileCheck2,
  CreditCard,
  UserPlus,
  Clock,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import './mobile.css';

export interface ActivityEvent {
  id: string;
  category: 'VAULT' | 'PAYMENT' | 'SECURITY' | 'ATTENDANCE' | 'USER';
  title: string;
  detail: string;
  actorName: string;
  actorRole: UserRole;
  projectTag?: string;
  timeAgo: string;
}

export interface MobileActivityLogViewProps {
  userRole: UserRole;
  onBack: () => void;
}

export const MobileActivityLogView: React.FC<MobileActivityLogViewProps> = ({
  userRole,
  onBack,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [events] = useState<ActivityEvent[]>([
    {
      id: 'act-1',
      category: 'VAULT',
      title: 'Drawing Stamped & Approved',
      detail: 'Architectural Ground Floor Setting Out Geometry v2.1 received official studio seal.',
      actorName: 'Farhan Admani',
      actorRole: 'ADMIN',
      projectTag: 'Courtyard Villa',
      timeAgo: '15 mins ago',
    },
    {
      id: 'act-2',
      category: 'PAYMENT',
      title: 'Milestone Payment Confirmed',
      detail: '₹ 1,50,000 received via Bank RTGS cleared for Phase 1 handover.',
      actorName: 'Finance Admin',
      actorRole: 'ADMIN',
      projectTag: 'Artilla Inn',
      timeAgo: '1 hour ago',
    },
    {
      id: 'act-3',
      category: 'ATTENDANCE',
      title: 'Site Shift Clock-In',
      detail: 'Clocked in at site geofence coordinates 23.0225° N, 72.5714° E.',
      actorName: 'Sonu Sharma',
      actorRole: 'STAFF',
      projectTag: 'Courtyard Villa',
      timeAgo: 'Today 09:30 AM',
    },
    {
      id: 'act-4',
      category: 'SECURITY',
      title: 'New Hardware Device Approved',
      detail: 'Apple iPhone 15 Pro hardware fingerprint authorized for vault access.',
      actorName: 'Farhan Admani',
      actorRole: 'ADMIN',
      timeAgo: 'Today 08:45 AM',
    },
    {
      id: 'act-5',
      category: 'USER',
      title: 'Client Single-Use Invite Dispatched',
      detail: 'Encrypted single-use registration link generated for Dr. Sameer Mehta.',
      actorName: 'Farhan Admani',
      actorRole: 'ADMIN',
      projectTag: 'Courtyard Villa',
      timeAgo: 'Yesterday',
    },
    {
      id: 'act-6',
      category: 'VAULT',
      title: 'New Revision Uploaded',
      detail: 'Plumbing & Drainage Schematic Sheet Rev 02 uploaded to vault.',
      actorName: 'Rajesh Patel',
      actorRole: 'STAFF',
      projectTag: 'Artilla Inn',
      timeAgo: '2 days ago',
    },
  ]);

  const getCategoryIcon = (cat: ActivityEvent['category']) => {
    switch (cat) {
      case 'VAULT':
        return <FileCheck2 size={16} color="#BF935A" />;
      case 'PAYMENT':
        return <CreditCard size={16} color="#087A48" />;
      case 'ATTENDANCE':
        return <Clock size={16} color="#175CD3" />;
      case 'SECURITY':
        return <ShieldCheck size={16} color="#A35A13" />;
      case 'USER':
        return <UserPlus size={16} color="#695132" />;
    }
  };

  const filteredEvents = events.filter((ev) => {
    const matchCat = activeCategory === 'ALL' || ev.category === activeCategory;
    const matchSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.detail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.actorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <div>
            <h2 className="figma-subpage-title">Activity Log</h2>
            <span style={{ fontSize: '11px', color: '#686869' }}>
              Immutable Studio Audit Trail
            </span>
          </div>
        </div>
      </div>

      <div className="figma-subpage-body">
        {/* Category Pills Strip */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '14px' }}>
          {[
            { id: 'ALL', label: 'All Actions' },
            { id: 'VAULT', label: 'Drawings & Vault' },
            { id: 'PAYMENT', label: 'Payments' },
            { id: 'ATTENDANCE', label: 'Site Attendance' },
            { id: 'SECURITY', label: 'Device & Security' },
          ].map((cat) => (
            <button
              key={cat.id}
              className={`figma-choice-pill ${activeCategory === cat.id ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="figma-mobile-search-pill" style={{ marginBottom: '16px' }}>
          <Search size={18} color="#979798" />
          <input
            type="text"
            placeholder="Search actions, drawings, or actors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="figma-search-input"
          />
        </div>

        {/* Timeline Event Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredEvents.map((ev) => (
            <div key={ev.id} className="figma-activity-item-card">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div className="figma-activity-icon-box">
                  {getCategoryIcon(ev.category)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                    <h4 className="figma-activity-title">{ev.title}</h4>
                    <span className="figma-activity-time">{ev.timeAgo}</span>
                  </div>

                  <p className="figma-activity-detail">{ev.detail}</p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="figma-avatar-xs">{ev.actorName.charAt(0)}</div>
                      <span style={{ fontSize: '12px', color: '#686869' }}>
                        {ev.actorName} ({ev.actorRole.replace('_', ' ')})
                      </span>
                    </div>

                    {ev.projectTag && (
                      <span className="figma-activity-project-pill">
                        {ev.projectTag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

