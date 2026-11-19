import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth, UserProfile, UserRole } from './context/AuthContext';
import { LoginPage } from './pages/Auth/LoginPage';
import { Shell, InAppNotificationItem } from './components/layout/Shell';
import { DocumentExplorer } from './pages/Vault/DocumentExplorer';
import { VerificationList, VerificationItem } from './pages/Verification/VerificationList';
import { MeetingCalendar } from './pages/Meetings/MeetingCalendar';
import { StaffAttendance } from './pages/Attendance/StaffAttendance';
import { AdminAttendanceOverview } from './pages/Attendance/AdminAttendanceOverview';
import { PaymentLedger, PaymentRecord } from './pages/Payments/PaymentLedger';
import { ProjectChatRoom, ChatMessageItem } from './pages/Chat/ProjectChatRoom';
import { FolderKanban, ArrowRight, UserPlus, RefreshCw, Smartphone, Monitor, ChevronLeft, CalendarCheck, Bell, Check, X } from 'lucide-react';
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
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { PwaOfflineBanner } from './components/pwa/PwaOfflineBanner';


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
  const [activeTab, setActiveTab] = useState('projects');
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
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Real Attendance Session State
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<string[]>([]);

  const getAuthHeaders = useCallback(() => {
    const roleSlug = user?.role ? user.role.toLowerCase() : 'admin';
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : `Bearer ${roleSlug}`,
    };
  }, [user?.role, token]);

  // Maintain a stable ref for projects to avoid infinite effect invalidation
  const projectsRef = useRef<ProjectSummary[]>(projects);
  useEffect(() => {
    projectsRef.current = projects;
  }, [projects]);

  // Load Projects from Database
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects((prev) => {
            if (
              prev.length === data.length &&
              prev.every((p, i) => p.id === data[i]?.id && p.projectCode === data[i]?.projectCode && p.name === data[i]?.name)
            ) {
              return prev;
            }
            return data;
          });
          if (data.length > 0 && !data.some((p: ProjectSummary) => p.projectCode === selectedProjectCode)) {
            setSelectedProjectCode(data[0].projectCode);
          }
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
        if (Array.isArray(data)) {
          setVerifications(data);
        }
      }
    } catch (err) {
      console.error('Failed to load verifications from DB', err);
    }
  }, [getAuthHeaders, user?.role]);

  // Load Payments: retrieve payments for projects and strictly enrich with accurate projectCode & name
  const fetchPayments = useCallback(async () => {
    if (user?.role === 'STAFF') return;
    try {
      let rawPayments: any[] = [];
      const currentProjects: Array<{ id: string; projectCode: string; name: string }> =
        projectsRef.current.length > 0
          ? projectsRef.current
          : [{ id: 'ecc32385-2999-4336-a5fc-45e11f7d46d3', projectCode: 'AF-VILLA', name: 'Villa Horizon Luxury Residence' }];

      if (user?.role === 'ADMIN') {
        // Query payments across all projects in parallel
        const responses = await Promise.all(
          currentProjects.map(async (prj) => {
            try {
              const res = await fetch(`/api/payments/project/${encodeURIComponent(prj.projectCode)}`, { headers: getAuthHeaders() });
              if (res.ok) {
                const data = await res.json();
                return Array.isArray(data)
                  ? data.map((item) => ({ ...item, projectCode: prj.projectCode, projectName: prj.name }))
                  : [];
              }
              return [];
            } catch {
              return [];
            }
          })
        );
        rawPayments = responses.flat();
      } else {
        const res = await fetch(`/api/payments/project/${encodeURIComponent(selectedProjectCode)}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          rawPayments = Array.isArray(data) ? data : [];
        }
      }

      // Ensure every payment has its definitive, unchangeable projectCode and projectName
      const enriched = rawPayments.map((p) => {
        const matchingProject = currentProjects.find(
          (prj) => prj.id === p.projectId || prj.projectCode === p.projectCode
        );
        return {
          ...p,
          projectCode: matchingProject?.projectCode || p.projectCode || 'AF-VILLA',
          projectName: matchingProject?.name || p.projectName || 'Villa Horizon Luxury Residence',
          milestoneTitle: p.milestoneTitle || p.bankName || p.referenceNumber || 'Milestone Payment',
        };
      });

      setPayments(enriched);
    } catch (err) {
      console.error('Failed to load payments from DB', err);
    }
  }, [getAuthHeaders, user?.role, selectedProjectCode]);

  // Load Meetings for active project or all studio meetings if admin (Admin & Client Leader only)
  const fetchMeetings = useCallback(async () => {
    if (user?.role === 'STAFF' || user?.role === 'CLIENT_VIEWER') return;
    try {
      const url = user?.role === 'ADMIN' ? '/api/meetings' : `/api/meetings?projectCode=${encodeURIComponent(selectedProjectCode)}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (err) {
      console.error('Failed to load meetings from DB', err);
    }
  }, [getAuthHeaders, selectedProjectCode, user?.role]);

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
      const res = await fetch(`/api/chat/projects/${encodeURIComponent(selectedProjectCode)}/messages`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data);
      }
    } catch (err) {
      console.error('Failed to load chat from DB', err);
    }
  }, [getAuthHeaders, user?.role, selectedProjectCode]);

  // Load Notifications and synthesize meeting invitations for invited participants
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      let apiNotifs: InAppNotificationItem[] = [];
      try {
        const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.notifications && Array.isArray(data.notifications)) {
            apiNotifs = data.notifications;
          }
        }
      } catch (_) {}

      // Synthesize meeting invitations directly from meetings where user is an attendee
      const userName = user.fullName || user.username || '';
      const nameLower = userName.toLowerCase();
      let readKeys: string[] = [];
      try {
        readKeys = JSON.parse(localStorage.getItem(`read_notifs_${user.id}`) || '[]');
      } catch (_) {}

      const meetingNotifs: InAppNotificationItem[] = [];
      meetings.forEach((m: any) => {
        let attendees: string[] = Array.isArray(m.attendees) ? [...m.attendees] : [];
        let agenda = m.agenda;
        let location = m.location;
        if (m.notes && typeof m.notes === 'string' && m.notes.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(m.notes);
            if (Array.isArray(parsed.attendees)) attendees = parsed.attendees;
            if (!agenda && parsed.agenda) agenda = parsed.agenda;
            if (!location && parsed.location) location = parsed.location;
          } catch (_) {}
        }
        if (!agenda) agenda = m.notes || 'Consultation Meeting';
        if (!location) location = m.type === 'SITE_VISIT' ? 'On Site' : 'Studio HQ Boardroom';

        const isUserAttending = attendees.some((att) => {
          const aLower = att.toLowerCase();
          return (
            aLower.includes(nameLower) ||
            nameLower.includes(aLower) ||
            (aLower.includes('ronak') && nameLower.includes('ronak')) ||
            (aLower.includes('priya') && nameLower.includes('priya')) ||
            (aLower.includes('rajesh') && nameLower.includes('rajesh')) ||
            (aLower.includes('pooja') && nameLower.includes('pooja'))
          );
        });

        if (isUserAttending) {
          const notifId = `meeting-invite-${m.id}`;
          const isRead = readKeys.includes(notifId);
          meetingNotifs.push({
            id: notifId,
            recipientId: user.id,
            projectId: m.projectId,
            projectCode: m.projectCode,
            category: 'MEETING',
            title: `Meeting Invitation: ${agenda}`,
            message: `${m.requestedBy || 'Studio Administrator'} invited you to attend an architectural ${
              m.type === 'SITE_VISIT' ? 'Site Visit' : 'Studio Meeting'
            } on ${m.bookingDate} (${m.slotTime || m.slot}) at ${location}.`,
            deepLink: '/meetings',
            isRead,
            createdAt: m.createdAt || new Date().toISOString(),
          });
        }
      });

      const allNotifsMap = new Map<string, InAppNotificationItem>();
      meetingNotifs.forEach((n) => allNotifsMap.set(n.id, n));
      apiNotifs.forEach((n) => allNotifsMap.set(n.id, n));

      const merged = Array.from(allNotifsMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(merged);
      setUnreadNotificationsCount(merged.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  }, [user, getAuthHeaders, meetings]);

  const handleMarkAllNotificationsRead = async () => {
    if (!user) return;
    try {
      const allIds = notifications.map((n) => n.id);
      localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(allIds));
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotificationsCount(0);
      fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to mark all notifications read', e);
    }
  };

  const handleNotificationClick = async (notif: InAppNotificationItem) => {
    if (!user) return;
    try {
      let stored: string[] = [];
      try {
        stored = JSON.parse(localStorage.getItem(`read_notifs_${user.id}`) || '[]');
      } catch (_) {}
      if (!stored.includes(notif.id)) {
        stored.push(notif.id);
        localStorage.setItem(`read_notifs_${user.id}`, JSON.stringify(stored));
      }
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
      fetch(`/api/notifications/${notif.id}/read`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }).catch(() => {});

      if (notif.category === 'MEETING' || notif.deepLink === '/meetings') {
        if (currentUser.role === 'ADMIN' || currentUser.role === 'CLIENT_LEADER') {
          setActiveTab('meetings');
          setMobileTab('meetings');
        }
      }
    } catch (e) {
      console.error('Failed handling notification click', e);
    }
  };

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
      fetchNotifications(),
    ]);
    setIsRefreshing(false);
  }, [fetchProjects, fetchVerifications, fetchPayments, fetchMeetings, fetchAttendance, fetchChat, fetchNotifications]);

  // Fetch initial data on user login (guarded against re-fetch cycles)
  const initialDataLoadedRef = useRef<string | null>(null);
  const userIdentifier = user ? `${user.id || 'usr'}_${user.role}_${token || 'local'}` : null;
  useEffect(() => {
    if (userIdentifier && initialDataLoadedRef.current !== userIdentifier) {
      initialDataLoadedRef.current = userIdentifier;
      refreshAllData();
    }
  }, [userIdentifier, refreshAllData]);

  // Re-fetch tab data when user navigates to an operational module
  useEffect(() => {
    if (activeTab === 'verification' || mobileSubModule === 'verification') {
      fetchVerifications();
    } else if (activeTab === 'payments' || mobileSubModule === 'payments') {
      fetchPayments();
    } else if (activeTab === 'meetings' || mobileTab === 'meetings') {
      fetchMeetings();
    } else if (activeTab === 'attendance' || mobileSubModule === 'attendance') {
      fetchAttendance();
    } else if (activeTab === 'chat' || mobileSubModule === 'chat') {
      fetchChat();
    }
  }, [activeTab, mobileSubModule, mobileTab, fetchVerifications, fetchPayments, fetchMeetings, fetchAttendance, fetchChat]);

  // Keep notifications fresh when meetings change
  useEffect(() => {
    if (user && meetings.length > 0) {
      fetchNotifications();
    }
  }, [user, meetings, fetchNotifications]);

  // Refetch only when active project actually changes
  const prevProjectCodeRef = useRef<string>(selectedProjectCode);
  useEffect(() => {
    if (user && selectedProjectCode && prevProjectCodeRef.current !== selectedProjectCode) {
      prevProjectCodeRef.current = selectedProjectCode;
      fetchPayments();
      fetchMeetings();
      fetchChat();
    }
  }, [selectedProjectCode, fetchPayments, fetchMeetings, fetchChat, user]);

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
        body: JSON.stringify({ notes, feedbackNote: notes }),
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

  // Submit Design Verification (Staff & Admin)
  const handleSubmitVerification = async (data: {
    projectId: string;
    folderId: string;
    drawingTitle: string;
    fileKey: string;
    previewKey?: string;
    notes: string;
  }) => {
    try {
      const res = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchVerifications();
        await fetchProjects();
        alert('Verification request submitted successfully. Admin has been notified for review.');
      } else {
        const err = await res.json();
        alert(`Verification submission failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Verification submission failed', err);
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

  // Create Milestone Payment (Admin Only)
  const handleCreatePayment = async (data: {
    projectCode?: string;
    milestoneTitle: string;
    amount: number;
    paymentMode: 'CHEQUE' | 'UPI' | 'NEFT_RTGS' | 'CASH';
    referenceNumber?: string;
    bankName?: string;
    status: 'PENDING_CLEARANCE' | 'CONFIRMED';
  }) => {
    try {
      const targetProject = data.projectCode || (selectedProjectCode !== 'ALL' ? selectedProjectCode : 'AF-VILLA');
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectCode: targetProject,
          milestoneTitle: data.milestoneTitle,
          amount: data.amount,
          paymentMode: data.paymentMode,
          referenceNumber: data.referenceNumber,
          bankName: data.bankName,
          status: data.status,
        }),
      });
      if (res.ok) {
        await fetchPayments();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Failed to record payment');
      }
    } catch (err: any) {
      console.error('Create payment failed', err);
      throw err;
    }
  };

  // Send Chat Message
  const handleSendMessage = async (text: string, attachment?: { name: string; size: number; url: string }) => {
    try {
      const messageText = text.trim() || (attachment ? `Shared file: ${attachment.name}` : '');
      const res = await fetch(`/api/chat/projects/${encodeURIComponent(selectedProjectCode)}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          messageText,
          attachmentKey: attachment ? attachment.url : undefined,
        }),
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

  // Arrange Meeting (Admin initiates based on task, time, and attendees)
  const handleArrangeMeeting = async (data: {
    projectCode: string;
    bookingDate: string;
    slot: string;
    type: 'OFFICE_MEETING' | 'SITE_VISIT';
    agenda: string;
    attendees: string[];
    location?: string;
    notes?: string;
  }) => {
    try {
      const structuredNotes = JSON.stringify({
        agenda: data.agenda,
        attendees: data.attendees,
        location: data.location || (data.type === 'SITE_VISIT' ? 'On Site' : 'Studio HQ Boardroom'),
        notes: data.notes || '',
      });
      const res = await fetch('/api/meetings/request', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          notes: structuredNotes,
        }),
      });
      if (res.ok) {
        await fetchMeetings();
        alert(`Meeting successfully scheduled for ${data.bookingDate} (${data.slot})! All invited attendees have been notified.`);
      } else {
        const err = await res.json();
        alert(`Meeting scheduling failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Failed to arrange meeting', err);
    }
  };

  // Approve Meeting Slot (Admin)
  const handleApproveMeeting = async (id: string) => {
    try {
      const res = await fetch(`/api/meetings/${id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchMeetings();
        alert('Consultation confirmed successfully.');
      } else {
        const err = await res.json();
        alert(`Approval failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Failed to approve meeting', err);
    }
  };

  // Cancel Meeting
  const handleCancelMeeting = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this meeting?')) return;
    try {
      const res = await fetch(`/api/meetings/${id}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        await fetchMeetings();
        alert('Meeting has been cancelled.');
      } else {
        const err = await res.json();
        alert(`Cancellation failed: ${err.error || 'Server error'}`);
      }
    } catch (err) {
      console.error('Failed to cancel meeting', err);
    }
  };

  // Invitee RSVP (Confirm / In vs Decline / Out)
  const handleRsvpMeeting = async (meetingId: string, rsvp: 'IN' | 'OUT') => {
    try {
      if (user?.fullName) {
        localStorage.setItem(`meeting_rsvp_${meetingId}_${user.fullName}`, rsvp);
      }
      setMeetings((prev) =>
        prev.map((m) => {
          if (m.id === meetingId) {
            let parsed: any = {};
            if (m.notes && typeof m.notes === 'string') {
              try {
                parsed = JSON.parse(m.notes);
              } catch (_) {
                parsed = { notes: m.notes };
              }
            }
            const currentRsvp = parsed.rsvp || m.rsvp || {};
            if (user?.fullName) currentRsvp[user.fullName] = rsvp;
            parsed.rsvp = currentRsvp;
            return {
              ...m,
              notes: JSON.stringify(parsed),
              rsvp: currentRsvp,
            };
          }
          return m;
        })
      );

      await fetch(`/api/meetings/${meetingId}/rsvp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rsvp }),
      });
      await fetchNotifications();
    } catch (err) {
      console.error('Failed to update meeting RSVP', err);
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
          unreadCount={unreadNotificationsCount}
        >
          {/* If a sub-module is opened from the action grid */}
          {mobileSubModule ? (
            <div style={{ flex: 1, padding: '16px 20px 120px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <button
                  onClick={() => setMobileSubModule(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '1px solid #E8E8E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={20} color="#0C0C0D" />
                </button>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, textTransform: 'capitalize', color: '#0C0C0D' }}>
                  {mobileSubModule === 'verification' ? 'Design Verification' : (mobileSubModule === 'attendance' && currentUser.role === 'ADMIN' ? 'Staff Attendance & Work Logs' : mobileSubModule)}
                </h3>
              </div>

              {mobileSubModule === 'verification' && (
                <VerificationList
                  userRole={currentUser.role}
                  items={verifications}
                  onApprove={handleApproveVerification}
                  onRequestRevision={handleRequestRevision}
                  onSubmitVerification={handleSubmitVerification}
                  projectCode={selectedProjectCode}
                  getAuthHeaders={getAuthHeaders}
                  onRefresh={fetchVerifications}
                />
              )}

              {mobileSubModule === 'payments' && (
                <PaymentLedger
                  userRole={currentUser.role}
                  showPricing={currentUser.showPricing ?? true}
                  payments={payments}
                  projects={projects}
                  selectedProjectCode={selectedProjectCode}
                  onSubmitDiscrepancy={handleDiscrepancySubmit}
                  onCreatePayment={handleCreatePayment}
                />
              )}

              {mobileSubModule === 'attendance' && (
                currentUser.role === 'ADMIN' ? (
                  <AdminAttendanceOverview getAuthHeaders={getAuthHeaders} />
                ) : (
                  <StaffAttendance
                    isClockedIn={isClockedIn}
                    pendingUpdates={pendingUpdates}
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    onSubmitUpdate={handleDailyUpdate}
                  />
                )
              )}

              {mobileSubModule === 'chat' && (
                <ProjectChatRoom
                  projectCode={selectedProjectCode}
                  userRole={currentUser.role}
                  userName={currentUser.fullName}
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                />
              )}

              {mobileSubModule === 'vault' && (
                <DocumentExplorer
                  projectCode={selectedProjectCode}
                  userRole={currentUser.role}
                  clientName={currentUser.fullName}
                  userEmail={currentUser.email || 'client@studio.com'}
                />
              )}
            </div>
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
                      if (currentUser.role === 'ADMIN' || currentUser.role === 'CLIENT_LEADER') {
                        setMobileTab('meetings');
                      }
                    } else if (['verification', 'payments', 'attendance', 'chat', 'vault'].includes(viewId)) {
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
                      onBack={() => setMobileProjectStep('detail')}
                      onSelectDrawing={(drawing) => setActiveDrawing(drawing)}
                      viewMode={mobileProjectViewMode}
                      onViewModeChange={setMobileProjectViewMode}
                    />
                  )}
                </>
              )}

              {/* TAB 3: MEETINGS (ADMIN & CLIENT LEADER ONLY) */}
              {mobileTab === 'meetings' && (currentUser.role === 'ADMIN' || currentUser.role === 'CLIENT_LEADER') && (
                <div style={{ padding: '0 16px 120px 16px' }}>
                  <MeetingCalendar
                    projectCode={selectedProjectCode}
                    userRole={currentUser.role}
                    userName={currentUser.fullName}
                    meetings={meetings}
                    bookedSlots={bookedSlots}
                    onBookSlot={handleBookSlot}
                    onRsvpMeeting={handleRsvpMeeting}
                    onArrangeMeeting={handleArrangeMeeting}
                    onApproveMeeting={handleApproveMeeting}
                    onCancelMeeting={handleCancelMeeting}
                    getAuthHeaders={getAuthHeaders}
                    projects={projects}
                    activeMeeting={activeMeeting ? {
                      id: activeMeeting.id,
                      slotTime: activeMeeting.slotTime || activeMeeting.slot,
                      date: activeMeeting.bookingDate,
                      agenda: activeMeeting.agenda || 'Design Review',
                      status: activeMeeting.status === 'RESCHEDULE_PENDING' ? 'RESCHEDULE_PENDING' : 'CONFIRMED',
                    } : undefined}
                  />
                </div>
              )}

              {/* TAB 3 (ALTERNATIVE FOR STAFF): ATTENDANCE */}
              {mobileTab === 'attendance' && (
                <div style={{ padding: '0 16px 120px 16px' }}>
                  <StaffAttendance
                    isClockedIn={isClockedIn}
                    pendingUpdates={pendingUpdates}
                    onClockIn={handleClockIn}
                    onClockOut={handleClockOut}
                    onSubmitUpdate={handleDailyUpdate}
                  />
                </div>
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
                      onOpenProfile={() => alert(`Profile: ${currentUser.fullName} (${currentUser.role})`)}
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
          notifications={notifications}
          unreadCount={unreadNotificationsCount}
          onMarkAllRead={handleMarkAllNotificationsRead}
          onNotificationClick={handleNotificationClick}
        />

        <MobileChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          userName={currentUser.fullName}
          userRole={currentUser.role}
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

      <Shell
        user={currentUser}
        studioName="A&F Design"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onLogout={logout}
        notifications={notifications}
        unreadNotificationsCount={unreadNotificationsCount}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onNotificationClick={handleNotificationClick}
      >
        {/* TAB 1: PROJECTS OVERVIEW DASHBOARD (REAL SUPABASE DB) */}
        {activeTab === 'projects' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Top Meeting Invitations Banner for Staff and Clients */}
            {notifications.some((n) => n.category === 'MEETING') && currentUser.role !== 'ADMIN' && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '16px 20px',
                  backgroundColor: 'rgba(197, 160, 89, 0.08)',
                  border: '1px solid var(--accent-gold)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#0d0f12',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <CalendarCheck size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          backgroundColor: 'var(--accent-gold)',
                          color: '#0d0f12',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}
                      >
                        Meeting Invitation
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Studio Administrator has included you as an attendee
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {notifications.find((n) => n.category === 'MEETING')?.title}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {notifications.find((n) => n.category === 'MEETING')?.message}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const notif = notifications.find((n) => n.category === 'MEETING');
                      const meetingId = notif?.id?.replace('meeting-invite-', '');
                      if (meetingId) handleRsvpMeeting(meetingId, 'IN');
                    }}
                    style={{
                      padding: '7px 14px',
                      backgroundColor: 'var(--accent-emerald)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 5px rgba(18, 183, 106, 0.25)',
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                    <span>I'm In</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const notif = notifications.find((n) => n.category === 'MEETING');
                      const meetingId = notif?.id?.replace('meeting-invite-', '');
                      if (meetingId) handleRsvpMeeting(meetingId, 'OUT');
                    }}
                    style={{
                      padding: '7px 12px',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <X size={13} strokeWidth={2.5} />
                    <span>I'm Out</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('meetings')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#0d0f12',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>Open Calendar</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                Active Studio Portfolios
              </span>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Architectural Projects ({projects.length})
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Manage design workflows, category milestones, and client handoffs.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: selectedProjectCode === proj.projectCode ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          backgroundColor: proj.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          color: proj.status === 'ACTIVE' ? 'var(--accent-emerald)' : 'var(--accent-blue)',
                          borderRadius: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {proj.status}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {proj.projectCode}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {proj.name}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      {proj.category} • Location: {proj.siteLocation}
                    </p>

                    {/* 16-Category Progress Meter */}
                    <div style={{ marginBottom: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Workflow Progress</span>
                        <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>
                          {proj.completionPercentage}% ({proj.populatedFolders}/16 Folders)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${proj.completionPercentage}%`,
                            height: '100%',
                            backgroundColor: 'var(--accent-gold)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setSelectedProjectCode(proj.projectCode);
                        setActiveTab('vault');
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '10px',
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Open Vault</span>
                      <ArrowRight size={15} />
                    </button>
                    {selectedProjectCode !== proj.projectCode && (
                      <button
                        onClick={() => setSelectedProjectCode(proj.projectCode)}
                        style={{
                          padding: '10px 14px',
                          backgroundColor: '#21262d',
                          border: '1px solid #30363d',
                          borderRadius: 'var(--radius-md)',
                          color: '#c9d1d9',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENT VAULT & 16 CATEGORIES */}
        {activeTab === 'vault' && (
          <DocumentExplorer
            projectCode={selectedProjectCode}
            userRole={currentUser.role}
            clientName={currentUser.fullName}
            userEmail={currentUser.email || 'client@studio.com'}
          />
        )}

        {/* TAB 3: DESIGN VERIFICATION & APPROVALS (REVISION COUNTER) */}
        {activeTab === 'verification' && (
          <VerificationList
            userRole={currentUser.role}
            items={verifications}
            onApprove={handleApproveVerification}
            onRequestRevision={handleRequestRevision}
            onSubmitVerification={handleSubmitVerification}
            projectCode={selectedProjectCode}
            getAuthHeaders={getAuthHeaders}
            onRefresh={fetchVerifications}
          />
        )}

        {/* TAB 4: CONSULTATION MEETINGS (ADMIN & CLIENT LEADER ONLY) */}
        {activeTab === 'meetings' && (currentUser.role === 'ADMIN' || currentUser.role === 'CLIENT_LEADER') && (
          <MeetingCalendar
            projectCode={selectedProjectCode}
            userRole={currentUser.role}
            userName={currentUser.fullName}
            meetings={meetings}
            bookedSlots={bookedSlots}
            onBookSlot={handleBookSlot}
            onRsvpMeeting={handleRsvpMeeting}
            onArrangeMeeting={handleArrangeMeeting}
            onApproveMeeting={handleApproveMeeting}
            onCancelMeeting={handleCancelMeeting}
            getAuthHeaders={getAuthHeaders}
            projects={projects}
            activeMeeting={activeMeeting ? {
              id: activeMeeting.id,
              slotTime: activeMeeting.slotTime || activeMeeting.slot,
              date: activeMeeting.bookingDate,
              agenda: activeMeeting.agenda || 'Design Review',
              status: activeMeeting.status === 'RESCHEDULE_PENDING' ? 'RESCHEDULE_PENDING' : 'CONFIRMED',
            } : undefined}
          />
        )}

        {/* TAB 5: ATTENDANCE & CLOCK-OUT HARD GATE / ADMIN OVERVIEW */}
        {activeTab === 'attendance' && (
          currentUser.role === 'ADMIN' ? (
            <AdminAttendanceOverview getAuthHeaders={getAuthHeaders} />
          ) : (
            <StaffAttendance
              isClockedIn={isClockedIn}
              pendingUpdates={pendingUpdates}
              onClockIn={handleClockIn}
              onClockOut={handleClockOut}
              onSubmitUpdate={handleDailyUpdate}
            />
          )
        )}

        {/* TAB 6: PAYMENTS LEDGER (STRICTLY HIDDEN FOR STAFF) */}
        {activeTab === 'payments' && (
          <PaymentLedger
            userRole={currentUser.role}
            showPricing={currentUser.showPricing ?? true}
            payments={payments}
            projects={projects}
            selectedProjectCode={selectedProjectCode}
            onSubmitDiscrepancy={handleDiscrepancySubmit}
            onCreatePayment={handleCreatePayment}
          />
        )}

        {/* TAB 7: ENCRYPTED PROJECT CHAT */}
        {activeTab === 'chat' && (
          <ProjectChatRoom
            projectCode={selectedProjectCode}
            userRole={currentUser.role}
            userName={currentUser.fullName}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
          />
        )}
      </Shell>
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
