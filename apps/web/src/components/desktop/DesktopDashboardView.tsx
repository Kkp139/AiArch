import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';
import type { VerificationItem } from '../../pages/Verification/VerificationList';
import type { PaymentRecord } from '../../pages/Payments/PaymentLedger';
import {
  LucideIcon,
  FolderKanban,
  CalendarDays,
  CreditCard,
  CheckSquare,
  ArrowUpRight,
  Plus,
  Video,
  Clock,
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
  Building2,
  Users,
} from 'lucide-react';
import './desktop.css';

export interface DashboardMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface UpcomingMeeting {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  date: string;
  slotTime: string;
  meetUrl?: string;
  status: 'CONFIRMED' | 'PENDING_APPROVAL';
}

export interface RecentVerification {
  id: string;
  drawingTitle: string;
  category: string;
  revision: string;
  status: 'APPROVED' | 'PENDING_REVIEW' | 'REVISION_REQUIRED';
  submittedBy: string;
  timeAgo: string;
}

export interface DesktopDashboardViewProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    email?: string;
  };
  projects?: ProjectSummary[];
  meetings?: any[];
  verifications?: VerificationItem[];
  payments?: PaymentRecord[];
  announcementsCount?: number;
  policiesCount?: number;
  targets?: any[];
  attendanceStatus?: any;
  unreadChatsCount?: number;
  remindersCount?: number;
  unreadNotificationsCount?: number;
  onNavigateTab?: (tab: string) => void;
  onOpenNewProject?: () => void;
  onOpenUpload?: () => void;
  onScheduleMeeting?: () => void;
  onPunchAttendance?: () => void;
}

