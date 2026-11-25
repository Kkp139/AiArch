import React, { useState } from 'react';
import {
  LucideIcon,
  LayoutGrid,
  Folder,
  Calendar,
  TrendingUp,
  CreditCard,
  ShieldCheck,
  Clock,
  Target,
  ClipboardList,
  Megaphone,
  MessageSquare,
  CalendarClock,
  BookOpen,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Headphones,
  ArrowUpRight,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import './desktop.css';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  section: 'operations' | 'communication' | 'governance';
}

export interface DesktopSidebarProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
    email?: string;
  };
  activeModule?: string;
  onSelectModule?: (moduleId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onContactSupport?: () => void;
  studioName?: string;
}

/**
 * Strict role-based Desktop Navigation matching Master Spec & Figma Sidebar (928:30739 / 928:31582):
 * - ADMIN: Dashboard, Projects, Meetings, Progress Report, Payments, Design Verification, Attendance, Targets, Updates, Announcements, Chats, Reminders, Policies, Settings
 * - STAFF: Dashboard, Projects, Design Verification, Attendance, Targets, Updates, Announcements, Policies
 * - CLIENT_LEADER: Dashboard, Projects, Meetings (if allowMeetings !== false), Progress Report, Payments (if showPricing), Announcements, Chats, Policies
 * - CLIENT_VIEWER: Dashboard, Projects, Progress Report, Payments (if showPricing), Announcements, Policies
 */
