import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { UserRole } from '../../context/AuthContext';
import { DesktopShell } from '../desktop/DesktopShell';
import { MobileShell } from '../mobile/MobileShell';
import { InAppNotificationItem } from '../layout/Shell';

export interface ResponsiveShellProps {
  user: {
    id?: string;
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
    email?: string;
    username?: string;
  };
  forceView?: 'responsive' | 'mobile' | 'desktop';
  activeDesktopModule?: string;
  onSelectDesktopModule?: (moduleId: string, subTab?: string) => void;
  activeMobileTab?: string;
  onSelectMobileTab?: (tab: string) => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  onOpenProfile?: () => void;
  notifications?: InAppNotificationItem[];
  unreadCount?: number;
  onMarkAllNotificationsRead?: () => void;
  onNotificationClick?: (notif: InAppNotificationItem) => void;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onOpenNotifications?: () => void;
  onContactSupport?: () => void;
  studioName?: string;
  desktopContent: React.ReactNode;
  mobileContent: React.ReactNode;
}

/**
 * Universal Responsive Shell that seamlessly transitions between
 * Mobile Architecture (< 1024px) and Desktop Architecture (>= 1024px)
 * while preserving complete brand continuity and state synchronization.
 */
export const ResponsiveShell: React.FC<ResponsiveShellProps> = ({
  user,
  forceView = 'responsive',
  activeDesktopModule = 'dashboard',
  onSelectDesktopModule,
  activeMobileTab = 'home',
  onSelectMobileTab,
  onLogout,
  onChangePassword,
  onOpenProfile,
  notifications = [],
  unreadCount = 0,
  onMarkAllNotificationsRead,
  onNotificationClick,
  searchValue = '',
  onSearchChange,
  onOpenNotifications,
  onContactSupport,
  studioName = 'A&F Design',
  desktopContent,
  mobileContent,
}) => {
  const { isDesktop } = useResponsive();

  const isDesktopMode = forceView === 'desktop' || (forceView === 'responsive' && isDesktop);

  if (isDesktopMode) {
    return (
      <DesktopShell
        user={user}
        activeModule={activeDesktopModule}
        onSelectModule={onSelectDesktopModule}
        onLogout={onLogout}
        onChangePassword={onChangePassword}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllNotificationsRead={onMarkAllNotificationsRead}
        onNotificationClick={onNotificationClick}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onOpenNotifications={onOpenNotifications}
        onContactSupport={onContactSupport}
        studioName={studioName}
      >
        {desktopContent}
      </DesktopShell>
    );
  }

  return (
    <MobileShell
      user={user}
      activeTab={activeMobileTab}
      onTabChange={(tab) => {
        if (onSelectMobileTab) {
          onSelectMobileTab(tab);
        }
      }}
      onOpenNotifications={onOpenNotifications || (() => {})}
      onOpenProfile={onOpenProfile}
      onChangePassword={onChangePassword}
      onLogout={onLogout}
      unreadCount={unreadCount}
    >
      {mobileContent}
    </MobileShell>
  );
};
