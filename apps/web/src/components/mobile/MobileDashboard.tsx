import React from 'react';
import {
  FolderKanban,
  CalendarDays,
  CreditCard,
  Megaphone,
  TrendingUp,
  CheckSquare,
  Clock,
  CalendarCheck,
  Target,
  MessageSquare,
  BellRing,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';

export interface MobileDashboardProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
  };
  onNavigate: (tab: string) => void;
}

interface ActionCardDef {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ user, onNavigate }) => {
  const getActionCards = (): ActionCardDef[] => {
    if (user.role === 'ADMIN') {
      return [
        { id: 'projects', label: 'Projects', icon: FolderKanban },
        { id: 'meetings', label: 'Meetings', icon: CalendarDays },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'announcement', label: 'Announcements', icon: Megaphone },
        { id: 'progress', label: 'Progress Report', icon: TrendingUp },
        { id: 'verification', label: 'Verification', icon: CheckSquare },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'updates', label: 'Updates', icon: CalendarCheck },
        { id: 'targets', label: 'Targets', icon: Target },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'reminders', label: 'Reminders', icon: BellRing },
        { id: 'policies', label: 'Policies', icon: ShieldCheck },
      ];
    }

    if (user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER') {
      const cards: ActionCardDef[] = [
        { id: 'projects', label: 'Projects', icon: FolderKanban },
      ];

      if (user.role === 'CLIENT_LEADER' && user.allowMeetings !== false) {
        cards.push({ id: 'meetings', label: 'Meetings', icon: CalendarDays });
      }

      if (user.showPricing) {
        cards.push({ id: 'payments', label: 'Payments', icon: CreditCard });
      }

      cards.push(
        { id: 'announcement', label: 'Announcements', icon: Megaphone },
        { id: 'progress', label: 'Progress Report', icon: TrendingUp }
      );

      if (user.role === 'CLIENT_LEADER') {
        cards.push({ id: 'chat', label: 'Chat', icon: MessageSquare });
      }

      cards.push({ id: 'policies', label: 'Policies', icon: ShieldCheck });
      return cards;
    }

    // STAFF
    return [
      { id: 'projects', label: 'Projects', icon: FolderKanban },
      { id: 'attendance', label: 'Attendance', icon: Clock },
      { id: 'updates', label: 'Updates', icon: CalendarCheck },
      { id: 'targets', label: 'Targets', icon: Target },
      { id: 'announcement', label: 'Announcements', icon: Megaphone },
      { id: 'verification', label: 'Verification', icon: CheckSquare },
      { id: 'policies', label: 'Policies', icon: ShieldCheck },
    ];
  };

  const actionCards = getActionCards();

  return (
    <div style={{ flex: 1 }}>
      {/* Welcome Banner (Figma 71:9393) — Full Name only, zero role in parentheses */}
      <div className="figma-welcome-banner">
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#686869',
            marginBottom: '4px',
            letterSpacing: '0.2px',
          }}
        >
          Welcome
        </div>
        <h1 className="figma-welcome-title">{user.fullName}</h1>
      </div>

      {/* Role-Aware Action Grid */}
      <div className="figma-action-grid">
        {actionCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              className="figma-action-card"
              onClick={() => onNavigate(card.id)}
            >
              <div className="figma-card-icon-wrap">
                <IconComponent size={20} strokeWidth={2} />
              </div>
              <span>{card.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
