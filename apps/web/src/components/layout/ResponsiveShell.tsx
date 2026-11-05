import React from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import { UserRole } from '../../context/AuthContext';
import { DesktopShell } from '../desktop/DesktopShell';
import { MobileShell } from '../mobile/MobileShell';

export interface ResponsiveShellProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
    email?: string;
  };
  forceView?: 'responsive' | 'mobile' | 'desktop';
  activeDesktopModule?: string;
  onSelectDesktopModule?: (moduleId: string) => void;
  activeMobileTab?: 'home' | 'projects' | 'meetings' | 'more';
  onSelectMobileTab?: (tab: 'home' | 'projects' | 'meetings' | 'more') => void;
  onRoleSwitch?: (role: UserRole) => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  unreadCount?: number;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onOpenNotifications?: () => void;
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
  onRoleSwitch,
  onLogout,
  onChangePassword,
  unreadCount = 0,
  searchValue = '',
  onSearchChange,
  onOpenNotifications,
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
        onRoleSwitch={onRoleSwitch}
        onLogout={onLogout}
        onChangePassword={onChangePassword}
        unreadCount={unreadCount}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onOpenNotifications={onOpenNotifications}
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
          onSelectMobileTab(tab as 'home' | 'projects' | 'meetings' | 'more');
        }
      }}
      onOpenNotifications={onOpenNotifications || (() => {})}
      onRoleSwitch={onRoleSwitch}
      onChangePassword={onChangePassword}
      onLogout={onLogout}
    >
      {mobileContent}
    </MobileShell>
  );
};