export function getSidebarNavItems(
  role: UserRole,
  showPricing: boolean = false,
  allowMeetings: boolean = true
): NavItemConfig[] {
  if (role === 'ADMIN') {
    return [
      { id: 'dashboard', label: 'Overview', icon: LayoutGrid, section: 'operations' },
      { id: 'projects', label: 'Projects', icon: Folder, section: 'operations' },
      { id: 'meetings', label: 'Meetings', icon: Calendar, section: 'operations' },
      { id: 'progress', label: 'Progress Report', icon: TrendingUp, section: 'operations' },
      { id: 'payments', label: 'Payments', icon: CreditCard, section: 'operations' },
      { id: 'verification', label: 'Design Verify', icon: ShieldCheck, section: 'operations' },
      { id: 'attendance', label: 'Attendance', icon: Clock, section: 'operations' },
      { id: 'targets', label: 'Targets', icon: Target, section: 'operations' },
      { id: 'updates', label: 'Updates', icon: ClipboardList, section: 'operations' },
      { id: 'announcements', label: 'Announcements', icon: Megaphone, section: 'communication' },
      { id: 'chats', label: 'Chats', icon: MessageSquare, section: 'communication' },
      { id: 'reminders', label: 'Reminders', icon: CalendarClock, section: 'communication' },
      { id: 'policies', label: 'Policies', icon: BookOpen, section: 'communication' },
      { id: 'settings', label: 'Settings & Audit', icon: Settings, section: 'governance' },
    ];
  }

  if (role === 'STAFF') {
    return [
      { id: 'dashboard', label: 'Overview', icon: LayoutGrid, section: 'operations' },
      { id: 'projects', label: 'Projects', icon: Folder, section: 'operations' },
      { id: 'verification', label: 'Design Verify', icon: ShieldCheck, section: 'operations' },
      { id: 'attendance', label: 'Attendance', icon: Clock, section: 'operations' },
      { id: 'targets', label: 'Targets', icon: Target, section: 'operations' },
      { id: 'updates', label: 'Updates', icon: ClipboardList, section: 'operations' },
      { id: 'announcements', label: 'Announcements', icon: Megaphone, section: 'communication' },
      { id: 'policies', label: 'Policies', icon: BookOpen, section: 'communication' },
    ];
  }

  if (role === 'CLIENT_LEADER') {
    const items: NavItemConfig[] = [
      { id: 'dashboard', label: 'Overview', icon: LayoutGrid, section: 'operations' },
      { id: 'projects', label: 'Projects', icon: Folder, section: 'operations' },
    ];
    if (allowMeetings !== false) {
      items.push({ id: 'meetings', label: 'Meetings', icon: Calendar, section: 'operations' });
    }
    items.push({ id: 'progress', label: 'Progress Report', icon: TrendingUp, section: 'operations' });
    if (showPricing) {
      items.push({ id: 'payments', label: 'Payments', icon: CreditCard, section: 'operations' });
    }
    items.push(
      { id: 'announcements', label: 'Announcements', icon: Megaphone, section: 'communication' },
      { id: 'chats', label: 'Chats', icon: MessageSquare, section: 'communication' },
      { id: 'policies', label: 'Policies', icon: BookOpen, section: 'communication' }
    );
    return items;
  }

  // CLIENT_VIEWER: No Meetings, No Chat, No Verification, No Attendance, No Targets, No Reminders
  const viewerItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutGrid, section: 'operations' },
    { id: 'projects', label: 'Projects', icon: Folder, section: 'operations' },
    { id: 'progress', label: 'Progress Report', icon: TrendingUp, section: 'operations' },
  ];
  if (showPricing) {
    viewerItems.push({ id: 'payments', label: 'Payments', icon: CreditCard, section: 'operations' });
  }
  viewerItems.push(
    { id: 'announcements', label: 'Announcements', icon: Megaphone, section: 'communication' },
    { id: 'policies', label: 'Policies', icon: BookOpen, section: 'communication' }
  );
  return viewerItems;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  user,
  activeModule = 'dashboard',
  onSelectModule,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  onContactSupport,
  studioName = 'A&F Design',
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed((prev) => !prev);
    }
  };

  const navItems = getSidebarNavItems(
    user.role,
    !!user.showPricing,
    user.allowMeetings !== false
  );

  const operationsItems = navItems.filter((i) => i.section === 'operations');
  const communicationItems = navItems.filter((i) => i.section === 'communication');
  const governanceItems = navItems.filter((i) => i.section === 'governance');

  const renderSection = (title: string, items: NavItemConfig[]) => {
    if (items.length === 0) return null;
    return (
      <div className="desktop-sidebar-section">
        <div className="desktop-sidebar-section-header">
          <span className="desktop-sidebar-section-title">{title}</span>
          <div className="desktop-sidebar-section-line" />
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const normalizedActive = activeModule.toLowerCase() === 'chat' ? 'chats' : activeModule.toLowerCase();
          const isActive = normalizedActive === item.id.toLowerCase();

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectModule && onSelectModule(item.id)}
              className={`desktop-nav-item ${isActive ? 'active' : ''}`}
              title={item.label}
              aria-label={item.label}
              data-testid={`nav-item-${item.id}`}
            >
              <span className="desktop-nav-icon">
                <Icon size={20} strokeWidth={1.9} />
              </span>
              <span className="desktop-nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <aside
      className={`desktop-sidebar ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Desktop Navigation Sidebar"
      data-testid="desktop-sidebar"
    >
      {/* Top Studio Branding & Collapse Toggle */}
      <div className="desktop-sidebar-header">
        <div className="desktop-brand-lockup" title={studioName}>
          <img
            src="/assets/auth/asf_logo.svg"
            alt={studioName}
            className="desktop-brand-logo"
          />
          <div className="desktop-brand-text">
            <span className="desktop-brand-title">{studioName}</span>
            <span className="desktop-brand-subtitle">ARCHITECTURE & INTERIORS</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggle}
          className="desktop-sidebar-toggle"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-testid="sidebar-collapse-toggle"
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Grouped Navigation Links */}
      <nav className="desktop-sidebar-nav" aria-label="Main Navigation">
        {renderSection('Projects & Operations', operationsItems)}
        {renderSection('Communication & Resources', communicationItems)}
        {renderSection('Governance', governanceItems)}
      </nav>

      {/* Bottom Support Card (Figma 928:30801) */}
      <div className="desktop-sidebar-support-wrap">
        {isCollapsed ? (
          <button
            type="button"
            className="desktop-support-icon-btn"
            onClick={onContactSupport}
            title="Contact support"
            aria-label="Contact support"
            data-testid="sidebar-support-btn"
          >
            <Headphones size={18} />
          </button>
        ) : (
          <div className="desktop-support-card" data-testid="sidebar-support-card">
            <div>
              <div className="desktop-support-head">
                <Headphones size={18} color="#BF935A" />
                <span>A little help?</span>
              </div>
              <p className="desktop-support-desc" style={{ marginTop: '6px' }}>
                Your studio support team is just a message away.
              </p>
            </div>
            <button
              type="button"
              className="desktop-support-btn"
              onClick={onContactSupport}
              data-testid="sidebar-support-btn"
            >
              <span>Contact support</span>
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
