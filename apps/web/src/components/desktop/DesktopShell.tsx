import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { DesktopSidebar } from './DesktopSidebar';
import { DesktopTopNav } from './DesktopTopNav';
import './desktop.css';

export interface DesktopShellProps {
  user: {
    fullName: string;
    role: UserRole;
    showPricing?: boolean;
    allowMeetings?: boolean;
    email?: string;
  };
  activeModule?: string;
  onSelectModule?: (moduleId: string) => void;
  onRoleSwitch?: (role: UserRole) => void;
  onLogout?: () => void;
  onChangePassword?: () => void;
  unreadCount?: number;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onOpenNotifications?: () => void;
  studioName?: string;
  children: React.ReactNode;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({
  user,
  activeModule = 'dashboard',
  onSelectModule,
  onRoleSwitch,
  onLogout,
  onChangePassword,
  unreadCount = 0,
  searchValue = '',
  onSearchChange,
  onOpenNotifications,
  studioName = 'A&F Design',
  children,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="desktop-shell-root" data-testid="desktop-shell-root">
      {/* Persistent / Collapsible Architectural Sidebar */}
      <DesktopSidebar
        user={user}
        activeModule={activeModule}
        onSelectModule={onSelectModule}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        studioName={studioName}
      />

      {/* Main Wrapper with TopNav and 4K-Safe Viewport */}
      <div className="desktop-main-wrapper" data-testid="desktop-main-wrapper">
        <DesktopTopNav
          user={user}
          unreadCount={unreadCount}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          onOpenNotifications={onOpenNotifications}
          onRoleSwitch={onRoleSwitch}
          onChangePassword={onChangePassword}
          onLogout={onLogout}
        />

        {/* Responsive Viewport with Custom Scrollbar & 4K Safe Max-Width */}
        <main className="desktop-viewport" data-testid="desktop-viewport">
          <div className="desktop-canvas-container" data-testid="desktop-canvas-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
