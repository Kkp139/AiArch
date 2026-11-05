import React, { useState } from 'react';
import {
  LucideIcon,
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  CreditCard,
  ShieldCheck,
  Clock,
  Target,
  Activity,
  Bell,
  FileText,
  AlarmClock,
  Settings,
  TrendingUp,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import './desktop.css';

export interface NavItemConfig {
  id: string;
  label: string;
  icon: LucideIcon;
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
  studioName?: string;
}

/**
 * Filtered navigation links strictly defined by UserRole:
 * - ADMIN: 12 links (Dashboard, Projects, Meetings, Payments, Design Verification, Attendance, Targets, Updates, Announcements, Policies, Reminders, Settings)
 * - STAFF: 7 links (Dashboard, Projects, Attendance, Updates, Targets, Announcements, Design Verification) - Payments & Meetings are strictly excluded
 * - CLIENT_LEADER: 7 or 8 links (Dashboard, Projects, Meetings, [Payments if showPricing], Announcements, Policies, Progress Report, Chats) - Verification, Attendance, Targets strictly excluded
 */
export function getSidebarNavItems(role: UserRole, showPricing: boolean = false): NavItemConfig[] {
  if (role === 'ADMIN') {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'meetings', label: 'Meetings', icon: CalendarDays },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'verification', label: 'Design Verification', icon: ShieldCheck },
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'targets', label: 'Targets', icon: Target },
      { id: 'updates', label: 'Updates', icon: Activity },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'policies', label: 'Policies', icon: FileText },
      { id: 'reminders', label: 'Reminders', icon: AlarmClock },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];
  }

  if (role === 'STAFF') {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'updates', label: 'Updates', icon: Activity },
      { id: 'targets', label: 'Targets', icon: Target },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'verification', label: 'Design Verification', icon: ShieldCheck },
    ];
  }

  // CLIENT_LEADER and CLIENT_VIEWER
  const clientItems: NavItemConfig[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'meetings', label: 'Meetings', icon: CalendarDays },
  ];

  if (showPricing) {
    clientItems.push({ id: 'payments', label: 'Payments', icon: CreditCard });
  }

  clientItems.push(
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'progress', label: 'Progress Report', icon: TrendingUp },
    { id: 'chats', label: 'Chats', icon: MessageSquare }
  );

  return clientItems;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  user,
  activeModule = 'dashboard',
  onSelectModule,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
  studioName = 'A&F Design',
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  const navItems = getSidebarNavItems(user.role, !!user.showPricing);

  return (
    <aside
      className={`desktop-sidebar ${isCollapsed ? 'collapsed' : ''}`}
      aria-label="Desktop Navigation Sidebar"
      data-testid="desktop-sidebar"
    >
      {/* Studio Header Branding */}
      <div className="desktop-sidebar-header">
        <div className="desktop-brand-mark" title={studioName}>
          A&F
        </div>
        <div className="desktop-brand-text">
          <span className="desktop-brand-title">{studioName}</span>
          <span className="desktop-brand-subtitle">ARCHITECTURE & INTERIORS</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="desktop-sidebar-nav" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule.toLowerCase() === item.id.toLowerCase();

          return (
            <button
              key={item.id}
              onClick={() => onSelectModule && onSelectModule(item.id)}
              className={`desktop-nav-item ${isActive ? 'active' : ''}`}
              title={item.label}
              aria-label={item.label}
              data-testid={`nav-item-${item.id}`}
            >
              <span className="desktop-nav-icon">
                <Icon size={19} />
              </span>
              <span className="desktop-nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Collapse Control */}
      <div className="desktop-sidebar-footer">
        <span className="desktop-sidebar-collapse-text">Collapse Navigation</span>
        <button
          type="button"
          onClick={handleToggle}
          className="desktop-sidebar-toggle"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-testid="sidebar-collapse-toggle"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
};
