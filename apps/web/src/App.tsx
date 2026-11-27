import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth, UserRole } from './context/AuthContext';
import { LoginPage } from './pages/Auth/LoginPage';
import { ResponsiveShell } from './components/layout/ResponsiveShell';
import { InAppNotificationItem } from './components/layout/Shell';

// Desktop Components (Figma: 0:1)
import { DesktopDashboardView } from './components/desktop/DesktopDashboardView';
import { DesktopProjectsView } from './components/desktop/DesktopProjectsView';
import { DesktopProgressReportView } from './components/desktop/DesktopProgressReportView';
import { DesktopMeetingsView, ScheduledMeeting } from './components/desktop/DesktopMeetingsView';
import { DesktopPaymentsView } from './components/desktop/DesktopPaymentsView';
import { DesktopVerificationView, VerificationItem } from './components/desktop/DesktopVerificationView';
import { DesktopAttendanceView } from './components/desktop/DesktopAttendanceView';
import { DesktopTargetsView } from './components/desktop/DesktopTargetsView';
import { DesktopChatView, ChatMessageItem } from './components/desktop/DesktopChatView';
import { DesktopRemindersView } from './components/desktop/DesktopRemindersView';
import { DesktopSettingsView, GovernanceTab } from './components/desktop/DesktopSettingsView';
import { AnnouncementsPolicies } from './pages/Announcements/AnnouncementsPolicies';

// Mobile Components (Figma: 5:2)
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
import { MobileMeetingsView } from './components/mobile/MobileMeetingsView';
import { MobilePaymentView } from './components/mobile/MobilePaymentView';
import { MobileDrawingVerificationView } from './components/mobile/MobileDrawingVerificationView';
import { MobileAttendanceView } from './components/mobile/MobileAttendanceView';
import { MobileChatView } from './components/mobile/MobileChatView';
import { MobileAnnouncementsView } from './components/mobile/MobileAnnouncementsView';
import { MobileTargetsView } from './components/mobile/MobileTargetsView';
import { MobileRemindersView } from './components/mobile/MobileRemindersView';
import { MobileProgressReportView } from './components/mobile/MobileProgressReportView';
import { MobileDeviceApprovalsView } from './components/mobile/MobileDeviceApprovalsView';
import { MobileActivityLogView } from './components/mobile/MobileActivityLogView';
import { MobileSettingsView } from './components/mobile/MobileSettingsView';
import { MobileProfileView } from './components/mobile/MobileProfileView';
import { MobileAboutAppView } from './components/mobile/MobileAboutAppView';
import { MobileHelpSupportView } from './components/mobile/MobileHelpSupportView';

// Modals & PWA
import { AdminUserManagementModal } from './components/AdminUserManagementModal';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { PwaOfflineBanner } from './components/pwa/PwaOfflineBanner';
import { subscribeUserToPush } from './pwa/registerServiceWorker';
import { io, Socket } from 'socket.io-client';

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

export interface PaymentRecord {
  id: string;
  projectId?: string;
  projectCode: string;
  projectName?: string;
  milestoneTitle: string;
  amount: number;
  paymentMode: 'CHEQUE' | 'UPI' | 'NEFT_RTGS' | 'CASH';
  status: 'PENDING_CLEARANCE' | 'CONFIRMED';
  referenceNumber?: string;
  bankName?: string;
  recordedBy?: string;
  discrepancyNote?: string;
  createdAt: string;
}

