import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth, UserProfile, UserRole } from './context/AuthContext';
import { LoginPage } from './pages/Auth/LoginPage';
import { Shell } from './components/layout/Shell';
import { DocumentExplorer } from './pages/Vault/DocumentExplorer';
import { VerificationList, VerificationItem } from './pages/Verification/VerificationList';
import { MeetingCalendar } from './pages/Meetings/MeetingCalendar';
import { StaffAttendance } from './pages/Attendance/StaffAttendance';
import { PaymentLedger, PaymentRecord } from './pages/Payments/PaymentLedger';
import { ProjectChatRoom, ChatMessageItem } from './pages/Chat/ProjectChatRoom';
import { AnnouncementsPolicies } from './pages/Announcements/AnnouncementsPolicies';
import { StaffTargets } from './pages/Targets/StaffTargets';
import { FolderKanban, ArrowRight, UserPlus, RefreshCw, Smartphone, Monitor, ChevronLeft } from 'lucide-react';
import { AdminUserManagementModal } from './components/AdminUserManagementModal';
import { MobileShell } from './components/mobile/MobileShell';
import { MobileDashboard } from './components/mobile/MobileDashboard';
import { MobileProjectsView } from './components/mobile/MobileProjectsView';
import { MobileProjectDetailView } from './components/mobile/MobileProjectDetailView';
import { MobileDrawingFolderView, DrawingItem } from './components/mobile/MobileDrawingFolderView';
import { MobileDrawingSheetModal } from './components/mobile/MobileDrawingSheetModal';
import { MobileCreateProjectModal } from './components/mobile/MobileCreateProjectModal';
import { MobileNotificationsSheet } from './components/mobile/MobileNotificationsSheet';
import { MobileChangePasswordModal } from './components/mobile/MobileChangePasswordModal';
import { MobileMoreMenu } from './components/mobile/MobileMoreMenu';
import { MobileUserManagementView } from './components/mobile/MobileUserManagementView';
import { MobilePaymentView } from './components/mobile/MobilePaymentView';
import { MobileAnnouncementsView } from './components/mobile/MobileAnnouncementsView';
import { MobileRemindersView } from './components/mobile/MobileRemindersView';
import { MobileAttendanceView } from './components/mobile/MobileAttendanceView';
import { MobileTargetsView } from './components/mobile/MobileTargetsView';
import { MobileMeetingsView } from './components/mobile/MobileMeetingsView';
import { MobileDrawingVerificationView } from './components/mobile/MobileDrawingVerificationView';
import { MobileChatView } from './components/mobile/MobileChatView';
import { MobileSettingsView } from './components/mobile/MobileSettingsView';
import { useResponsive } from './hooks/useResponsive';
import { DesktopShell } from './components/desktop/DesktopShell';
import { DesktopDashboardView } from './components/desktop/DesktopDashboardView';
import { DesktopProjectsView } from './components/desktop/DesktopProjectsView';
import { DesktopMeetingsView } from './components/desktop/DesktopMeetingsView';
import { DesktopPaymentsView } from './components/desktop/DesktopPaymentsView';
import { DesktopVerificationView } from './components/desktop/DesktopVerificationView';
import { DesktopChatView, ProjectThread } from './components/desktop/DesktopChatView';
import { DesktopAttendanceView } from './components/desktop/DesktopAttendanceView';
import { DesktopTargetsView } from './components/desktop/DesktopTargetsView';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { PwaOfflineBanner } from './components/pwa/PwaOfflineBanner';
import { subscribeUserToPush } from './pwa/registerServiceWorker';


export interface ProjectSummary {
  id: string;
  projectCode: string;
  name: string;
  category: string;
  siteLocation: string;
  status: string;
  totalAgreedFee: number;
  advancePaymentReceived: number;
  allowClientDownloads: string;
  showPricingClientLeader: boolean;
  showPricingClientViewer: boolean;
  allowClientMeetings: boolean;
  documentCount: number;
  folderCount: number;
  completionPercentage: number;
  populatedFolders: number;
}

