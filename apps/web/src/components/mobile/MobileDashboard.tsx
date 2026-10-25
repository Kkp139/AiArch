import React from 'react';
import { UserRole } from '../../context/AuthContext';
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
} from 'lucide-react';

export interface MobileDashboardProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
  };
  onNavigate: (viewId: string) => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({ user, onNavigate }) => {
  // Define action grid cards based on Figma 71:9393, 20:2884, 21:3239
  const getCardsForRole = () => {
    if (user.role === 'ADMIN') {
      return [
        { id: 'projects', label: 'Project', icon: FolderKanban },
        { id: 'meetings', label: 'Meeting', icon: CalendarDays },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'announcement', label: 'Announcement', icon: Megaphone },
        { id: 'progress', label: 'Progress Report', icon: TrendingUp },
        { id: 'verification', label: 'Design Verification', icon: CheckSquare },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'updates', label: 'Updates', icon: CalendarCheck },
        { id: 'targets', label: 'Targets', icon: Target },
        { id: 'chat', label: 'Chats', icon: MessageSquare },
        { id: 'reminders', label: 'Reminders', icon: BellRing },
        { id: 'policies', label: 'Policies', icon: ShieldCheck },
      ];
    } else if (user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER') {
      const cards = [
        { id: 'projects', label: 'Project', icon: FolderKanban },
        { id: 'meetings', label: 'Meeting', icon: CalendarDays },
      ];
      if (user.showPricing) {
        cards.push({ id: 'payments', label: 'Payments', icon: CreditCard });
      }
      cards.push(
        { id: 'announcement', label: 'Announcement', icon: Megaphone },
        { id: 'progress', label: 'Progress Report', icon: TrendingUp },
        { id: 'vault', label: 'Document Vault', icon: FolderKanban },
        { id: 'chat', label: 'Chats', icon: MessageSquare },
        { id: 'reminders', label: 'Reminders', icon: BellRing },
        { id: 'policies', label: 'Policies', icon: ShieldCheck }
      );
      return cards;
    } else {
      // STAFF ROLE (Figma 21:3239)
      return [
        { id: 'projects', label: 'Project', icon: FolderKanban },
        { id: 'attendance', label: 'Attendance', icon: Clock },
        { id: 'updates', label: 'Updates', icon: CalendarCheck },
        { id: 'targets', label: 'Targets', icon: Target },
        { id: 'announcement', label: 'Announcement', icon: Megaphone },
        { id: 'verification', label: 'Design Verification', icon: CheckSquare }, // Verified in Step 2: Staff has access
      ];
    }
  };

  const cards = getCardsForRole();

  return (
    <div style={{ flex: 1 }}>
      {/* Welcome Greeting (Figma: 71:9393) */}
      <div className="figma-welcome-box">
        <h1 className="figma-welcome-title">Welcome</h1>
        <p className="figma-welcome-subtitle">
          Welcome {user.fullName} ({user.role})
        </p>
      </div>

      {/* 3-Column Action Grid */}
      <div className="figma-action-grid">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="figma-action-card"
              onClick={() => onNavigate(card.id)}
            >
              <div className="figma-card-badge">
                <Icon size={20} />
              </div>
              <span className="figma-card-title">{card.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