function MainApp() {
  const { user, token, logout } = useAuth();

  // Navigation State
  const [activeDesktopModule, setActiveDesktopModule] = useState<string>('dashboard');
  const [desktopSettingsTab, setDesktopSettingsTab] = useState<GovernanceTab>('users');
  const [desktopAnnouncementsTab, setDesktopAnnouncementsTab] = useState<'announcements' | 'policies'>('announcements');
  const [desktopAttendanceMode, setDesktopAttendanceMode] = useState<'attendance' | 'updates'>('attendance');

  // Mobile Navigation State
  const [mobileTab, setMobileTab] = useState<string>('home');
  const [mobileSubModule, setMobileSubModule] = useState<string | null>(null);
  const [mobileProjectStep, setMobileProjectStep] = useState<'list' | 'detail' | 'folder' | 'progress'>('list');
  const [mobileProjectViewMode, setMobileProjectViewMode] = useState<'grid' | 'list'>('list');
  const [activePhase, setActivePhase] = useState<'concept' | 'construction' | 'other'>('concept');
  const [activeFolderName, setActiveFolderName] = useState<string>('01 Site Drawings & Topographic Layout');
  const [activeDrawing, setActiveDrawing] = useState<DrawingItem | null>(null);

  // Global UI State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Live Database Collections
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>('AF-VILLA');
  const [verifications, setVerifications] = useState<VerificationItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [attendanceStatus, setAttendanceStatus] = useState<any>(null);
  const [targets, setTargets] = useState<any[]>([]);
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  const [policiesCount, setPoliciesCount] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);

  const socketRef = useRef<Socket | null>(null);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  // Fetch Projects
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
          if (data.length > 0 && !data.some((p: ProjectSummary) => p.projectCode === selectedProjectCode)) {
            setSelectedProjectCode(data[0].projectCode);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  }, [getAuthHeaders, selectedProjectCode]);

  // Fetch Verifications
  const fetchVerifications = useCallback(async () => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) return;
    try {
      const res = await fetch('/api/verification/list', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setVerifications(data);
      }
    } catch (err) {
      console.error('Failed to load verifications', err);
    }
  }, [getAuthHeaders, user]);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    if (!user || user.role === 'STAFF') return;
    try {
      const url = user.role === 'ADMIN'
        ? '/api/payments'
        : `/api/payments/project/${encodeURIComponent(selectedProjectCode)}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setPayments(data);
      }
    } catch (err) {
      console.error('Failed to load payments', err);
    }
  }, [getAuthHeaders, user, selectedProjectCode]);

  // Fetch Meetings
  const fetchMeetings = useCallback(async () => {
    if (!user || user.role === 'STAFF' || user.role === 'CLIENT_VIEWER') return;
    try {
      const url = user.role === 'ADMIN'
        ? '/api/meetings'
        : `/api/meetings?projectCode=${encodeURIComponent(selectedProjectCode)}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMeetings(data);
      }
    } catch (err) {
      console.error('Failed to load meetings', err);
    }
  }, [getAuthHeaders, user, selectedProjectCode]);

  // Fetch Attendance
  const fetchAttendance = useCallback(async () => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) return;
    try {
      const res = await fetch('/api/attendance/status', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAttendanceStatus(data);
      }
    } catch (err) {
      console.error('Failed to load attendance status', err);
    }
  }, [getAuthHeaders, user]);

  // Fetch Targets
  const fetchTargets = useCallback(async () => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) return;
    try {
      const res = await fetch('/api/targets', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTargets(data);
      }
    } catch (err) {
      console.error('Failed to load targets', err);
    }
  }, [getAuthHeaders, user]);

  // Fetch Chat Messages
  const fetchChat = useCallback(async () => {
    if (!user || user.role === 'STAFF' || user.role === 'CLIENT_VIEWER' || !selectedProjectCode) return;
    try {
      const res = await fetch(`/api/chat/projects/${encodeURIComponent(selectedProjectCode)}/messages`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setChatMessages(data);
      }
    } catch (err) {
      console.error('Failed to load chat messages', err);
    }
  }, [getAuthHeaders, user, selectedProjectCode]);

  // Fetch Notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data.notifications) ? data.notifications : Array.isArray(data) ? data : [];
        setNotifications(list);
        setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : list.filter((n: any) => !n.isRead).length);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }, [getAuthHeaders, user]);

  // Fetch Counts for Bento & Sidebar
  const fetchCounts = useCallback(async () => {
    if (!user) return;
    try {
      const [annRes, polRes, remRes] = await Promise.allSettled([
        fetch('/api/announcements', { headers: getAuthHeaders() }),
        fetch('/api/policies', { headers: getAuthHeaders() }),
        user.role === 'ADMIN' ? fetch('/api/reminders', { headers: getAuthHeaders() }) : Promise.resolve(null),
      ]);
      if (annRes.status === 'fulfilled' && annRes.value && annRes.value.ok) {
        const d = await annRes.value.json();
        if (Array.isArray(d)) setAnnouncementsCount(d.length);
      }
      if (polRes.status === 'fulfilled' && polRes.value && polRes.value.ok) {
        const d = await polRes.value.json();
        if (Array.isArray(d)) setPoliciesCount(d.length);
      }
      if (remRes.status === 'fulfilled' && remRes.value && remRes.value.ok) {
        const d = await remRes.value.json();
        if (Array.isArray(d)) setRemindersCount(d.length);
      }
    } catch {}
  }, [getAuthHeaders, user]);

  // Master Initial Load
  const refreshAllData = useCallback(async () => {
    await Promise.allSettled([
      fetchProjects(),
      fetchVerifications(),
      fetchPayments(),
      fetchMeetings(),
      fetchAttendance(),
      fetchTargets(),
      fetchChat(),
      fetchNotifications(),
      fetchCounts(),
    ]);
  }, [fetchProjects, fetchVerifications, fetchPayments, fetchMeetings, fetchAttendance, fetchTargets, fetchChat, fetchNotifications, fetchCounts]);

  useEffect(() => {
    if (user && token) {
      refreshAllData();
    }
  }, [user?.id, token]);

  // Real-time Socket.io Gateway Setup
  useEffect(() => {
    if (!user || !token) return;

    try {
      const socket = io({
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      if (selectedProjectCode) {
        socket.emit('join:project', { projectCode: selectedProjectCode });
      }

      socket.on('chat:message', (newMsg: ChatMessageItem) => {
        setChatMessages((prev) => [...prev, newMsg]);
      });

      socket.on('notification:new', (notif: InAppNotificationItem) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((c) => c + 1);
      });

      // Subscribe to Web Push if VAPID key is configured
      fetch('/api/notifications/vapid-public-key', { headers: getAuthHeaders() })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.publicKey) {
            subscribeUserToPush(data.publicKey, getAuthHeaders()).catch(() => {});
          }
        })
        .catch(() => {});

      return () => {
        socket.disconnect();
      };
    } catch (e) {
      console.warn('Socket connection skipped:', e);
    }
  }, [user?.id, token, selectedProjectCode, getAuthHeaders]);

  // Notifications handlers
  const handleMarkAllNotificationsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.error('Failed to mark notifications read', err);
    }
  };

  const handleNotificationClick = async (notif: InAppNotificationItem) => {
    try {
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => {});

      if (notif.category === 'MEETING' || notif.deepLink === '/meetings') {
        setActiveDesktopModule('meetings');
        setMobileTab('meetings');
        setMobileSubModule(null);
      } else if (notif.category === 'PAYMENT') {
        setActiveDesktopModule('payments');
        setMobileSubModule('payments');
      } else if (notif.category === 'VERIFICATION') {
        setActiveDesktopModule('verification');
        setMobileSubModule('verification');
      }
    } catch (err) {
      console.error('Notification click handler error', err);
    }
  };

  // Chat message sender
  const handleSendChatMessage = async (payload: { text: string; attachmentUrl?: string; attachmentName?: string }) => {
    if (!selectedProjectCode) return;
    try {
      const res = await fetch(`/api/chat/projects/${encodeURIComponent(selectedProjectCode)}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messageText: payload.text,
          attachmentKey: payload.attachmentUrl,
          attachmentName: payload.attachmentName,
        }),
      });
      if (res.ok) {
        await fetchChat();
      }
    } catch (err) {
      console.error('Failed to send chat message', err);
    }
  };

  if (!user) {
    return <LoginPage />;
  }

  const selectedProject = projects.find((p) => p.projectCode === selectedProjectCode) || projects[0] || {
    id: '',
    projectCode: selectedProjectCode || '',
    name: '',
    category: '',
    siteLocation: '',
    status: 'ACTIVE',
    totalAgreedFee: 0,
    advancePaymentReceived: 0,
    allowClientDownloads: 'ALL_APPROVED',
    showPricingClientLeader: false,
    showPricingClientViewer: false,
    allowClientMeetings: true,
    documentCount: 0,
    folderCount: 16,
    completionPercentage: 0,
    populatedFolders: 0,
  };

  // Filtered collections based on global search
  const filteredProjects = globalSearch
    ? projects.filter((p) => p.name.toLowerCase().includes(globalSearch.toLowerCase()) || p.projectCode.toLowerCase().includes(globalSearch.toLowerCase()))
    : projects;

  // ---------------------------------------------------------------------------
  // DESKTOP CONTENT VIEW
  // ---------------------------------------------------------------------------
  const desktopContent = (
    <div style={{ minHeight: '100%', boxSizing: 'border-box' }}>
      {activeDesktopModule === 'dashboard' && (
        <DesktopDashboardView
          user={user}
          projects={projects}
          meetings={meetings}
          verifications={verifications}
          payments={payments}
          announcementsCount={announcementsCount}
          policiesCount={policiesCount}
          targets={targets}
          attendanceStatus={attendanceStatus}
          remindersCount={remindersCount}
          unreadNotificationsCount={unreadCount}
          onNavigateTab={(tab) => {
            if (tab === 'policies') {
              setActiveDesktopModule('policies');
              setDesktopAnnouncementsTab('policies');
            } else if (tab === 'announcements') {
              setActiveDesktopModule('announcements');
              setDesktopAnnouncementsTab('announcements');
            } else if (tab === 'updates') {
              setActiveDesktopModule('updates');
              setDesktopAttendanceMode('updates');
            } else {
              setActiveDesktopModule(tab);
            }
          }}
          onOpenNewProject={() => setIsCreateProjectOpen(true)}
          onOpenUpload={() => setActiveDesktopModule('projects')}
          onScheduleMeeting={() => setActiveDesktopModule('meetings')}
          onPunchAttendance={() => {
            setActiveDesktopModule('attendance');
            setDesktopAttendanceMode('attendance');
          }}
        />
      )}

      {activeDesktopModule === 'projects' && (
        <DesktopProjectsView
          userRole={user.role}
          projects={filteredProjects}
          selectedProjectCode={selectedProjectCode}
          onSelectProject={(code) => setSelectedProjectCode(code)}
          onCreateProject={() => setIsCreateProjectOpen(true)}
          onRefreshProjects={fetchProjects}
          onNavigateProgress={() => setActiveDesktopModule('progress')}
          authHeaders={getAuthHeaders()}
        />
      )}

      {activeDesktopModule === 'progress' && (
        <DesktopProgressReportView
          userRole={user.role}
          projects={projects}
          selectedProjectCode={selectedProjectCode}
          onSelectProject={(code) => setSelectedProjectCode(code)}
          onOpenVault={() => setActiveDesktopModule('projects')}
          authHeaders={getAuthHeaders()}
        />
      )}

      {activeDesktopModule === 'meetings' && (
        <DesktopMeetingsView
          userRole={user.role}
          userName={user.fullName}
          projectCode={selectedProjectCode}
          projects={projects}
          meetings={meetings}
          allowMeetings={user.allowMeetings}
          getAuthHeaders={getAuthHeaders}
          onRefresh={fetchMeetings}
          onArrangeMeeting={async (data) => {
            await fetch('/api/meetings/request', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(data),
            });
            await fetchMeetings();
          }}
          onRequestMeeting={async (data) => {
            await fetch('/api/meetings/request', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(data),
            });
            await fetchMeetings();
          }}
          onRescheduleMeeting={async (id, payload) => {
            await fetch(`/api/meetings/${id}/reschedule`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
            await fetchMeetings();
          }}
          onApproveMeeting={async (id) => {
            await fetch(`/api/meetings/${id}/approve`, {
              method: 'POST',
              headers: getAuthHeaders(),
            });
            await fetchMeetings();
          }}
          onRejectMeeting={async (id, reason) => {
            await fetch(`/api/meetings/${id}/reject`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ reason }),
            });
            await fetchMeetings();
          }}
          onCancelMeeting={async (id) => {
            await fetch(`/api/meetings/${id}/cancel`, {
              method: 'POST',
              headers: getAuthHeaders(),
            });
            await fetchMeetings();
          }}
          onRsvpMeeting={async (id, rsvp) => {
            await fetch(`/api/meetings/${id}/rsvp`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ rsvp }),
            });
            await fetchMeetings();
            await fetchNotifications();
          }}
        />
      )}

      {activeDesktopModule === 'payments' && (
        <DesktopPaymentsView
          userRole={user.role}
          showPricing={user.showPricing}
          projects={projects}
          selectedProjectCode={selectedProjectCode}
          onSelectProjectCode={setSelectedProjectCode}
          payments={payments}
          getAuthHeaders={getAuthHeaders}
          onRefresh={fetchPayments}
          onCreatePayment={async (payload) => {
            await fetch('/api/payments', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
            await fetchPayments();
          }}
          onEditPayment={async (id, payload) => {
            await fetch(`/api/payments/${id}`, {
              method: 'PATCH',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
            await fetchPayments();
          }}
          onSubmitDiscrepancy={async (id, note) => {
            await fetch(`/api/payments/${id}/discrepancy`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ note }),
            });
            await fetchPayments();
          }}
        />
      )}

      {activeDesktopModule === 'verification' && (
        <DesktopVerificationView
          userRole={user.role}
          projectCode={selectedProjectCode}
          projects={projects}
          items={verifications}
          getAuthHeaders={getAuthHeaders}
          onRefresh={fetchVerifications}
          onApprove={async (id, notes) => {
            await fetch(`/api/verification/${id}/approve`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ notes }),
            });
            await fetchVerifications();
          }}
          onRequestRevision={async (id, notes) => {
            await fetch(`/api/verification/${id}/revision`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({ notes }),
            });
            await fetchVerifications();
          }}
          onSubmitVerification={async (payload) => {
            await fetch('/api/verification/submit', {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify(payload),
            });
            await fetchVerifications();
          }}
        />
      )}

      {(activeDesktopModule === 'attendance' || activeDesktopModule === 'updates') && (
        <DesktopAttendanceView
          userRole={user.role}
          userName={user.fullName}
          mode={activeDesktopModule === 'updates' ? 'updates' : 'attendance'}
          projects={projects}
          attendanceStatus={attendanceStatus}
          getAuthHeaders={getAuthHeaders}
          onClockInSuccess={fetchAttendance}
          onClockOutSuccess={fetchAttendance}
          onDailyUpdateSuccess={fetchAttendance}
        />
      )}

      {activeDesktopModule === 'targets' && (
        <DesktopTargetsView
          userRole={user.role}
          projects={projects}
          targets={targets}
          getAuthHeaders={getAuthHeaders}
          onRefresh={fetchTargets}
        />
      )}

      {activeDesktopModule === 'announcements' && (
        <AnnouncementsPolicies
          userRole={user.role}
          authHeaders={getAuthHeaders()}
          initialSection="announcements"
        />
      )}

      {activeDesktopModule === 'policies' && (
        <AnnouncementsPolicies
          userRole={user.role}
          authHeaders={getAuthHeaders()}
          initialSection="policies"
        />
      )}

      {activeDesktopModule === 'chats' && (
        <DesktopChatView
          user={user}
          projects={projects}
          activeProjectCode={selectedProjectCode}
          messages={chatMessages}
          onSelectThread={(code) => setSelectedProjectCode(code)}
          onSendMessage={handleSendChatMessage}
          getAuthHeaders={getAuthHeaders}
        />
      )}

      {activeDesktopModule === 'reminders' && (
        <DesktopRemindersView
          userRole={user.role}
          projects={projects}
          getAuthHeaders={getAuthHeaders}
          onRefreshCounts={fetchCounts}
        />
      )}

      {activeDesktopModule === 'settings' && (
        <DesktopSettingsView
          userRole={user.role}
          projects={projects}
          initialTab={desktopSettingsTab}
          getAuthHeaders={getAuthHeaders}
          onProjectsRefresh={fetchProjects}
        />
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // MOBILE CONTENT VIEW
  // ---------------------------------------------------------------------------
  const mobileContent = (
    <div>
      {/* Sub-module overlay from action grid or drawer */}
      {mobileSubModule ? (
        <div>
          {mobileSubModule === 'verification' && (
            <MobileDrawingVerificationView
              userRole={user.role}
              items={verifications}
              projects={projects}
              projectCode={selectedProjectCode}
              authHeaders={getAuthHeaders()}
              onApprove={async (id) => {
                await fetch(`/api/verification/${id}/approve`, { method: 'POST', headers: getAuthHeaders() });
                await fetchVerifications();
              }}
              onRequestRevision={async (id, notes) => {
                await fetch(`/api/verification/${id}/revision`, {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ notes }),
                });
                await fetchVerifications();
              }}
              onSubmitVerification={async (payload) => {
                await fetch('/api/verification/submit', {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify(payload),
                });
                await fetchVerifications();
              }}
              onRefresh={fetchVerifications}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'payments' && (
            <MobilePaymentView
              userRole={user.role}
              showPricing={user.showPricing}
              projects={projects}
              selectedProjectCode={selectedProjectCode}
              onSelectProjectCode={setSelectedProjectCode}
              payments={payments}
              authHeaders={getAuthHeaders()}
              onCreatePayment={async (p) => {
                await fetch('/api/payments', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(p) });
                await fetchPayments();
              }}
              onSubmitDiscrepancy={async (id, note) => {
                await fetch(`/api/payments/${id}/discrepancy`, {
                  method: 'POST',
                  headers: getAuthHeaders(),
                  body: JSON.stringify({ note }),
                });
                await fetchPayments();
              }}
              onRefresh={fetchPayments}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'attendance' && (
            <MobileAttendanceView
              userRole={user.role}
              userFullName={user.fullName}
              mode={desktopAttendanceMode}
              projects={projects}
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'chat' && (
            <MobileChatView
              userRole={user.role}
              userName={user.fullName}
              projectCode={selectedProjectCode}
              projectName={selectedProject.name}
              availableProjects={projects}
              messages={chatMessages}
              authHeaders={getAuthHeaders()}
              onSelectProject={setSelectedProjectCode}
              onSendMessage={async (t, u, n) => {
                await handleSendChatMessage({ text: t, attachmentUrl: u, attachmentName: n });
              }}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'announcements' && (
            <MobileAnnouncementsView
              userRole={user.role}
              initialTab="announcements"
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'policies' && (
            <MobileAnnouncementsView
              userRole={user.role}
              initialTab="policies"
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'targets' && (
            <MobileTargetsView
              userRole={user.role}
              projects={projects}
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'reminders' && (
            <MobileRemindersView
              userRole={user.role}
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'progress' && (
            <MobileProgressReportView
              userRole={user.role}
              projects={projects}
              selectedProjectCode={selectedProjectCode}
              onSelectProjectCode={setSelectedProjectCode}
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'users' && (
            <MobileUserManagementView
              onBack={() => setMobileSubModule(null)}
              onAddUserClick={() => setIsOnboardingOpen(true)}
              authHeaders={getAuthHeaders()}
            />
          )}

          {mobileSubModule === 'activity' && (
            <MobileActivityLogView
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'devices' && (
            <MobileDeviceApprovalsView
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'settings' && (
            <MobileSettingsView
              userRole={user.role}
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'profile' && (
            <MobileProfileView
              user={user}
              projects={projects}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onLogout={logout}
              onBack={() => setMobileSubModule(null)}
            />
          )}

          {mobileSubModule === 'about' && (
            <MobileAboutAppView onBack={() => setMobileSubModule(null)} />
          )}

          {mobileSubModule === 'support' && (
            <MobileHelpSupportView onBack={() => setMobileSubModule(null)} />
          )}
        </div>
      ) : (
        <>
          {/* TAB 1: HOME */}
          {mobileTab === 'home' && (
            <MobileDashboard
              user={user}
              onNavigate={(tabKey) => {
                if (tabKey === 'projects') {
                  setMobileTab('projects');
                  setMobileProjectStep('list');
                } else if (tabKey === 'meetings') {
                  setMobileTab('meetings');
                } else if (tabKey === 'attendance') {
                  setMobileTab('attendance');
                } else {
                  setMobileSubModule(tabKey);
                }
              }}
            />
          )}

          {/* TAB 2: PROJECTS */}
          {mobileTab === 'projects' && (
            <>
              {mobileProjectStep === 'list' && (
                <MobileProjectsView
                  projects={projects}
                  selectedProjectCode={selectedProjectCode}
                  onSelectProject={(proj) => setSelectedProjectCode(proj.projectCode)}
                  onOpenProjectDetail={(code) => {
                    setSelectedProjectCode(code);
                    setMobileProjectStep('detail');
                  }}
                  canCreateProject={user.role === 'ADMIN'}
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
                  phaseName={activePhase === 'concept' ? 'Concept Design' : activePhase === 'construction' ? 'Construction Drawings' : 'Other Reference'}
                  folderName={activeFolderName}
                  onBack={() => setMobileProjectStep('detail')}
                  onNavigateProjects={() => setMobileProjectStep('list')}
                  onNavigateDetail={() => setMobileProjectStep('detail')}
                  onSelectDrawing={(drawing) => setActiveDrawing(drawing)}
                  userRole={user.role}
                  allowClientDownloads={selectedProject.allowClientDownloads}
                  authHeaders={getAuthHeaders()}
                  viewMode={mobileProjectViewMode}
                  onViewModeChange={setMobileProjectViewMode}
                />
              )}
            </>
          )}

          {/* TAB 3: MEETINGS */}
          {mobileTab === 'meetings' && (
            <MobileMeetingsView
              userRole={user.role}
              userFullName={user.fullName}
              allowMeetings={user.allowMeetings}
              projects={projects}
              meetings={meetings as any}
              selectedProjectCode={selectedProjectCode}
              authHeaders={getAuthHeaders()}
              onRefresh={fetchMeetings}
              onBack={() => setMobileTab('home')}
            />
          )}

          {/* TAB 4: ATTENDANCE (STAFF ONLY) */}
          {mobileTab === 'attendance' && (
            <MobileAttendanceView
              userRole={user.role}
              userFullName={user.fullName}
              mode="attendance"
              projects={projects}
              authHeaders={getAuthHeaders()}
              onBack={() => setMobileTab('home')}
            />
          )}

          {/* TAB 5: MORE MENU */}
          {mobileTab === 'more' && (
            <MobileMoreMenu
              user={user}
              userRole={user.role}
              projects={projects}
              authHeaders={getAuthHeaders()}
              onOpenUserManagement={() => setMobileSubModule('users')}
              onOpenProfile={() => setMobileSubModule('profile')}
              onChangePassword={() => setIsChangePasswordOpen(true)}
              onNavigateTab={(tabKey) => setMobileSubModule(tabKey)}
              onLogout={logout}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <div>
      <ResponsiveShell
        user={user}
        activeDesktopModule={activeDesktopModule}
        onSelectDesktopModule={(mod, subTab) => {
          setActiveDesktopModule(mod);
          if (mod === 'settings' && subTab) {
            setDesktopSettingsTab(subTab as GovernanceTab);
          }
        }}
        activeMobileTab={mobileTab}
        onSelectMobileTab={(tab) => {
          setMobileTab(tab);
          setMobileSubModule(null);
          if (tab === 'projects') setMobileProjectStep('list');
        }}
        onLogout={logout}
        onChangePassword={() => setIsChangePasswordOpen(true)}
        onOpenProfile={() => {
          setMobileTab('more');
          setMobileSubModule('profile');
        }}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
        searchValue={globalSearch}
        onSearchChange={setGlobalSearch}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onContactSupport={() => {
          window.location.href = 'mailto:support@afdesign.studio?subject=A%26F%20Design%20Studio%20Support';
        }}
        studioName="A&F Design"
        desktopContent={desktopContent}
        mobileContent={mobileContent}
      />

      {/* Global Modals & Sheets */}
      <MobileNotificationsSheet
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
      />

      <MobileChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userName={user.fullName}
        userRole={user.role}
        authHeaders={getAuthHeaders()}
      />

      <MobileCreateProjectModal
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onProjectCreated={() => {
          setIsCreateProjectOpen(false);
          fetchProjects();
        }}
        authHeaders={getAuthHeaders()}
      />

      <MobileDrawingSheetModal
        drawing={activeDrawing}
        onClose={() => setActiveDrawing(null)}
        projectName={selectedProject.name}
        phaseName={activePhase === 'concept' ? 'Concept Design' : 'Construction Drawings'}
        folderName={activeFolderName}
        userRole={user.role}
        allowClientDownloads={selectedProject.allowClientDownloads}
        authHeaders={getAuthHeaders()}
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