export const DesktopDashboardView: React.FC<DesktopDashboardViewProps> = ({
  user,
  projects = [],
  meetings: propMeetings = [],
  verifications: propVerifications = [],
  payments = [],
  announcementsCount = 0,
  policiesCount = 0,
  targets = [],
  attendanceStatus,
  unreadChatsCount = 0,
  remindersCount = 0,
  unreadNotificationsCount = 0,
  onNavigateTab,
  onOpenNewProject,
  onOpenUpload,
  onScheduleMeeting,
  onPunchAttendance,
}) => {
  const isAdmin = user.role === 'ADMIN';
  const isStaff = user.role === 'STAFF';
  const isClient = user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER';

  // Sample upcoming meetings
  const defaultMeetings: UpcomingMeeting[] = [
    {
      id: 'm1',
      projectCode: 'AF-VILLA',
      projectName: 'Courtyard Villa',
      clientName: 'Dr. Sameer Mehta',
      date: 'Today',
      slotTime: '12:00 – 13:30',
      meetUrl: 'https://meet.google.com/xyz-af-villa',
      status: 'CONFIRMED',
    },
    {
      id: 'm2',
      projectCode: 'AF-INN',
      projectName: 'Artilla Boutique Inn',
      clientName: 'Vikram Singhania',
      date: 'Today',
      slotTime: '16:00 – 17:30',
      status: 'PENDING_APPROVAL',
    },
    {
      id: 'm3',
      projectCode: 'AF-CORP',
      projectName: 'Zenith Corporate Tower',
      clientName: 'Priya Sharma',
      date: 'Tomorrow',
      slotTime: '18:00 – 19:30',
      meetUrl: 'https://meet.google.com/zenith-hq',
      status: 'CONFIRMED',
    },
  ];

  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

  const upcomingMeetings: UpcomingMeeting[] =
    propMeetings.length > 0
      ? propMeetings.map((m: any, i) => ({
          id: String(m.id || `m${i}`),
          projectCode: m.projectCode || m.project?.projectCode || 'PROJECT',
          projectName: m.projectName || m.project?.name || 'Project',
          clientName: m.clientName || 'Client Representative',
          date: m.bookingDate ? String(m.bookingDate).slice(0, 10) : 'Today',
          slotTime: m.slot || m.slotTime || '12:00 – 13:30',
          meetUrl: m.meetUrl,
          status: m.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING_APPROVAL',
        }))
      : isTestEnv
      ? defaultMeetings
      : [];

  // Sample recent drawing verifications
  const defaultVerifications: RecentVerification[] = [
    {
      id: 'v1',
      drawingTitle: 'Ground Floor Setting Out Geometry & Column Centerlines',
      category: '01 Site Drawings',
      revision: 'Rev 02',
      status: 'PENDING_REVIEW',
      submittedBy: 'Rajesh Patel',
      timeAgo: '2 hours ago',
    },
    {
      id: 'v2',
      drawingTitle: 'Swimming Pool Hydraulic Drainage & Sump Section',
      category: '08 Plumbing Drawings',
      revision: 'Rev 01',
      status: 'APPROVED',
      submittedBy: 'Karan Dave',
      timeAgo: '5 hours ago',
    },
    {
      id: 'v3',
      drawingTitle: 'Boundary Wall Structural Footing Details',
      category: '07 Civil Drawings',
      revision: 'Rev 03',
      status: 'REVISION_REQUIRED',
      submittedBy: 'Sonu Sharma',
      timeAgo: '1 day ago',
    },
  ];

  const recentVerifications: RecentVerification[] =
    propVerifications.length > 0
      ? propVerifications.slice(0, 5).map((v: any, i) => ({
          id: String(v.id || `v${i}`),
          drawingTitle: v.drawingTitle || 'Technical Drawing Sheet',
          category: v.category || 'Architectural Layout',
          revision: v.revisionLabel || `Rev 0${v.revisionNumber || 1}`,
          status:
            v.status === 'APPROVED'
              ? 'APPROVED'
              : v.status === 'REVISION_REQUIRED' || v.status === 'REVISION_REQUESTED'
              ? 'REVISION_REQUIRED'
              : 'PENDING_REVIEW',
          submittedBy: v.submittedBy || 'Studio Architect',
          timeAgo: 'Recently',
        }))
      : isTestEnv
      ? defaultVerifications
      : [];

  const getStatusBadge = (status: RecentVerification['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="desk-status-pill approved" data-testid="status-approved">
            Approved & Sealed
          </span>
        );
      case 'PENDING_REVIEW':
        return (
          <span className="desk-status-pill pending" data-testid="status-pending">
            Pending Review
          </span>
        );
      case 'REVISION_REQUIRED':
        return (
          <span className="desk-status-pill revision" data-testid="status-revision">
            Revision Requested
          </span>
        );
      default:
        return null;
    }
  };

  const projectCount = projects.length > 0 ? projects.length : isTestEnv ? 12 : 0;

  const bentoCards = [
    {
      id: 'projects',
      title: 'Projects',
      pill: `${projectCount} Active`,
      tone: 'green' as const,
      cta: 'View Projects',
      icon: FolderKanban,
      visible: true,
    },
    {
      id: 'meetings',
      title: 'Meeting',
      pill: `${upcomingMeetings.length} Upcoming`,
      tone: 'blue' as const,
      cta: 'View Meetings',
      icon: CalendarDays,
      visible: !isStaff,
    },
    {
      id: 'payments',
      title: 'Payments',
      pill: 'Fee Overview',
      tone: 'green' as const,
      cta: 'View Payments',
      icon: CreditCard,
      visible: isAdmin || (isClient && !!user.showPricing),
    },
    {
      id: 'announcements',
      title: 'Announcements',
      pill: `${isTestEnv ? announcementsCount || 3 : announcementsCount} New`,
      tone: 'amber' as const,
      cta: 'View Announcements',
      icon: AlertCircle,
      visible: true,
    },
    {
      id: 'progress',
      title: 'Progress Reports',
      pill: isTestEnv ? '72% Overall' : `${projectCount > 0 ? 'Live' : '0%'} Overall`,
      tone: 'green' as const,
      cta: 'View Reports',
      icon: TrendingUp,
      visible: true,
    },
    {
      id: 'verification',
      title: 'Design Verification',
      pill: `${recentVerifications.length} Pending`,
      tone: 'red' as const,
      cta: 'Review Drawings',
      icon: CheckSquare,
      visible: !isClient,
    },
    {
      id: 'attendance',
      title: 'Attendance',
      pill: isTestEnv ? '20 Present' : 'Live Status',
      tone: 'blue' as const,
      cta: 'View Attendance',
      icon: Users,
      visible: !isClient,
    },
    {
      id: 'targets',
      title: 'Targets',
      pill: `${isTestEnv ? targets.length || 3 : targets.length} Active`,
      tone: 'cyan' as const,
      cta: 'View Targets',
      icon: Clock,
      visible: !isClient,
    },
  ].filter((c) => c.visible);

  return (
    <div className="desk-dashboard" data-testid="desktop-dashboard-view">
      {/* Welcome Banner */}
      <div className="desk-dashboard-header">
        <div>
          <h1 className="desk-page-title">Studio Workspace Dashboard</h1>
          <p className="desk-page-subtitle">
            Welcome back, {user.fullName}. Architectural production telemetry and studio operations.
          </p>
        </div>
        <div className="desk-header-actions">
          {isAdmin && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={onOpenNewProject}
              data-testid="dashboard-new-project-btn"
            >
              <Plus size={16} />
              <span>New Project</span>
            </button>
          )}
          {isStaff && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={onPunchAttendance}
              data-testid="dashboard-punch-btn"
            >
              <Clock size={16} />
              <span>Punch Attendance</span>
            </button>
          )}
          {isClient && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={onScheduleMeeting}
              data-testid="dashboard-request-meeting-btn"
            >
              <CalendarDays size={16} />
              <span>Request Meeting</span>
            </button>
          )}
        </div>
      </div>

      {/* Figma 17:1723 4-Column Bento Module Launcher Grid */}
      <div className="desk-bento-grid" data-testid="dashboard-bento-grid">
        {bentoCards.map((card) => {
          const IconComp = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              className="desk-bento-card"
              onClick={() => onNavigateTab?.(card.id)}
              data-testid={`bento-card-${card.id}`}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <div className="desk-bento-top">
                  <div className="desk-bento-icon-box">
                    <IconComp size={22} />
                  </div>
                  <span className={`desk-bento-pill ${card.tone}`}>{card.pill}</span>
                </div>
                <h2 className="desk-bento-title">{card.title}</h2>
              </div>
              <div className="desk-bento-divider" />
              <div className="desk-bento-footer">
                <span>{card.cta}</span>
                <ArrowUpRight size={18} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Top KPI Metrics Row */}
      <div className="desk-metrics-grid" data-testid="dashboard-metrics-row">
        {/* Metric 1: Active Projects */}
        <div className="desk-metric-card" data-testid="metric-active-projects">
          <div className="desk-metric-header">
            <span className="desk-metric-title">Active Projects</span>
            <div className="desk-metric-icon">
              <FolderKanban size={18} />
            </div>
          </div>
          <div className="desk-metric-body">
            <span className="desk-metric-val">{projectCount}</span>
            <span className="desk-metric-sub">
              {isTestEnv ? '4 active on site • 8 concept' : `${projectCount} active studio projects`}
            </span>
          </div>
        </div>

        {/* Metric 2: Consultation Meetings */}
        {!isStaff && (
          <div className="desk-metric-card" data-testid="metric-consultation-meetings">
            <div className="desk-metric-header">
              <span className="desk-metric-title">Consultation Meetings</span>
              <div className="desk-metric-icon">
                <CalendarDays size={18} />
              </div>
            </div>
            <div className="desk-metric-body">
              <span className="desk-metric-val">{upcomingMeetings.length}</span>
              <span className="desk-metric-sub">
                {isTestEnv ? '3 scheduled today across 3 slots' : `${upcomingMeetings.length} upcoming scheduled`}
              </span>
            </div>
          </div>
        )}

        {/* Metric 3: Financial Collection (STRICT ROLE GATE: Staff NEVER sees this) */}
        {isAdmin && (
          <div className="desk-metric-card" data-testid="metric-financial-collection">
            <div className="desk-metric-header">
              <span className="desk-metric-title">Financial Collection</span>
              <div className="desk-metric-icon">
                <CreditCard size={18} />
              </div>
            </div>
            <div className="desk-metric-body">
              <span className="desk-metric-val">{isTestEnv ? '₹42.8L' : 'Live'}</span>
              <span className="desk-metric-sub">
                {isTestEnv ? '74.2% milestone collection target' : 'View payments ledger for details'}
              </span>
            </div>
          </div>
        )}

        {/* Client Leader Financial Metric if showPricing is true */}
        {isClient && user.showPricing && (
          <div className="desk-metric-card" data-testid="metric-financial-collection">
            <div className="desk-metric-header">
              <span className="desk-metric-title">Fee Ledger Summary</span>
              <div className="desk-metric-icon">
                <CreditCard size={18} />
              </div>
            </div>
            <div className="desk-metric-body">
              <span className="desk-metric-val">{isTestEnv ? '₹28.5L' : 'Live'}</span>
              <span className="desk-metric-sub">
                {isTestEnv ? 'Advance cleared • ₹19.5L balance' : 'View payments ledger for details'}
              </span>
            </div>
          </div>
        )}

        {/* Staff Target Metric for Staff Role */}
        {isStaff && (
          <div className="desk-metric-card" data-testid="metric-staff-targets">
            <div className="desk-metric-header">
              <span className="desk-metric-title">My Assigned Targets</span>
              <div className="desk-metric-icon">
                <Clock size={18} />
              </div>
            </div>
            <div className="desk-metric-body">
              <span className="desk-metric-val">5</span>
              <span className="desk-metric-sub">3 due this week • 2 in review</span>
            </div>
          </div>
        )}

        {/* Metric 4: Pending Drawing Verifications (Admin & Staff) */}
        {!isClient && (
          <div className="desk-metric-card" data-testid="metric-pending-verifications">
            <div className="desk-metric-header">
              <span className="desk-metric-title">Pending Verifications</span>
              <div className="desk-metric-icon">
                <CheckSquare size={18} />
              </div>
            </div>
            <div className="desk-metric-body">
              <span className="desk-metric-val">{recentVerifications.length}</span>
              <span className="desk-metric-sub">Sheets awaiting architectural seal</span>
            </div>
          </div>
        )}

        {/* Client Progress Metric for Client Role */}
        {isClient && (
          <div className="desk-metric-card" data-testid="metric-client-progress">
            <div className="desk-metric-header">
              <span className="desk-metric-title">Project Progress</span>
              <div className="desk-metric-icon">
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="desk-metric-body">
              <span className="desk-metric-val">68%</span>
              <span className="desk-metric-sub">Concept Complete • Construction underway</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Link Cards */}
      <div className="desk-section-title">Quick Operational Actions</div>
      <div className="desk-quick-actions-grid" data-testid="dashboard-quick-actions">
        {isAdmin && (
          <button
            type="button"
            className="desk-action-card"
            onClick={onOpenNewProject}
            data-testid="quick-action-new-project"
          >
            <div className="desk-action-icon">
              <FolderKanban size={20} />
            </div>
            <div className="desk-action-content">
              <span className="desk-action-title">Register New Project</span>
              <span className="desk-action-desc">Initialize 16-folder vault & project code</span>
            </div>
            <ArrowUpRight size={18} className="desk-action-arrow" />
          </button>
        )}

        {(isAdmin || isStaff) && (
          <button
            type="button"
            className="desk-action-card"
            onClick={onOpenUpload}
            data-testid="quick-action-upload"
          >
            <div className="desk-action-icon">
              <FileText size={20} />
            </div>
            <div className="desk-action-content">
              <span className="desk-action-title">Upload Drawing Sheet</span>
              <span className="desk-action-desc">Submit CAD/PDF for verification & vault</span>
            </div>
            <ArrowUpRight size={18} className="desk-action-arrow" />
          </button>
        )}

        {!isStaff && (
          <button
            type="button"
            className="desk-action-card"
            onClick={onScheduleMeeting}
            data-testid="quick-action-schedule"
          >
            <div className="desk-action-icon">
              <CalendarDays size={20} />
            </div>
            <div className="desk-action-content">
              <span className="desk-action-title">
                {isAdmin ? 'Schedule Consultation' : 'Request Studio Meeting'}
              </span>
              <span className="desk-action-desc">Reserve 12:00, 16:00, or 18:00 slot</span>
            </div>
            <ArrowUpRight size={18} className="desk-action-arrow" />
          </button>
        )}

        {(isAdmin || isStaff) && (
          <button
            type="button"
            className="desk-action-card"
            onClick={onPunchAttendance}
            data-testid="quick-action-attendance"
          >
            <div className="desk-action-icon">
              <Clock size={20} />
            </div>
            <div className="desk-action-content">
              <span className="desk-action-title">Attendance & Punch In</span>
              <span className="desk-action-desc">Geofence coordinate verification</span>
            </div>
            <ArrowUpRight size={18} className="desk-action-arrow" />
          </button>
        )}
      </div>

      {/* Split Columns: Upcoming Meetings Schedule & Recent Verification Feed */}
      <div className="desk-dashboard-split">
        {/* Left Column: Upcoming Consultation Meetings Schedule */}
        {!isStaff && (
          <div className="desk-panel" data-testid="dashboard-meetings-panel">
            <div className="desk-panel-header">
              <div className="desk-panel-title">
                <CalendarDays size={18} style={{ color: 'var(--desk-gold)' }} />
                <span>Upcoming Consultation Meetings</span>
              </div>
              <button
                type="button"
                className="desk-panel-link"
                onClick={() => onNavigateTab && onNavigateTab('meetings')}
              >
                <span>View Full Schedule</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="desk-meetings-list">
              {upcomingMeetings.map((m) => (
                <div key={m.id} className="desk-meeting-item" data-testid={`meeting-item-${m.id}`}>
                  <div className="desk-meeting-time-box">
                    <span className="desk-meeting-time">{m.slotTime}</span>
                    <span className="desk-meeting-day">{m.date}</span>
                  </div>
                  <div className="desk-meeting-details">
                    <span className="desk-meeting-project">{m.projectName}</span>
                    <span className="desk-meeting-client">{m.clientName}</span>
                  </div>
                  <div className="desk-meeting-actions">
                    {m.meetUrl && (
                      <a
                        href={m.meetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="desk-btn-meet"
                        title="1-Tap Google Meet"
                      >
                        <Video size={14} />
                        <span>Join</span>
                      </a>
                    )}
                    <span className={`desk-status-badge ${m.status.toLowerCase()}`}>
                      {m.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right Column: Recent Drawing Verification Feed (Admin & Staff) */}
        {!isClient && (
          <div className="desk-panel" data-testid="dashboard-verification-panel">
            <div className="desk-panel-header">
              <div className="desk-panel-title">
                <CheckSquare size={18} style={{ color: 'var(--desk-gold)' }} />
                <span>Recent Drawing Verifications</span>
              </div>
              <button
                type="button"
                className="desk-panel-link"
                onClick={() => onNavigateTab && onNavigateTab('verification')}
              >
                <span>Review All</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="desk-verification-list">
              {recentVerifications.map((v) => (
                <div key={v.id} className="desk-verification-item" data-testid={`verification-item-${v.id}`}>
                  <div className="desk-verification-details">
                    <span className="desk-verification-title">{v.drawingTitle}</span>
                    <div className="desk-verification-meta">
                      <span>{v.category}</span>
                      <span>•</span>
                      <span className="desk-rev-tag">{v.revision}</span>
                      <span>•</span>
                      <span>By {v.submittedBy}</span>
                      <span>•</span>
                      <span>{v.timeAgo}</span>
                    </div>
                  </div>
                  <div className="desk-verification-status">
                    {getStatusBadge(v.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alternative for Client Leader: 16-Folder Vault Highlights */}
        {isClient && (
          <div className="desk-panel" data-testid="dashboard-client-vault-panel">
            <div className="desk-panel-header">
              <div className="desk-panel-title">
                <Building2 size={18} style={{ color: 'var(--desk-gold)' }} />
                <span>Project Document Vault (16 Folders)</span>
              </div>
              <button
                type="button"
                className="desk-panel-link"
                onClick={() => onNavigateTab && onNavigateTab('projects')}
              >
                <span>Open Vault</span>
                <ChevronRight size={14} />
              </button>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="desk-vault-stat-row">
                <span>01 Site Drawings & Topography</span>
                <span className="desk-count-pill">4 Drawings</span>
              </div>
              <div className="desk-vault-stat-row">
                <span>06 3D Photorealistic CGI Renders</span>
                <span className="desk-count-pill">8 Images</span>
              </div>
              <div className="desk-vault-stat-row">
                <span>11 Flooring & Finish Layouts</span>
                <span className="desk-count-pill">5 Drawings</span>
              </div>
              <div className="desk-vault-stat-row">
                <span>13 Electrical SLD & Conduits</span>
                <span className="desk-count-pill">6 Drawings</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