function MainApp() {
  const { user, token, logout, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // View mode switcher: Responsive (default), Mobile Phone (Figma <= 640px), or Desktop/Tablet Studio (> 640px)
  const [deviceView, setDeviceView] = useState<'responsive' | 'mobile' | 'desktop'>('responsive');
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = deviceView === 'mobile' || (deviceView === 'responsive' && windowWidth <= 640);

  // Mobile Navigation States (Figma: 5:2)
  const [mobileTab, setMobileTab] = useState<'home' | 'projects' | 'meetings' | 'more'>('home');
  const [mobileProjectStep, setMobileProjectStep] = useState<'list' | 'detail' | 'folder'>('list');
  const [mobileProjectViewMode, setMobileProjectViewMode] = useState<'grid' | 'list'>('list');
  const [activePhase, setActivePhase] = useState<'concept' | 'construction'>('concept');
  const [activeFolderName, setActiveFolderName] = useState<string>('Site Drawing');
  const [activeDrawing, setActiveDrawing] = useState<DrawingItem | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isMobileUserMgmtOpen, setIsMobileUserMgmtOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [mobileSubModule, setMobileSubModule] = useState<string | null>(null);


  // Active Project Context
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('AF-VILLA');

  // Real Database Collections
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);

  // Real Attendance Session State
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<string[]>([]);
  const unreadCount = 4;

  const getAuthHeaders = useCallback(() => {
    const roleSlug = user?.role ? user.role.toLowerCase() : 'admin';
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : `Bearer ${roleSlug}`,
    };
  }, [user?.role, token]);

  // Load Projects from Database
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (data.length > 0 && !data.some((p: ProjectSummary) => p.projectCode === selectedProjectCode)) {
          setSelectedProjectCode(data[0].projectCode);
        }
      }
    } catch (err) {
      console.error('Failed to load projects from DB', err);
    }
  }, [getAuthHeaders, selectedProjectCode]);

  // Load Verifications (Admin & Staff)
  const fetchVerifications = useCallback(async () => {
    if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') return;
    try {
      const res = await fetch('/api/verification/list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setVerifications(data);
      }
    } catch (err) {
      console.error('Failed to load verifications from DB', err);
    }
  }, [getAuthHeaders, user?.role]);

  // Load Payments for active project
  const fetchPayments = useCallback(async () => {
    if (user?.role === 'STAFF') return;
    try {
      const res = await fetch(`/api/payments/project/${selectedProjectCode}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (err) {
      console.error('Failed to load payments from DB', err);
    }
  }, [getAuthHeaders, user?.role, selectedProjectCode]);

  // Load Meetings for active project
  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetings?projectCode=${selectedProjectCode}`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error('Failed to load meetings from DB', err);
    }
  }, [getAuthHeaders, selectedProjectCode]);

  // Load Attendance Session (Staff)
  const fetchAttendance = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/status', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setIsClockedIn(Boolean(data.isClockedIn));
        setPendingUpdates(data.pendingUpdates || []);
      }
    } catch (err) {
      console.error('Failed to load attendance from DB', err);
    }
  }, [getAuthHeaders]);

  // Load Chat Messages for active project (Admin, Client Leader & Client Viewer)
  const fetchChat = useCallback(async () => {
    if (user?.role === 'STAFF') return;
    try {
      const res = await fetch(`/api/chat/projects/${selectedProjectCode}/messages`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error('Failed to load chat from DB', err);
    }
  }, [getAuthHeaders, user?.role, selectedProjectCode]);

  // Refresh all active module data
  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      fetchProjects(),
      fetchVerifications(),
      fetchPayments(),
      fetchMeetings(),
      fetchAttendance(),
      fetchChat(),
    ]);
    setIsRefreshing(false);
  }, [fetchProjects, fetchVerifications, fetchPayments, fetchMeetings, fetchAttendance, fetchChat]);

  // Fetch initial data on mount & register Web Push subscription
  useEffect(() => {
    if (user) {
      refreshAllData();
      const vapidKey = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY;
      if (vapidKey) {
        subscribeUserToPush(vapidKey, getAuthHeaders());
      }
    }
  }, [user, refreshAllData, getAuthHeaders]);

  // Dynamic Project Threads for Real-Time Consultation Chat
  const chatThreads: ProjectThread[] = useMemo(() => {
    if (!projects || projects.length === 0) return [];
    return projects.map((p) => ({
      id: p.id,
      projectCode: p.projectCode,
      projectName: p.name,
      clientName: (p as any).clientName || 'Client Representative',
      lastMessage: 'Tap to view live project channel',
      lastMessageTime: 'Active',
      unreadCount: 0,
    }));
  }, [projects]);

  // Refetch when switching project
  useEffect(() => {
    if (user && selectedProjectCode) {
      fetchPayments();
      fetchMeetings();
      fetchChat();
    }
  }, [selectedProjectCode, fetchPayments, fetchMeetings, fetchChat, user]);

  // Live polling for real-time consultation chat synchronization
  useEffect(() => {
    const isChatOpen = (activeTab === 'chats' || activeTab === 'chat' || mobileSubModule === 'chat');
    if (!isChatOpen || !user || !selectedProjectCode) return;

    fetchChat();
    const interval = setInterval(() => {
      fetchChat();
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTab, mobileSubModule, user, selectedProjectCode, fetchChat]);

  // Verification Approvals
  const handleApproveVerification = async (id: string) => {
    try {
      const res = await fetch(`/api/verification/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchVerifications();
        await fetchProjects();
      } else {
        const err = await res.json();
        alert(`Approval failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Approval failed', err);
    }
  };

  // Verification Revision Request
  const handleRequestRevision = async (id: string, notes: string) => {
    try {
      const res = await fetch(`/api/verification/${id}/revision`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        await fetchVerifications();
      } else {
        const err = await res.json();
        alert(`Revision request failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Revision request failed', err);
    }
  };

  // Payment Discrepancy Submission
  const handleDiscrepancySubmit = async (paymentId: string, note: string) => {
    try {
      const res = await fetch(`/api/payments/${paymentId}/discrepancy`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        await fetchPayments();
        alert('Discrepancy note registered. Studio accountant notified.');
      } else {
        const err = await res.json();
        alert(`Failed to submit discrepancy note: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Payment discrepancy error', err);
    }
  };

  // Send Chat Message (Supports optional attachment)
  const handleSendMessage = async (text: string, attachment?: { name: string; size: number; url: string }) => {
    try {
      const payload: any = { messageText: text || (attachment ? `[Attachment: ${attachment.name}]` : '') };
      if (attachment) {
        payload.attachmentKey = attachment.name;
      }
      const res = await fetch(`/api/chat/projects/${selectedProjectCode}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        await fetchChat();
      } else {
        const err = await res.json();
        alert(`Failed to send message: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Chat error', err);
    }
  };

  // Book Consultation Slot (with Atomic Collision Prevention)
  const handleBookSlot = async (slot: string, agenda: string, date: string) => {
    try {
      const res = await fetch('/api/meetings/request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectCode: selectedProjectCode,
          bookingDate: date,
          slot,
          agenda,
        }),
      });
      if (res.ok) {
        alert(`Consultation successfully booked for ${date} (${slot})!`);
        await fetchMeetings();
      } else {
        const err = await res.json();
        alert(`Booking rejected: ${err.error || 'Slot collision or not allowed'}`);
      }
    } catch (err) {
      console.error('Booking error', err);
    }
  };

  // Staff Clock-In (Mandatory GPS)
  const handleClockIn = async (coords: { lat: number; lng: number; address: string }) => {
    try {
      const res = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(coords),
      });
      if (res.ok) {
        await fetchAttendance();
      } else {
        const err = await res.json();
        alert(`Clock-in rejected: ${err.error || 'Validation error'}`);
      }
    } catch (err) {
      console.error('Clock-in error', err);
    }
  };

  // Staff Daily Work Update
  const handleDailyUpdate = async (slot: string, notes: string) => {
    try {
      const res = await fetch('/api/attendance/daily-update', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          scheduledSlot: slot,
          workSummary: notes,
        }),
      });
      if (res.ok) {
        alert(`Daily update submitted for ${slot}! Gate updated.`);
        await fetchAttendance();
      } else {
        const err = await res.json();
        alert(`Update rejected: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Update error', err);
    }
  };

  // Staff Clock-Out with Hard Gate Safeguard
  const handleClockOut = async () => {
    try {
      const res = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        alert('Session closed. Clocked out successfully!');
        await fetchAttendance();
      } else {
        const err = await res.json();
        alert(`CLOCK-OUT GATE BLOCKED: ${err.error || 'Pending daily work updates must be submitted first.'}`);
      }
    } catch (err) {
      console.error('Clock-out error', err);
    }
  };

  // If user is not authenticated, render Figma High-Fidelity Login Page
  if (!user) {
    return <LoginPage />;
  }

  const currentUser = user;

  // Active meeting and booked slots calculations
  const bookedSlots = meetings.map((m: any) => m.slotTime || m.slot);
  const activeMeeting = meetings.find((m: any) => m.status === 'CONFIRMED' || m.status === 'PENDING_APPROVAL');

  // -------------------------------------------------------------------------
  // FIGMA MOBILE PHONE EXPERIENCE (Matching Figma Node 5:2)
  // -------------------------------------------------------------------------
  if (isMobile) {
    const selectedProject = projects.find((p) => p.projectCode === selectedProjectCode) || projects[0] || {
      id: 'default',
      projectCode: selectedProjectCode,
      name: 'The Courtyard House',
      category: 'Architecture & Interior',
      siteLocation: 'Ahmedabad',
      status: 'ACTIVE',
      totalAgreedFee: 500000,
      advancePaymentReceived: 100000,
      allowClientDownloads: 'ALL_APPROVED',
      showPricingClientLeader: true,
      showPricingClientViewer: false,
      allowClientMeetings: true,
      documentCount: 60,
      folderCount: 16,
      completionPercentage: 98,
      populatedFolders: 16,
    };

    const isRealMobile = windowWidth <= 768;

    return (
      <div
        style={
          isRealMobile
            ? {
                backgroundColor: 'var(--figma-bg-mobile)',
                width: '100%',
                height: '100dvh',
                minHeight: '100dvh',
                maxHeight: '100dvh',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }
            : {
                backgroundColor: '#1A1D20',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 0',
                boxSizing: 'border-box',
              }
        }
      >
        {/* Device Mode Switcher Floating Pill (Desktop preview testing only) */}
        {!isRealMobile && (
          <div
            style={{
              position: 'fixed',
              top: '12px',
              right: '12px',
              zIndex: 1000,
              background: 'rgba(20, 24, 29, 0.95)',
              border: '1px solid #30363d',
              borderRadius: '20px',
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              color: '#c9d1d9',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <span style={{ color: '#BF935A', fontWeight: 700 }}>📱 Phone Preview</span>
            <button
              onClick={() => setDeviceView('desktop')}
              style={{
                background: '#21262d',
                color: '#8b949e',
                border: 'none',
                borderRadius: '12px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Desktop Mode
            </button>
          </div>
        )}

        <MobileShell
          user={currentUser}
          activeTab={mobileTab}
          onTabChange={(tab) => {
            setMobileTab(tab as any);
            setMobileSubModule(null);
            if (tab === 'projects') {
              setMobileProjectStep('list');
            }
          }}
          onRoleSwitch={(role) => switchRole(role)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenProfile={() => {
            setMobileTab('more');
            setMobileSubModule(null);
          }}
          onChangePassword={() => setIsChangePasswordOpen(true)}
          onLogout={logout}
        >
          {/* Full Admin Flow Mobile Modules (Figma: 5:2) */}
          {mobileSubModule ? (
            <>
              {mobileSubModule === 'verification' && (
                <MobileDrawingVerificationView
                  userRole={currentUser.role}
                  items={verifications}
                  onBack={() => setMobileSubModule(null)}
                  onApprove={handleApproveVerification}
                  onRequestRevision={handleRequestRevision}
                />
              )}

              {mobileSubModule === 'payments' && (
                <MobilePaymentView
                  userRole={currentUser.role}
                  showPricing={currentUser.showPricing ?? true}
                  payments={payments}
                  onBack={() => setMobileSubModule(null)}
                  onSubmitDiscrepancy={handleDiscrepancySubmit}
                  onRecordPayment={(rec) =>
                    setPayments((prev) => [
                      {
                        id: 'p-' + Date.now(),
                        milestoneTitle: rec.milestoneTitle || 'Milestone',
                        amount: rec.amount || 0,
                        paymentMode: rec.paymentMode || 'NEFT_RTGS',
                        status: 'PENDING_CLEARANCE',
                        referenceNumber: rec.referenceNumber,
                        createdAt: new Date().toISOString(),
                      },
                      ...prev,
                    ])
                  }
                />
              )}

              {(mobileSubModule === 'attendance' || mobileSubModule === 'updates') && (
                <MobileAttendanceView
                  userRole={currentUser.role}
                  isClockedIn={isClockedIn}
                  pendingUpdates={pendingUpdates}
                  onBack={() => setMobileSubModule(null)}
                  onClockIn={handleClockIn}
                  onClockOut={handleClockOut}
                  onSubmitUpdate={handleDailyUpdate}
                />
              )}

              {mobileSubModule === 'chat' && (
                <MobileChatView
                  projectCode={selectedProjectCode}
                  userRole={currentUser.role}
                  userName={currentUser.fullName}
                  messages={chatMessages}
                  availableProjects={projects}
                  onSelectProject={(code) => setSelectedProjectCode(code)}
                  onBack={() => setMobileSubModule(null)}
                  onSendMessage={handleSendMessage}
                />
              )}

              {mobileSubModule === 'vault' && (
                <div style={{ flex: 1, padding: '0 0 120px 0' }}>
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="figma-subpage-back" onClick={() => setMobileSubModule(null)}>
                      <ChevronLeft size={20} color="#0C0C0D" />
                    </button>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Document Vault</h3>
                  </div>
                  <DocumentExplorer
                    projectCode={selectedProjectCode}
                    userRole={currentUser.role}
                    clientName={currentUser.fullName}
                    userEmail={currentUser.email || 'client@studio.com'}
                  />
                </div>
              )}

              {mobileSubModule === 'targets' && (
                <MobileTargetsView
                  userRole={currentUser.role}
                  authHeaders={getAuthHeaders()}
                  projects={projects.map((p) => ({ id: p.id, projectCode: p.projectCode, name: p.name }))}
                  onBack={() => setMobileSubModule(null)}
                />
              )}

              {(mobileSubModule === 'announcement' ||
                mobileSubModule === 'policies' ||
                mobileSubModule === 'announcements') && (
                <MobileAnnouncementsView
                  userRole={currentUser.role}
                  authHeaders={getAuthHeaders()}
                  onBack={() => setMobileSubModule(null)}
                />
              )}

              {mobileSubModule === 'reminders' && (
                <MobileRemindersView
                  userRole={currentUser.role}
                  onBack={() => setMobileSubModule(null)}
                />
              )}
            </>
          ) : (
            <>
              {/* TAB 1: HOME (Figma: 71:9393, 20:2884, 21:3239) */}
              {mobileTab === 'home' && (
                <MobileDashboard
                  user={currentUser}
                  onNavigate={(viewId) => {
                    if (viewId === 'projects') {
                      setMobileTab('projects');
                      setMobileProjectStep('list');
                    } else if (viewId === 'meetings') {
                      setMobileTab('meetings');
                    } else if (['verification', 'payments', 'attendance', 'chat', 'vault', 'targets', 'announcement', 'policies', 'reminders', 'updates'].includes(viewId)) {
                      setMobileSubModule(viewId);
                    } else {
                      alert(`Studio Module: ${viewId} selected.`);
                    }
                  }}
                />
              )}

              {/* TAB 2: PROJECTS FLOW (Figma: 170:3265, 180:3845, 29:1034) */}
              {mobileTab === 'projects' && (
                <>
                  {mobileProjectStep === 'list' && (
                    <MobileProjectsView
                      projects={projects}
                      selectedProjectCode={selectedProjectCode}
                      onSelectProject={(code) => setSelectedProjectCode(code)}
                      onOpenProjectDetail={(code) => {
                        setSelectedProjectCode(code);
                        setMobileProjectStep('detail');
                      }}
                      canCreateProject={currentUser.role === 'ADMIN'}
                      onCreateProjectClick={() => setIsCreateProjectOpen(true)}
                      viewMode={mobileProjectViewMode}
                      onViewModeChange={setMobileProjectViewMode}
                    />
                  )}

                  {mobileProjectStep === 'detail' && (
                    <MobileProjectDetailView
                      project={selectedProject}
                      onBack={() => setMobileProjectStep('list')}
                      onSelectCategory={(phase, folderName) => {
                        setActivePhase(phase);
                        setActiveFolderName(folderName);
                        setMobileProjectStep('folder');
                      }}
                      viewMode={mobileProjectViewMode}
                      onViewModeChange={setMobileProjectViewMode}
                    />
                  )}

                  {mobileProjectStep === 'folder' && (
                    <MobileDrawingFolderView
                      projectName={selectedProject.name}
                      projectCode={selectedProject.projectCode}
                      phaseName={activePhase === 'concept' ? 'Concept Design' : 'Construction'}
                      folderName={activeFolderName}
                      authHeaders={getAuthHeaders()}
                      userRole={currentUser?.role}
                      onBack={() => setMobileProjectStep('detail')}
                      onNavigateProjects={() => setMobileProjectStep('list')}
                      onNavigateDetail={() => setMobileProjectStep('detail')}
                      onSelectDrawing={(drawing) => setActiveDrawing(drawing)}
                      viewMode={mobileProjectViewMode}
                      onViewModeChange={setMobileProjectViewMode}
                    />
                  )}
                </>
              )}

              {/* TAB 3: MEETINGS (Figma: 646:5911) */}
              {mobileTab === 'meetings' && (
                <MobileMeetingsView
                  userRole={currentUser.role}
                  onBack={() => setMobileTab('home')}
                />
              )}

              {/* TAB 4: MORE MENU (Figma: 55:2381) */}
              {mobileTab === 'more' && (
                <>
                  {isMobileUserMgmtOpen ? (
                    <MobileUserManagementView
                      onBack={() => setIsMobileUserMgmtOpen(false)}
                      onAddUserClick={() => setIsOnboardingOpen(true)}
                      authHeaders={getAuthHeaders()}
                    />
                  ) : (
                    <MobileMoreMenu
                      userRole={currentUser.role}
                      onOpenUserManagement={() => setIsMobileUserMgmtOpen(true)}
                      user={currentUser}
                      onChangePassword={() => setIsChangePasswordOpen(true)}
                      onLogout={logout}
                    />
                  )}
                </>
              )}
            </>
          )}
        </MobileShell>

        {/* Modals & Overlays */}
        <MobileNotificationsSheet
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          authHeaders={getAuthHeaders()}
        />

        <MobileChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          userName={currentUser.fullName}
          userRole={currentUser.role}
          authHeaders={getAuthHeaders()}
        />

        <MobileCreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={() => fetchProjects()}
          authHeaders={getAuthHeaders()}
        />

        <MobileDrawingSheetModal
          drawing={activeDrawing}
          onClose={() => setActiveDrawing(null)}
        />

        <AdminUserManagementModal
          isOpen={isOnboardingOpen}
          onClose={() => {
            setIsOnboardingOpen(false);
            fetchProjects();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Studio Header Action Bar */}
      <div
        style={{
          backgroundColor: '#161b22',
          borderBottom: '1px solid #30363d',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c9d1d9' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-gold)', fontWeight: 700 }}>
            {currentUser.role}
          </span>
          <span style={{ color: '#8b949e' }}>•</span>
          <strong style={{ color: '#f0f6fc' }}>{currentUser.fullName}</strong>
          <span style={{ color: '#8b949e', fontSize: '12px' }}>({currentUser.username || 'user'})</span>

          {/* Active Project Switcher */}
          {projects.length > 0 && (
            <div style={{ marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#8b949e', fontSize: '12px' }}>Active Project:</span>
              <select
                value={selectedProjectCode}
                onChange={(e) => setSelectedProjectCode(e.target.value)}
                style={{
                  backgroundColor: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: 'var(--accent-gold)',
                  padding: '3px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.projectCode}>
                    {p.projectCode} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Switch to Phone View Button */}
          <button
            onClick={() => setDeviceView('mobile')}
            title="Switch to Mobile Phone View (Figma Spec)"
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#352618',
              color: '#BF935A',
              border: '1px solid #BF935A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(191,147,90,0.2)',
            }}
          >
            <Smartphone size={14} />
            <span>📱 Phone View (Figma)</span>
          </button>

          <button
            onClick={refreshAllData}
            title="Refresh database records"
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: '#21262d',
              color: '#c9d1d9',
              border: '1px solid #30363d',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Sync DB</span>
          </button>


          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsOnboardingOpen(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#BF935A',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s',
              }}
            >
              <UserPlus size={14} />
              <span>+ Onboard Team & Clients</span>
            </button>
          )}

          <button
            onClick={logout}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#21262d',
              color: '#f87171',
              border: '1px solid #4b1a1a',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <AdminUserManagementModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          setIsOnboardingOpen(false);
          fetchProjects();
        }}
      />

      <DesktopShell
        user={currentUser}
        activeModule={activeTab}
        onSelectModule={(moduleId) => setActiveTab(moduleId)}
        onRoleSwitch={switchRole}
        onLogout={logout}
        onChangePassword={() => setIsChangePasswordOpen(true)}
        unreadCount={unreadCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
      >
        {activeTab === 'dashboard' && (
          <DesktopDashboardView
            user={currentUser}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNewProject={() => setIsCreateProjectOpen(true)}
            onOpenUpload={() => setActiveTab('projects')}
            onScheduleMeeting={() => setActiveTab('meetings')}
            onPunchAttendance={() => setActiveTab('attendance')}
          />
        )}

        {activeTab === 'projects' && (
          <DesktopProjectsView
            projectCode={selectedProjectCode}
            userRole={currentUser.role}
            projectName={projects.find((p) => p.projectCode === selectedProjectCode)?.name}
            onOpenUpload={() => {}}
          />
        )}

        {activeTab === 'meetings' && (
          <DesktopMeetingsView
            userRole={currentUser.role}
            projectCode={selectedProjectCode}
          />
        )}

        {activeTab === 'payments' && (
          <DesktopPaymentsView
            userRole={currentUser.role}
            showPricing={currentUser.showPricing ?? true}
            projectCode={selectedProjectCode}
            onSubmitDiscrepancy={handleDiscrepancySubmit}
          />
        )}

        {activeTab === 'verification' && (
          <DesktopVerificationView
            userRole={currentUser.role}
            projectCode={selectedProjectCode}
            onApprove={(id) => handleApproveVerification(id)}
            onRequestRevision={(id, notes) => handleRequestRevision(id, notes)}
          />
        )}

        {activeTab === 'attendance' && (
          <DesktopAttendanceView
            user={currentUser}
            isClockedIn={isClockedIn}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onSubmitDailyUpdate={handleDailyUpdate}
          />
        )}

        {activeTab === 'targets' && (
          <DesktopTargetsView
            user={currentUser}
          />
        )}

        {activeTab === 'updates' && (
          <DesktopAttendanceView
            user={currentUser}
            isClockedIn={isClockedIn}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onSubmitDailyUpdate={handleDailyUpdate}
          />
        )}

        {(activeTab === 'chats' || activeTab === 'chat') && (
          <DesktopChatView
            user={currentUser}
            threads={chatThreads.length > 0 ? chatThreads : undefined}
            activeProjectCode={selectedProjectCode}
            messages={chatMessages}
            onSelectThread={(code) => setSelectedProjectCode(code)}
            onSendMessage={handleSendMessage}
          />
        )}

        {activeTab === 'announcements' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
            <AnnouncementsPolicies
              userRole={currentUser.role}
              authHeaders={getAuthHeaders()}
            />
          </div>
        )}

        {activeTab === 'policies' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
            <AnnouncementsPolicies
              userRole={currentUser.role}
              authHeaders={getAuthHeaders()}
            />
          </div>
        )}

        {activeTab === 'reminders' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
            <MobileRemindersView
              userRole={currentUser.role}
              onBack={() => setActiveTab('dashboard')}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
            <MobileSettingsView
              userRole={currentUser.role}
              theme="light"
              onToggleTheme={() => {}}
              onBack={() => setActiveTab('dashboard')}
            />
          </div>
        )}
      </DesktopShell>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <PwaOfflineBanner />
      <PwaInstallPrompt />
      <MainApp />
    </AuthProvider>
  );
}

export default App;
