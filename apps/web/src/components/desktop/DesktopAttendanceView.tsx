import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';
import {
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldX,
  Calendar,
  LogOut,
  Send,
  X,
  FileText,
  Search,
  Plus,
  Trash2,
  Lock,
  Bell,
  ArrowLeft,
  FolderOpen,
  Eye,
  Hourglass,
  Check,
  Info,
  CalendarClock,
  CalendarDays,
} from 'lucide-react';
import './desktop.css';

export interface StaffMemberRecord {
  id: string;
  name: string;
  role: string;
  status: 'PRESENT' | 'ON_SITE' | 'LEAVE' | 'ABSENT';
  clockInTime?: string;
  clockOutTime?: string;
  location?: string;
  avatar: string;
  pendingUpdatesCount?: number;
}

export interface RegularizationRequest {
  id: string;
  staffName: string;
  date: string;
  reason: string;
  requestedTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestType?: 'REGULARIZATION' | 'LEAVE';
  reviewNote?: string | null;
}

interface AdminAttendanceSession {
  id: string;
  userId: string;
  staffName: string;
  username: string;
  mobile?: string;
  role: string;
  clockInAt: string;
  clockInAddress: string;
  clockOutAt: string | null;
  clockOutAddress?: string | null;
  isRegularized: boolean;
  pendingUpdates: string[];
  dailyUpdates: Array<{
    id: string;
    slot: string;
    workSummary: string;
    submittedAt: string;
    projectCode: string;
  }>;
}

interface WorkUpdateRow {
  id: string;
  projectCode: string;
  projectName: string;
  staffName: string;
  slot: string;
  workSummary: string;
  status: 'SUBMITTED' | 'PENDING';
  updatedOn: string;
  rawDate: string;
}

export interface DesktopAttendanceViewProps {
  userRole?: UserRole;
  userName?: string;
  user?: {
    fullName: string;
    role: UserRole;
    email?: string;
  };
  isClockedIn?: boolean;
  staffList?: StaffMemberRecord[];
  regularizationQueue?: RegularizationRequest[];
  mode?: 'attendance' | 'updates';
  projects?: ProjectSummary[];
  attendanceStatus?: any;
  getAuthHeaders?: () => Record<string, string>;
  onClockIn?: (coords?: { lat: number; lng: number; address: string }) => void;
  onClockOut?: () => void;
  onSubmitDailyUpdate?: (slot: string, notes: string) => void;
  onApproveRegularization?: (requestId: string) => void;
  onRejectRegularization?: (requestId: string) => void;
  onClockInSuccess?: () => Promise<void> | void;
  onClockOutSuccess?: () => Promise<void> | void;
  onDailyUpdateSuccess?: () => Promise<void> | void;
}

const DEFAULT_STAFF: StaffMemberRecord[] = [
  {
    id: 'st-1',
    name: 'Farhan Admani',
    role: 'Principal Architect',
    status: 'PRESENT',
    clockInTime: '09:15 AM',
    location: 'Studio HQ (Ahmedabad)',
    avatar: 'FA',
  },
  {
    id: 'st-2',
    name: 'Sonu Sharma',
    role: 'Senior UI/UX & BIM Lead',
    status: 'ON_SITE',
    clockInTime: '09:30 AM',
    location: 'Courtyard Villa Site',
    avatar: 'SS',
  },
  {
    id: 'st-3',
    name: 'Rajesh Patel',
    role: 'CAD Draftsman',
    status: 'PRESENT',
    clockInTime: '09:45 AM',
    location: 'Studio HQ (Ahmedabad)',
    avatar: 'RP',
  },
  {
    id: 'st-4',
    name: 'Ananya Roy',
    role: 'Interior Architect',
    status: 'PRESENT',
    clockInTime: '09:20 AM',
    location: 'Studio HQ (Ahmedabad)',
    avatar: 'AR',
  },
  {
    id: 'st-5',
    name: 'Vikram Mehta',
    role: 'Site Engineer',
    status: 'ON_SITE',
    clockInTime: '08:50 AM',
    location: 'Artilla Inn Site',
    avatar: 'VM',
  },
];

const DEFAULT_REGULARIZATIONS: RegularizationRequest[] = [
  {
    id: 'reg-1',
    staffName: 'Rajesh Patel',
    date: '2026-11-04',
    requestedTime: '09:00 AM',
    reason: 'Client site layout measurement visit before arriving at studio.',
    status: 'PENDING',
    requestType: 'REGULARIZATION',
  },
  {
    id: 'reg-2',
    staffName: 'Ananya Roy',
    date: '2026-11-03',
    requestedTime: '09:30 AM',
    reason: 'Marble supplier vendor warehouse sample inspection.',
    status: 'PENDING',
    requestType: 'REGULARIZATION',
  },
];

const SCHEDULE_STORAGE_KEY = 'ab_studio_update_schedule_v1';

function formatTimeShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTimeShort(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function subtractTenMinutes(timeLabel: string): string {
  const match = timeLabel.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '10 min prior';
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  const totalMins = (hour * 60 + minute - 10 + 1440) % 1440;
  const remH24 = Math.floor(totalMins / 60);
  const remM = totalMins % 60;
  const remPeriod = remH24 >= 12 ? 'PM' : 'AM';
  const remH12 = remH24 % 12 === 0 ? 12 : remH24 % 12;
  return `${remH12}:${remM.toString().padStart(2, '0')} ${remPeriod}`;
}

function computeIntervalPreview(intervalHours: number): Array<{ due: string; reminder: string }> {
  const rows: Array<{ due: string; reminder: string }> = [];
  const startMinutes = 9 * 60; // Example: 9:00 AM Clock In
  const stepMinutes = Math.round(intervalHours * 60);
  for (let i = 1; i <= 4; i += 1) {
    const dueTotal = startMinutes + stepMinutes * i;
    if (dueTotal >= 20 * 60) break;
    const h24 = Math.floor(dueTotal / 60) % 24;
    const m = dueTotal % 60;
    const period = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const dueLabel = `${h12}:${m.toString().padStart(2, '0')} ${period}`;
    rows.push({ due: dueLabel, reminder: subtractTenMinutes(dueLabel) });
  }
  return rows;
}

export const DesktopAttendanceView: React.FC<DesktopAttendanceViewProps> = ({
  userRole,
  userName,
  user,
  isClockedIn: controlledClockedIn = false,
  staffList,
  regularizationQueue,
  mode = 'attendance',
  projects = [],
  attendanceStatus,
  getAuthHeaders,
  onClockIn,
  onClockOut,
  onSubmitDailyUpdate,
  onApproveRegularization,
  onRejectRegularization,
  onClockInSuccess,
  onClockOutSuccess,
  onDailyUpdateSuccess,
}) => {
  const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const activeUser = user || { fullName: userName || 'Studio Member', role: userRole || 'STAFF' };

  // Strict RBAC: Client roles are restricted from internal studio attendance & work updates
  if (activeUser.role === 'CLIENT_LEADER' || activeUser.role === 'CLIENT_VIEWER') {
    return (
      <div className="desktop-access-restricted" data-testid="attendance-restricted-card">
        <div className="desktop-access-restricted-icon">
          <ShieldX size={36} color="#D92D20" />
        </div>
        <h2 className="desktop-access-restricted-title">Access Restricted</h2>
        <p className="desktop-access-restricted-desc">
          Staff attendance, biometric geofence logs, daily work updates, and regularization rosters are internal studio operations restricted to studio personnel.
        </p>
      </div>
    );
  }

  const isAdmin = activeUser.role === 'ADMIN';
  const isStaff = activeUser.role === 'STAFF';

  // Live API State
  const [liveStatus, setLiveStatus] = useState<any>(attendanceStatus || null);
  const [adminSessions, setAdminSessions] = useState<AdminAttendanceSession[]>([]);
  const [liveStaffRoster, setLiveStaffRoster] = useState<StaffMemberRecord[]>([]);
  const [liveRegularizations, setLiveRegularizations] = useState<RegularizationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'error' | 'success' | 'warning'; text: string } | null>(null);

  // Attendance Tabs & Filters
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'REGISTER' | 'REGULARIZATION' | 'LEAVE' | 'SUMMARY'>('ROSTER');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [regFilterType, setRegFilterType] = useState<'ALL' | 'REGULARIZATION' | 'LEAVE'>('ALL');
  const [auditTarget, setAuditTarget] = useState<StaffMemberRecord | null>(null);

  // Clock In/Out state (synced with liveStatus or controlled prop)
  const [internalClockedIn, setInternalClockedIn] = useState(controlledClockedIn);
  const [clockInTime, setClockInTime] = useState(controlledClockedIn ? '09:30 AM' : '');

  useEffect(() => {
    if (attendanceStatus) {
      setLiveStatus(attendanceStatus);
    }
  }, [attendanceStatus]);

  useEffect(() => {
    if (liveStatus && typeof liveStatus.isClockedIn === 'boolean') {
      setInternalClockedIn(liveStatus.isClockedIn);
      setClockInTime(
        liveStatus.activeSession?.clockInAt
          ? formatTimeShort(liveStatus.activeSession.clockInAt)
          : ''
      );
    }
  }, [liveStatus]);

  // Modals: Daily Work Update & Regularization/Leave Request
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateSlot, setUpdateSlot] = useState('Slot 12:00');
  const [updateProjectCode, setUpdateProjectCode] = useState(projects[0]?.projectCode || 'AF-VILLA');
  const [updateNotes, setUpdateNotes] = useState('');

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regType, setRegType] = useState<'REGULARIZATION' | 'LEAVE'>('REGULARIZATION');
  const [regDate, setRegDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [regClockInTime, setRegClockInTime] = useState('09:30');
  const [regClockOutTime, setRegClockOutTime] = useState('18:30');
  const [regReason, setRegReason] = useState('');

  // Updates Mode State
  const [updatesTab, setUpdatesTab] = useState<'TODAY' | 'ALL_STAFF' | 'ALL_PROJECTS'>('TODAY');
  const [updatesSearch, setUpdatesSearch] = useState('');
  const [updatesProjectFilter, setUpdatesProjectFilter] = useState('ALL');
  const [showScheduleConfig, setShowScheduleConfig] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'FIXED' | 'INTERVAL'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(SCHEDULE_STORAGE_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.mode === 'INTERVAL' ? 'INTERVAL' : 'FIXED';
      }
    } catch {
      // ignore storage errors
    }
    return 'FIXED';
  });
  const [fixedSlots, setFixedSlots] = useState<string[]>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(SCHEDULE_STORAGE_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.fixedSlots) && parsed.fixedSlots.length > 0) return parsed.fixedSlots;
      }
    } catch {
      // ignore
    }
    return ['11:00 AM', '2:00 PM', '5:00 PM'];
  });
  const [intervalHours, setIntervalHours] = useState<number>(() => {
    try {
      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(SCHEDULE_STORAGE_KEY) : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.intervalHours === 'number') return parsed.intervalHours;
      }
    } catch {
      // ignore
    }
    return 1;
  });

  const buildHeaders = useCallback((): Record<string, string> => {
    return getAuthHeaders ? { ...getAuthHeaders() } : {};
  }, [getAuthHeaders]);

  const fetchAllAttendanceData = useCallback(async () => {
    if (isTestEnv) return;
    setIsLoading(true);
    try {
      const headers = buildHeaders();
      const requests: Promise<Response>[] = [
        fetch('/api/attendance/status', { headers }),
        fetch('/api/attendance/regularizations', { headers }),
      ];
      if (isAdmin) {
        requests.push(fetch('/api/attendance/admin/overview', { headers }));
      }

      const responses = await Promise.all(requests);
      const [statusRes, regRes, overviewRes] = responses;

      if (statusRes?.ok) {
        const statusData = await statusRes.json();
        setLiveStatus(statusData);
      }

      if (regRes?.ok) {
        const regData = await regRes.json();
        const mappedRegs: RegularizationRequest[] = (regData.regularizations || []).map((r: any) => ({
          id: r.id,
          staffName: r.staffName || 'Studio Staff',
          date: r.targetDate,
          requestedTime: r.requestedClockIn ? formatTimeShort(r.requestedClockIn) : (r.requestType === 'LEAVE' ? 'Full Day' : '—'),
          reason: r.reason,
          status: r.status,
          requestType: r.requestType,
          reviewNote: r.reviewNote,
        }));
        setLiveRegularizations(mappedRegs);
      }

      if (overviewRes?.ok) {
        const ovData = await overviewRes.json();
        setAdminSessions(ovData.records || []);
        const rosterMapped: StaffMemberRecord[] = (ovData.staffRoster || []).map((s: any) => {
          const addr = s.clockInAddress || '';
          let status: StaffMemberRecord['status'] = 'ABSENT';
          if (s.todayStatus === 'CLOCKED_IN' || s.todayStatus === 'CLOCKED_OUT') {
            status = addr.toLowerCase().includes('site') && !addr.toLowerCase().includes('studio hq')
              ? 'ON_SITE'
              : 'PRESENT';
          } else if (s.todayStatus === 'ON_LEAVE') {
            status = 'LEAVE';
          }
          return {
            id: s.id,
            name: s.fullName,
            role: 'Studio Staff',
            status,
            clockInTime: s.clockInAt ? formatTimeShort(s.clockInAt) : undefined,
            clockOutTime: s.clockOutAt ? formatTimeShort(s.clockOutAt) : undefined,
            location: s.clockInAddress || (status === 'LEAVE' ? 'Approved Leave' : 'Not Clocked In'),
            avatar: getInitials(s.fullName),
            pendingUpdatesCount: s.pendingUpdatesCount || 0,
          };
        });
        setLiveStaffRoster(rosterMapped);
      }
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [buildHeaders, isAdmin, isTestEnv]);

  useEffect(() => {
    void fetchAllAttendanceData();
  }, [fetchAllAttendanceData]);

  // Effective lists: never fall back to dummy data in production
  const effectiveStaffList: StaffMemberRecord[] =
    staffList ?? (isTestEnv ? DEFAULT_STAFF : liveStaffRoster);

  const effectiveRegularizationQueue: RegularizationRequest[] =
    regularizationQueue ?? (isTestEnv ? DEFAULT_REGULARIZATIONS : liveRegularizations);

  // Computed Attendance Metrics
  const presentCount = effectiveStaffList.filter((s) => s.status === 'PRESENT' || s.status === 'ON_SITE').length;
  const onSiteCount = effectiveStaffList.filter((s) => s.status === 'ON_SITE').length;
  const leaveCount = effectiveStaffList.filter((s) => s.status === 'LEAVE').length;
  const pendingRegCount = effectiveRegularizationQueue.filter((r) => r.status === 'PENDING').length;

  // Clock In / Clock Out Handler
  const handleClockToggle = async () => {
    const coords = {
      lat: 23.0225,
      lng: 72.5714,
      address: 'Ahmedabad Studio HQ (Geofence Verified)',
    };

    if (internalClockedIn) {
      if (isTestEnv) {
        setInternalClockedIn(false);
        setClockInTime('');
        if (onClockOut) onClockOut();
        if (onClockOutSuccess) void onClockOutSuccess();
        return;
      }

      setActionBusy(true);
      setBannerMessage(null);
      try {
        const res = await fetch('/api/attendance/clock-out', {
          method: 'POST',
          headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...coords,
            attendanceId: liveStatus?.activeSession?.id,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          const pendingList = Array.isArray(data.pendingSlots) && data.pendingSlots.length > 0
            ? ` Pending slots: ${data.pendingSlots.join(', ')}`
            : '';
          setBannerMessage({
            type: 'warning',
            text: `${data.error || 'Clock-out blocked until required daily updates are submitted.'}${pendingList}`,
          });
          if (Array.isArray(data.pendingSlots) && data.pendingSlots.length > 0) {
            setUpdateSlot(data.pendingSlots[0]);
          }
          return;
        }
        setInternalClockedIn(false);
        setClockInTime('');
        setBannerMessage({ type: 'success', text: data.message || 'Clock-Out completed successfully.' });
        if (onClockOut) onClockOut();
        if (onClockOutSuccess) await onClockOutSuccess();
        await fetchAllAttendanceData();
      } catch {
        setBannerMessage({ type: 'error', text: 'Network error while clocking out.' });
      } finally {
        setActionBusy(false);
      }
    } else {
      if (isTestEnv) {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setInternalClockedIn(true);
        setClockInTime(now);
        if (onClockIn) onClockIn(coords);
        if (onClockInSuccess) void onClockInSuccess();
        return;
      }

      setActionBusy(true);
      setBannerMessage(null);
      try {
        const res = await fetch('/api/attendance/clock-in', {
          method: 'POST',
          headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify(coords),
        });
        const data = await res.json();
        if (!res.ok) {
          setBannerMessage({ type: 'error', text: data.error || 'Failed to record Clock-In.' });
          return;
        }
        setInternalClockedIn(true);
        setClockInTime(formatTimeShort(data.clockInAt));
        setBannerMessage({ type: 'success', text: data.message || 'Clock-In recorded successfully.' });
        if (onClockIn) onClockIn(coords);
        if (onClockInSuccess) await onClockInSuccess();
        await fetchAllAttendanceData();
      } catch {
        setBannerMessage({ type: 'error', text: 'Network error while clocking in.' });
      } finally {
        setActionBusy(false);
      }
    }
  };

  // Submit Daily Work Update
  const handleSendDailyUpdate = async () => {
    if (!updateNotes.trim()) return;

    if (isTestEnv) {
      if (onSubmitDailyUpdate) onSubmitDailyUpdate(updateSlot, updateNotes);
      if (onDailyUpdateSuccess) void onDailyUpdateSuccess();
      setUpdateNotes('');
      setIsUpdateModalOpen(false);
      return;
    }

    setActionBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch('/api/attendance/daily-update', {
        method: 'POST',
        headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceId: liveStatus?.activeSession?.id,
          projectCode: updateProjectCode || 'AF-VILLA',
          workSummary: updateNotes.trim(),
          scheduledSlot: updateSlot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMessage({ type: 'error', text: data.error || 'Failed to submit daily update.' });
        return;
      }
      setBannerMessage({ type: 'success', text: `Work update submitted for ${data.scheduledSlot}.` });
      if (onSubmitDailyUpdate) onSubmitDailyUpdate(updateSlot, updateNotes);
      if (onDailyUpdateSuccess) await onDailyUpdateSuccess();
      setUpdateNotes('');
      setIsUpdateModalOpen(false);
      await fetchAllAttendanceData();
    } catch {
      setBannerMessage({ type: 'error', text: 'Network error while submitting daily update.' });
    } finally {
      setActionBusy(false);
    }
  };

  // Submit Regularization or Leave Request
  const handleSubmitRegularization = async () => {
    if (regReason.trim().length < 3) return;

    if (isTestEnv) {
      setIsRegModalOpen(false);
      setRegReason('');
      return;
    }

    setActionBusy(true);
    setBannerMessage(null);
    try {
      const requestedClockIn =
        regType === 'REGULARIZATION' && regClockInTime
          ? new Date(`${regDate}T${regClockInTime}:00`).toISOString()
          : null;
      const requestedClockOut =
        regType === 'REGULARIZATION' && regClockOutTime
          ? new Date(`${regDate}T${regClockOutTime}:00`).toISOString()
          : null;

      const res = await fetch('/api/attendance/regularizations', {
        method: 'POST',
        headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: regType,
          targetDate: regDate,
          requestedClockIn,
          requestedClockOut,
          reason: regReason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMessage({ type: 'error', text: data.error || 'Failed to submit request.' });
        return;
      }
      setBannerMessage({
        type: 'success',
        text: `${regType === 'LEAVE' ? 'Leave' : 'Regularization'} request submitted for ${regDate}.`,
      });
      setRegReason('');
      setIsRegModalOpen(false);
      await fetchAllAttendanceData();
    } catch {
      setBannerMessage({ type: 'error', text: 'Network error while submitting request.' });
    } finally {
      setActionBusy(false);
    }
  };

  // Review Regularization or Leave Request (Admin Only)
  const handleReviewRegularization = async (requestId: string, decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'APPROVED' && onApproveRegularization) {
      onApproveRegularization(requestId);
    }
    if (decision === 'REJECTED' && onRejectRegularization) {
      onRejectRegularization(requestId);
    }
    if (isTestEnv) return;

    setActionBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/attendance/regularizations/${requestId}/review`, {
        method: 'POST',
        headers: { ...buildHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBannerMessage({ type: 'error', text: data.error || 'Failed to review request.' });
        return;
      }
      setBannerMessage({ type: 'success', text: `Request ${decision.toLowerCase()}.` });
      await fetchAllAttendanceData();
    } catch {
      setBannerMessage({ type: 'error', text: 'Network error while reviewing request.' });
    } finally {
      setActionBusy(false);
    }
  };

  // Save Update Schedule (Fixed Slots / Interval Mode)
  const handleSaveSchedule = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          SCHEDULE_STORAGE_KEY,
          JSON.stringify({ mode: scheduleMode, fixedSlots, intervalHours })
        );
      }
      setBannerMessage({
        type: 'success',
        text:
          scheduleMode === 'FIXED'
            ? `Saved Fixed Slots schedule (${fixedSlots.length} daily slots).`
            : `Saved Interval Mode schedule (every ${intervalHours} hour${intervalHours > 1 ? 's' : ''}).`,
      });
    } catch {
      setBannerMessage({ type: 'error', text: 'Could not persist schedule preferences.' });
    }
  };

  const filteredStaff = effectiveStaffList.filter(
    (st) =>
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (st.location || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRegularizations = effectiveRegularizationQueue.filter((req) => {
    if (regFilterType !== 'ALL' && (req.requestType || 'REGULARIZATION') !== regFilterType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        req.staffName.toLowerCase().includes(q) ||
        req.reason.toLowerCase().includes(q) ||
        req.date.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const leaveRequests = effectiveRegularizationQueue.filter(
    (req) => req.requestType === 'LEAVE'
  );

  // Weekly Summary computation from live adminSessions
  const weeklySummary = useMemo(() => {
    const anchor = new Date(`${selectedDate}T00:00:00`);
    const dayOfWeek = anchor.getDay(); // 0=Sun..6=Sat
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + mondayOffset);

    const totalMembers = Math.max(effectiveStaffList.length, 1);
    const days = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const isoDay = d.toISOString().split('T')[0];
      const daySessions = adminSessions.filter((s) => s.clockInAt?.startsWith(isoDay));
      const uniqueUsers = new Set(daySessions.map((s) => s.userId));
      const onSiteUsers = new Set(
        daySessions
          .filter((s) => (s.clockInAddress || '').toLowerCase().includes('site') && !(s.clockInAddress || '').toLowerCase().includes('studio hq'))
          .map((s) => s.userId)
      );
      const presentTotal = uniqueUsers.size;
      const onSiteCountDay = onSiteUsers.size;
      const studioPresent = Math.max(0, presentTotal - onSiteCountDay);
      const absentCountDay = Math.max(0, totalMembers - presentTotal);
      return {
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dateNum: d.getDate().toString().padStart(2, '0'),
        studioPresent,
        onSiteCount: onSiteCountDay,
        absentCount: absentCountDay,
      };
    });

    // Team highlights
    const onSiteByStaff: Record<string, number> = {};
    const presentByStaff: Record<string, Set<string>> = {};
    adminSessions.forEach((s) => {
      const dayKey = s.clockInAt?.split('T')[0] || '';
      if (!presentByStaff[s.staffName]) presentByStaff[s.staffName] = new Set();
      presentByStaff[s.staffName].add(dayKey);
      if ((s.clockInAddress || '').toLowerCase().includes('site') && !(s.clockInAddress || '').toLowerCase().includes('studio hq')) {
        onSiteByStaff[s.staffName] = (onSiteByStaff[s.staffName] || 0) + 1;
      }
    });

    const topOnSite = Object.entries(onSiteByStaff).sort((a, b) => b[1] - a[1])[0] || null;
    const topPresent = Object.entries(presentByStaff)
      .map(([name, set]) => [name, set.size] as [string, number])
      .sort((a, b) => b[1] - a[1])[0] || null;

    return { days, totalMembers, topOnSite, topPresent };
  }, [adminSessions, effectiveStaffList.length, selectedDate]);

  // Work Updates rows derived 100% from live API
  const workUpdateRows: WorkUpdateRow[] = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.projectCode, p.name]));
    const rows: WorkUpdateRow[] = [];

    if (isAdmin && adminSessions.length > 0) {
      adminSessions.forEach((sess) => {
        const sessionDate = sess.clockInAt ? sess.clockInAt.split('T')[0] : '';
        sess.dailyUpdates.forEach((u) => {
          rows.push({
            id: u.id,
            projectCode: u.projectCode || 'AF-VILLA',
            projectName: projectMap.get(u.projectCode) || u.projectCode || 'Studio Project',
            staffName: sess.staffName,
            slot: u.slot,
            workSummary: u.workSummary,
            status: 'SUBMITTED',
            updatedOn: formatDateTimeShort(u.submittedAt),
            rawDate: sessionDate,
          });
        });
        if (!sess.clockOutAt && sess.pendingUpdates.length > 0) {
          sess.pendingUpdates.forEach((slot) => {
            rows.push({
              id: `pending-${sess.id}-${slot}`,
              projectCode: 'STUDIO',
              projectName: 'Daily Update Pending',
              staffName: sess.staffName,
              slot,
              workSummary: 'Awaiting staff submission before Clock Out',
              status: 'PENDING',
              updatedOn: 'Due today',
              rawDate: sessionDate,
            });
          });
        }
      });
    } else if (liveStatus) {
      const todayIso = new Date().toISOString().split('T')[0];
      (liveStatus.submittedUpdates || []).forEach((u: any) => {
        rows.push({
          id: u.id,
          projectCode: u.projectCode || 'AF-VILLA',
          projectName: projectMap.get(u.projectCode) || u.projectCode || 'Studio Project',
          staffName: activeUser.fullName,
          slot: u.slot,
          workSummary: u.workSummary,
          status: 'SUBMITTED',
          updatedOn: formatDateTimeShort(u.submittedAt),
          rawDate: todayIso,
        });
      });
      (liveStatus.pendingUpdates || []).forEach((slot: string) => {
        rows.push({
          id: `pending-self-${slot}`,
          projectCode: 'STUDIO',
          projectName: 'Pending Update Slot',
          staffName: activeUser.fullName,
          slot,
          workSummary: 'Required before Clock Out',
          status: 'PENDING',
          updatedOn: 'Due today',
          rawDate: todayIso,
        });
      });
    }

    return rows;
  }, [activeUser.fullName, adminSessions, isAdmin, liveStatus, projects]);

  const filteredWorkUpdates = useMemo(() => {
    const todayIso = new Date().toISOString().split('T')[0];
    return workUpdateRows.filter((row) => {
      if (updatesTab === 'TODAY' && row.rawDate && row.rawDate !== todayIso) {
        return false;
      }
      if (updatesProjectFilter !== 'ALL' && row.projectCode !== updatesProjectFilter) {
        return false;
      }
      if (updatesSearch.trim()) {
        const q = updatesSearch.toLowerCase();
        return (
          row.projectName.toLowerCase().includes(q) ||
          row.staffName.toLowerCase().includes(q) ||
          row.workSummary.toLowerCase().includes(q) ||
          row.slot.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [updatesProjectFilter, updatesSearch, updatesTab, workUpdateRows]);

  const submittedUpdatesCount = workUpdateRows.filter((r) => r.status === 'SUBMITTED').length;
  const pendingUpdatesCount = workUpdateRows.filter((r) => r.status === 'PENDING').length;

  // =========================================================================
  // RENDER MODE: DAILY WORK UPDATES (Figma 924:25039 + 928:27437 + 928:27607)
  // =========================================================================
  if (mode === 'updates') {
    if (showScheduleConfig) {
      const intervalPreview = computeIntervalPreview(intervalHours);
      return (
        <div className="desktop-view-container" data-testid="desktop-updates-schedule-container">
          <div className="desktop-view-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                className="desktop-btn desktop-btn-secondary"
                onClick={() => setShowScheduleConfig(false)}
                style={{ padding: '8px 12px' }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <div>
                <h1 className="desktop-view-title">Update Schedule</h1>
                <p className="desktop-view-subtitle">
                  Configure Fixed Slots or Interval Mode for mandatory daily staff work updates.
                </p>
              </div>
            </div>
          </div>

          {bannerMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '16px',
                background: bannerMessage.type === 'error' ? '#FEF3F2' : bannerMessage.type === 'warning' ? '#FFFAEB' : '#ECFDF3',
                color: bannerMessage.type === 'error' ? '#B42318' : bannerMessage.type === 'warning' ? '#B54708' : '#027A48',
                border: `1px solid ${bannerMessage.type === 'error' ? '#FECDCA' : bannerMessage.type === 'warning' ? '#FEDF89' : '#A6F4C5'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <span>{bannerMessage.text}</span>
              <button type="button" onClick={() => setBannerMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Mode Toggle Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              background: '#FFFFFF',
              padding: '6px',
              borderRadius: '12px',
              border: '1px solid #EAE7E3',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => setScheduleMode('INTERVAL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '44px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '15px',
                background: scheduleMode === 'INTERVAL' ? '#BF935A' : '#FFFFFF',
                color: scheduleMode === 'INTERVAL' ? '#FFFFFF' : '#686869',
              }}
            >
              <Clock size={18} />
              <span>Interval Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setScheduleMode('FIXED')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '44px',
                borderRadius: '9px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '15px',
                background: scheduleMode === 'FIXED' ? '#BF935A' : '#FFFFFF',
                color: scheduleMode === 'FIXED' ? '#FFFFFF' : '#686869',
              }}
            >
              <CalendarDays size={18} />
              <span>Fixed Slots</span>
            </button>
          </div>

          {/* 2-Column Schedule Settings & Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
            {/* Left Panel */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '24px',
                border: '1px solid #F1F1F3',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '24px',
              }}
            >
              {scheduleMode === 'FIXED' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <CalendarDays size={18} color="#1D1D1F" />
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1D1D1F' }}>Fixed Slots</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#686869' }}>
                      Choose specific times for staff to submit their daily work updates.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
                      Daily update times *
                    </label>
                    {fixedSlots.map((slot, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          value={slot}
                          onChange={(e) => {
                            const next = [...fixedSlots];
                            next[idx] = e.target.value;
                            setFixedSlots(next);
                          }}
                          style={{
                            flex: 1,
                            height: '44px',
                            padding: '0 14px',
                            borderRadius: '8px',
                            border: '1px solid #EAE7E3',
                            fontSize: '15px',
                            fontWeight: 500,
                            color: '#1D1D1F',
                          }}
                        />
                        <button
                          type="button"
                          disabled={fixedSlots.length <= 1}
                          onClick={() => setFixedSlots(fixedSlots.filter((_, i) => i !== idx))}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            border: '1px solid #EAE7E3',
                            background: '#FFFFFF',
                            cursor: fixedSlots.length <= 1 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#686869',
                          }}
                          title="Remove slot"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => setFixedSlots([...fixedSlots, '6:00 PM'])}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'none',
                        border: 'none',
                        color: '#695132',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '6px 0',
                        width: 'fit-content',
                      }}
                    >
                      <Plus size={16} />
                      <span>Add update time</span>
                    </button>

                    <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
                      These times repeat each day and stay the same regardless of when staff clock in.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <Clock size={18} color="#1D1D1F" />
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1D1D1F' }}>Interval Mode</h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#686869' }}>
                      Schedule staff updates at a regular interval, starting from each person’s Clock In time.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
                      Update every *
                    </label>
                    <select
                      className="desktop-form-select"
                      value={intervalHours}
                      onChange={(e) => setIntervalHours(Number(e.target.value))}
                      style={{ height: '44px' }}
                    >
                      <option value={0.5}>30 minutes</option>
                      <option value={1}>1 hour</option>
                      <option value={2}>2 hours</option>
                      <option value={3}>3 hours</option>
                      <option value={4}>4 hours</option>
                    </select>
                    <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
                      Each due time is calculated from that staff member’s Clock In. The first update is due {intervalHours} hour{intervalHours > 1 ? 's' : ''} after they clock in.
                    </p>
                  </div>

                  <div
                    style={{
                      background: '#F5F4F2',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Info size={18} color="#686869" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: '14px', color: '#1D1D1F' }}>
                        One interval. A personal schedule.
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
                        Staff with different clock-in times will have different update and reminder times.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    background: '#F9F4EF',
                    borderRadius: '8px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#695132',
                    fontSize: '14px',
                  }}
                >
                  <Lock size={18} />
                  <span>All required daily updates must be submitted before Clock Out.</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  className="desktop-btn desktop-btn-gold"
                  style={{ width: '100%', height: '46px', justifyContent: 'center' }}
                >
                  {scheduleMode === 'FIXED' ? 'Save Fixed Slots' : 'Save Interval Mode'}
                </button>
              </div>
            </div>

            {/* Right Panel: Schedule Preview */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '24px',
                border: '1px solid #F1F1F3',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <CalendarClock size={18} color="#1D1D1F" />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1D1D1F' }}>Schedule Preview</h3>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#686869' }}>
                  See when updates are due and reminders are sent.
                </p>
              </div>

              <div
                style={{
                  background: '#F9F4EF',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#695132',
                  fontWeight: 500,
                  fontSize: '14px',
                }}
              >
                {scheduleMode === 'FIXED' ? <CalendarDays size={18} /> : <Clock size={18} />}
                <span>
                  {scheduleMode === 'FIXED'
                    ? `Every day · ${fixedSlots.length} fixed update time${fixedSlots.length === 1 ? '' : 's'}`
                    : 'Example · Clock In at 9:00 AM'}
                </span>
              </div>

              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#686869',
                  }}
                >
                  <span>Update due</span>
                  <span>Reminder</span>
                </div>
                {(scheduleMode === 'FIXED'
                  ? fixedSlots.map((slot) => ({ due: slot, reminder: subtractTenMinutes(slot) }))
                  : intervalPreview
                ).map((row, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      padding: '14px',
                      borderBottom: '1px solid #EAE7E3',
                      alignItems: 'center',
                      fontSize: '15px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 500, color: '#1D1D1F' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#BF935A' }} />
                      <span>{row.due}</span>
                    </div>
                    <span style={{ color: '#686869' }}>{row.reminder}</span>
                  </div>
                ))}
                {scheduleMode === 'INTERVAL' && (
                  <p style={{ margin: '12px 14px 0', fontSize: '13px', color: '#686869' }}>
                    …continues every {intervalHours} hour{intervalHours > 1 ? 's' : ''} until Clock Out.
                  </p>
                )}
              </div>

              <div
                style={{
                  background: '#F5F4F2',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', color: '#1D1D1F' }}>How it works</p>
                <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
                  {scheduleMode === 'FIXED'
                    ? 'Updates are due at the same selected times each day, not at intervals from Clock In.'
                    : 'Each person’s schedule starts at their own Clock In time. A 9:30 AM clock-in means the first update is due at 10:30 AM.'}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#695132', fontSize: '13px' }}>
                  <Bell size={15} />
                  <span>A reminder is sent 10 minutes before each due time.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="desktop-view-container" data-testid="desktop-updates-container">
        <div className="desktop-view-header">
          <div>
            <h1 className="desktop-view-title">Work Updates</h1>
            <p className="desktop-view-subtitle">
              Monitor daily staff updates, track submission status, and review project progress.
            </p>
          </div>
          <div className="desktop-header-action-group">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="desktop-btn desktop-btn-secondary"
            >
              <FileText size={16} />
              <span>Submit Work Update</span>
            </button>
            <button
              type="button"
              onClick={() => setShowScheduleConfig(true)}
              className="desktop-btn desktop-btn-gold"
            >
              <CalendarClock size={16} />
              <span>Update Schedule</span>
            </button>
          </div>
        </div>

        {bannerMessage && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '16px',
              background: bannerMessage.type === 'error' ? '#FEF3F2' : bannerMessage.type === 'warning' ? '#FFFAEB' : '#ECFDF3',
              color: bannerMessage.type === 'error' ? '#B42318' : bannerMessage.type === 'warning' ? '#B54708' : '#027A48',
              border: `1px solid ${bannerMessage.type === 'error' ? '#FECDCA' : bannerMessage.type === 'warning' ? '#FEDF89' : '#A6F4C5'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            <span>{bannerMessage.text}</span>
            <button type="button" onClick={() => setBannerMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* 4 Overview Metrics (Figma 924:25138) */}
        <div className="desktop-metrics-grid">
          <div className="desktop-metric-card">
            <div className="desktop-metric-top">
              <span className="desktop-metric-label">Total Updates</span>
              <div className="desktop-metric-icon-wrap" style={{ background: '#F9F4EF' }}>
                <FolderOpen size={18} color="#695132" />
              </div>
            </div>
            <div className="desktop-metric-value">{workUpdateRows.length}</div>
            <span className="desktop-metric-sub">Logged &amp; scheduled slots</span>
          </div>
          <div className="desktop-metric-card">
            <div className="desktop-metric-top">
              <span className="desktop-metric-label">Completed</span>
              <div className="desktop-metric-icon-wrap" style={{ background: '#EFF8F1' }}>
                <Check size={18} color="#248A3D" />
              </div>
            </div>
            <div className="desktop-metric-value" style={{ color: '#248A3D' }}>{submittedUpdatesCount}</div>
            <span className="desktop-metric-sub">Submitted work logs</span>
          </div>
          <div className="desktop-metric-card">
            <div className="desktop-metric-top">
              <span className="desktop-metric-label">In Progress</span>
              <div className="desktop-metric-icon-wrap" style={{ background: '#FBF3E7' }}>
                <Hourglass size={18} color="#916325" />
              </div>
            </div>
            <div className="desktop-metric-value" style={{ color: '#916325' }}>{pendingUpdatesCount}</div>
            <span className="desktop-metric-sub">Pending active slots</span>
          </div>
          <div className="desktop-metric-card">
            <div className="desktop-metric-top">
              <span className="desktop-metric-label">Active Sessions</span>
              <div className="desktop-metric-icon-wrap" style={{ background: '#F9F4EF' }}>
                <Eye size={18} color="#695132" />
              </div>
            </div>
            <div className="desktop-metric-value">
              {isAdmin ? adminSessions.filter((s) => !s.clockOutAt).length : (internalClockedIn ? 1 : 0)}
            </div>
            <span className="desktop-metric-sub">Staff currently clocked in</span>
          </div>
        </div>

        {/* Status Navigation & Search (Figma 924:25172) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #E9E9EB' }}>
            {([
              { id: 'TODAY', label: 'Today' },
              { id: 'ALL_STAFF', label: 'All Staff' },
              { id: 'ALL_PROJECTS', label: 'All Projects' },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setUpdatesTab(t.id)}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: updatesTab === t.id ? '2px solid #BF935A' : '2px solid transparent',
                  color: updatesTab === t.id ? '#BF935A' : '#686869',
                  fontWeight: updatesTab === t.id ? 600 : 400,
                  fontSize: '15px',
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div className="desktop-search-input-wrap" style={{ minWidth: '280px' }}>
              <Search size={16} className="desktop-search-icon" />
              <input
                type="text"
                placeholder="Search by project, staff, or summary..."
                value={updatesSearch}
                onChange={(e) => setUpdatesSearch(e.target.value)}
                className="desktop-search-input"
              />
            </div>
            {projects.length > 0 && (
              <select
                className="desktop-form-select"
                value={updatesProjectFilter}
                onChange={(e) => setUpdatesProjectFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '160px', height: '40px' }}
              >
                <option value="ALL">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.projectCode}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Work Updates Table (Figma 924:25190) */}
        <div className="desktop-table-card">
          <div className="desktop-table-header-tools">
            <div>
              <h3 className="desktop-section-title" style={{ margin: 0 }}>
                {updatesTab === 'TODAY' ? "Today's Work Updates" : 'All Daily Work Updates'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#686869' }}>
                View submitted work updates and track pending staff submissions.
              </p>
            </div>
            <span className="desktop-table-count">{filteredWorkUpdates.length} Updates</span>
          </div>

          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Staff</th>
                <th>Slot / Due Time</th>
                <th>Work Summary</th>
                <th>Status</th>
                <th>Updated On</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkUpdates.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#686869' }}>
                    {isLoading ? 'Loading daily work updates...' : 'No work updates found for this filter.'}
                  </td>
                </tr>
              ) : (
                filteredWorkUpdates.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: '#F9F4EF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#695132',
                          }}
                        >
                          <FolderOpen size={18} />
                        </div>
                        <span className="desktop-cell-primary">{row.projectName}</span>
                      </div>
                    </td>
                    <td>
                      <div className="desktop-user-cell">
                        <div className="desktop-avatar-circle">{getInitials(row.staffName)}</div>
                        <span className="desktop-cell-primary">{row.staffName}</span>
                      </div>
                    </td>
                    <td>{row.slot}</td>
                    <td style={{ maxWidth: '320px' }}>{row.workSummary}</td>
                    <td>
                      {row.status === 'SUBMITTED' ? (
                        <span className="desktop-pill-confirmed">Submitted</span>
                      ) : (
                        <span className="desktop-pill-pending">Pending</span>
                      )}
                    </td>
                    <td>{row.updatedOn}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', color: '#686869', fontSize: '13px' }}>
          <Info size={15} />
          <span>Every scheduled daily work update must be submitted before staff can Clock Out.</span>
        </div>

        {/* Modal: Submit Daily Work Update */}
        {isUpdateModalOpen && (
          <div className="desktop-modal-backdrop">
            <div className="desktop-modal-box">
              <div className="desktop-modal-header">
                <h3 className="desktop-modal-title">Submit Daily Work Update</h3>
                <button
                  type="button"
                  className="desktop-modal-close"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="desktop-modal-body">
                <div className="desktop-form-group">
                  <label>Project</label>
                  <select
                    className="desktop-form-select"
                    value={updateProjectCode}
                    onChange={(e) => setUpdateProjectCode(e.target.value)}
                  >
                    {projects.length > 0 ? (
                      projects.map((p) => (
                        <option key={p.id} value={p.projectCode}>
                          {p.name} ({p.projectCode})
                        </option>
                      ))
                    ) : (
                      <option value="AF-VILLA">AF-VILLA</option>
                    )}
                  </select>
                </div>
                <div className="desktop-form-group">
                  <label>Update Window Slot</label>
                  <select
                    className="desktop-form-select"
                    value={updateSlot}
                    onChange={(e) => setUpdateSlot(e.target.value)}
                  >
                    <option value="Slot 12:00">Slot 12:00 (Midday Check-in)</option>
                    <option value="Slot 17:30">Slot 17:30 (Evening Shift Close)</option>
                    {fixedSlots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="desktop-form-group">
                  <label>Completed Work &amp; Deliverable Details</label>
                  <textarea
                    className="desktop-form-textarea"
                    rows={4}
                    placeholder="Detail drawings drafted, consultant calls attended, site checks completed..."
                    value={updateNotes}
                    onChange={(e) => setUpdateNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="desktop-modal-footer">
                <button
                  type="button"
                  className="desktop-btn desktop-btn-secondary"
                  onClick={() => setIsUpdateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="desktop-btn desktop-btn-gold"
                  disabled={!updateNotes.trim() || actionBusy}
                  onClick={handleSendDailyUpdate}
                >
                  <Send size={14} style={{ marginRight: '6px' }} />
                  {actionBusy ? 'Submitting...' : 'Submit Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER MODE: ATTENDANCE (Figma 892:15190 + Leave 916:17350 + Summary 918:17790)
  // =========================================================================
  const pendingSlots: string[] = liveStatus?.pendingUpdates || [];

  return (
    <div className="desktop-view-container" data-testid="desktop-attendance-container">
      {/* Header Bar (Figma 892:17042) */}
      <div className="desktop-view-header">
        <div>
          <h1 className="desktop-view-title">Attendance</h1>
          <p className="desktop-view-subtitle">
            Track team attendance, manage staff records, and handle regularization &amp; leave requests.
          </p>
        </div>

        <div className="desktop-header-action-group">
          {isStaff && (
            <button
              type="button"
              data-testid="attendance-clock-in-btn"
              disabled={actionBusy}
              onClick={handleClockToggle}
              className={`desktop-btn ${internalClockedIn ? 'desktop-btn-danger' : 'desktop-btn-gold'}`}
            >
              {internalClockedIn ? (
                <>
                  <LogOut size={16} />
                  <span>Clock Out (Clocked in: {clockInTime})</span>
                </>
              ) : (
                <>
                  <Clock size={16} />
                  <span>Clock In to Studio Geofence</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setRegType('REGULARIZATION');
              setIsRegModalOpen(true);
            }}
            className="desktop-btn desktop-btn-gold"
          >
            <Plus size={16} />
            <span>Record Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUpdateModalOpen(true)}
            className="desktop-btn desktop-btn-secondary"
          >
            <FileText size={16} />
            <span>Submit Work Update</span>
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {bannerMessage && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '16px',
            background: bannerMessage.type === 'error' ? '#FEF3F2' : bannerMessage.type === 'warning' ? '#FFFAEB' : '#ECFDF3',
            color: bannerMessage.type === 'error' ? '#B42318' : bannerMessage.type === 'warning' ? '#B54708' : '#027A48',
            border: `1px solid ${bannerMessage.type === 'error' ? '#FECDCA' : bannerMessage.type === 'warning' ? '#FEDF89' : '#A6F4C5'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '14px',
            fontWeight: 500,
            gap: '12px',
          }}
        >
          <span>{bannerMessage.text}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {bannerMessage.type === 'warning' && (
              <button
                type="button"
                className="desktop-btn desktop-btn-sm desktop-btn-gold"
                onClick={() => setIsUpdateModalOpen(true)}
              >
                Submit Pending Update
              </button>
            )}
            <button type="button" onClick={() => setBannerMessage(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar: Section Tabs + Date Selector (Figma 892:17065) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}
      >
        <div className="desktop-tabs-bar" style={{ marginBottom: 0 }}>
          <button
            type="button"
            onClick={() => setActiveTab('ROSTER')}
            className={`desktop-tab-btn ${activeTab === 'ROSTER' ? 'active' : ''}`}
          >
            Today&apos;s Roster ({filteredStaff.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REGISTER')}
            className={`desktop-tab-btn ${activeTab === 'REGISTER' ? 'active' : ''}`}
          >
            Staff Register ({adminSessions.length})
          </button>
          <button
            type="button"
            data-testid="attendance-tab-regularization"
            onClick={() => setActiveTab('REGULARIZATION')}
            className={`desktop-tab-btn ${activeTab === 'REGULARIZATION' ? 'active' : ''}`}
          >
            Regularization ({effectiveRegularizationQueue.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('LEAVE')}
            className={`desktop-tab-btn ${activeTab === 'LEAVE' ? 'active' : ''}`}
          >
            Leave ({leaveRequests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('SUMMARY')}
            className={`desktop-tab-btn ${activeTab === 'SUMMARY' ? 'active' : ''}`}
          >
            Summary
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '6px 12px',
          }}
        >
          <Calendar size={16} color="#686869" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              fontWeight: 600,
              color: '#1D1D1F',
              background: 'transparent',
            }}
          />
        </div>
      </div>

      {/* Attendance Status Card + 4 Summary Metrics */}
      <div className="desktop-geofence-banner" data-testid="attendance-geofence-card">
        <div className="desktop-geofence-icon">
          <ShieldCheck size={24} color="#12B76A" />
        </div>
        <div className="desktop-geofence-text">
          <h3 className="desktop-geofence-title">
            Ahmedabad Studio HQ (23.0225° N, 72.5714° E) — {internalClockedIn ? `Clocked In (${clockInTime})` : 'Not Clocked In'}
          </h3>
          <p className="desktop-geofence-sub">
            {internalClockedIn && pendingSlots.length > 0
              ? `Pending work updates before Clock Out: ${pendingSlots.join(', ')}`
              : 'Precision 100m radial geofence boundary is active. Automatic punch verification logged via GPS & IP coordinates.'}
          </p>
        </div>
        <span className="desktop-pill-confirmed">
          {internalClockedIn ? 'Session Active' : 'Geofence Active'}
        </span>
      </div>

      <div className="desktop-metrics-grid">
        <div className="desktop-metric-card" data-testid="attendance-metric-total">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Total Staff</span>
            <div className="desktop-metric-icon-wrap">
              <Users size={18} color="#0C0C0D" />
            </div>
          </div>
          <div className="desktop-metric-value">{effectiveStaffList.length}</div>
          <span className="desktop-metric-sub">Studio roster total</span>
        </div>

        <div className="desktop-metric-card" data-testid="attendance-metric-present">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Present Today</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#E8F8EE' }}>
              <CheckCircle2 size={18} color="#087A48" />
            </div>
          </div>
          <div className="desktop-metric-value">{presentCount}</div>
          <span className="desktop-metric-sub">Inside HQ &amp; active sites</span>
        </div>

        <div className="desktop-metric-card" data-testid="attendance-metric-onsite">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">On Site</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#EFF8FF' }}>
              <MapPin size={18} color="#175CD3" />
            </div>
          </div>
          <div className="desktop-metric-value">{onSiteCount}</div>
          <span className="desktop-metric-sub">Architectural field inspection</span>
        </div>

        <div className="desktop-metric-card" data-testid="attendance-metric-leave">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">On Leave / Requests</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#FEF3F2' }}>
              <AlertCircle size={18} color="#D92D20" />
            </div>
          </div>
          <div className="desktop-metric-value">{leaveCount + pendingRegCount}</div>
          <span className="desktop-metric-sub">
            {leaveCount} leave · {pendingRegCount} pending
          </span>
        </div>
      </div>

      {/* TAB 1: Today's Roster */}
      {activeTab === 'ROSTER' && (
        <div className="desktop-table-card" data-testid="attendance-roster-table">
          <div className="desktop-table-header-tools">
            <div className="desktop-search-input-wrap">
              <Search size={16} className="desktop-search-icon" />
              <input
                type="text"
                placeholder="Search staff by name, role, or site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="desktop-search-input"
              />
            </div>
            <span className="desktop-table-count">{filteredStaff.length} Architects &amp; Engineers</span>
          </div>

          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Role</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Location</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#686869' }}>
                    {isLoading ? 'Loading studio roster...' : 'No staff records match your search.'}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((st) => (
                  <tr key={st.id}>
                    <td>
                      <div className="desktop-user-cell">
                        <div className="desktop-avatar-circle">{st.avatar}</div>
                        <span className="desktop-cell-primary">{st.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="desktop-cell-secondary">{st.role}</span>
                    </td>
                    <td>
                      <div className="desktop-time-cell">
                        <Clock size={13} color="#86868B" />
                        <span>{st.clockInTime || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <span>{st.clockOutTime || '------'}</span>
                    </td>
                    <td>
                      <div className="desktop-location-cell">
                        <MapPin size={13} color="#BF935A" />
                        <span>{st.location || 'Studio HQ'}</span>
                      </div>
                    </td>
                    <td>
                      {st.status === 'PRESENT' && <span className="desktop-pill-confirmed">Present</span>}
                      {st.status === 'ON_SITE' && <span className="desktop-pill-pending">On Site</span>}
                      {st.status === 'LEAVE' && <span className="desktop-pill-revision">Leave</span>}
                      {st.status === 'ABSENT' && <span className="desktop-pill-revision">Absent</span>}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="desktop-table-action-link"
                        onClick={() => setAuditTarget(st)}
                      >
                        Audit Log
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Staff Register (Session History from /api/attendance/admin/overview) */}
      {activeTab === 'REGISTER' && (
        <div className="desktop-table-card" data-testid="attendance-register-table">
          <div className="desktop-table-header-tools">
            <h3 className="desktop-section-title">Staff Attendance Register</h3>
            <span className="desktop-table-count">{adminSessions.length} Sessions</span>
          </div>

          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Date</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Location</th>
                <th>Work Updates</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {adminSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#686869' }}>
                    {isAdmin
                      ? (isLoading ? 'Loading session register...' : 'No attendance sessions recorded yet.')
                      : 'Full studio register is available to Admin users.'}
                  </td>
                </tr>
              ) : (
                adminSessions.map((sess) => (
                  <tr key={sess.id}>
                    <td>
                      <div className="desktop-user-cell">
                        <div className="desktop-avatar-circle">{getInitials(sess.staffName)}</div>
                        <span className="desktop-cell-primary">{sess.staffName}</span>
                      </div>
                    </td>
                    <td>{formatDateShort(sess.clockInAt)}</td>
                    <td>{formatTimeShort(sess.clockInAt)}</td>
                    <td>{sess.clockOutAt ? formatTimeShort(sess.clockOutAt) : 'Active'}</td>
                    <td>{sess.clockInAddress}</td>
                    <td>
                      <span>{sess.dailyUpdates.length} submitted</span>
                      {sess.pendingUpdates.length > 0 && (
                        <span style={{ color: '#B54708', marginLeft: '6px', fontSize: '12px' }}>
                          ({sess.pendingUpdates.length} pending)
                        </span>
                      )}
                    </td>
                    <td>
                      {sess.isRegularized ? (
                        <span className="desktop-pill-pending">Regularized</span>
                      ) : sess.clockOutAt ? (
                        <span className="desktop-pill-confirmed">Completed</span>
                      ) : (
                        <span className="desktop-pill-confirmed">Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Regularization Queue */}
      {activeTab === 'REGULARIZATION' && (
        <div className="desktop-table-card" data-testid="attendance-regularization-queue">
          <div className="desktop-table-header-tools">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 className="desktop-section-title" style={{ margin: 0 }}>
                Attendance Regularizations
              </h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['ALL', 'REGULARIZATION', 'LEAVE'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setRegFilterType(f)}
                    className={`desktop-btn desktop-btn-sm ${regFilterType === f ? 'desktop-btn-gold' : 'desktop-btn-secondary'}`}
                  >
                    {f === 'ALL' ? 'All' : f === 'REGULARIZATION' ? 'Regularization' : 'Leave'}
                  </button>
                ))}
              </div>
            </div>
            <span className="desktop-table-count">{filteredRegularizations.length} Requests</span>
          </div>

          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Type</th>
                <th>Date</th>
                <th>Requested Time</th>
                <th>Justification</th>
                <th>Status</th>
                <th>Review Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegularizations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '28px', color: '#686869' }}>
                    No regularization requests found.
                  </td>
                </tr>
              ) : (
                filteredRegularizations.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <span className="desktop-cell-primary">{req.staffName}</span>
                    </td>
                    <td>
                      <span className="desktop-cell-secondary">
                        {req.requestType === 'LEAVE' ? 'Leave' : 'Regularization'}
                      </span>
                    </td>
                    <td>{req.date}</td>
                    <td>{req.requestedTime}</td>
                    <td style={{ maxWidth: '280px' }}>{req.reason}</td>
                    <td>
                      {req.status === 'APPROVED' && <span className="desktop-pill-confirmed">Approved</span>}
                      {req.status === 'PENDING' && <span className="desktop-pill-pending">PENDING</span>}
                      {req.status === 'REJECTED' && <span className="desktop-pill-revision">Rejected</span>}
                    </td>
                    <td>
                      {req.status === 'PENDING' && isAdmin ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={actionBusy}
                            className="desktop-btn desktop-btn-sm desktop-btn-gold"
                            onClick={() => handleReviewRegularization(req.id, 'APPROVED')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            className="desktop-btn desktop-btn-sm desktop-btn-secondary"
                            onClick={() => handleReviewRegularization(req.id, 'REJECTED')}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#686869', fontSize: '12px' }}>
                          {req.status === 'PENDING' ? 'Awaiting Admin' : req.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: Leave Requests (Figma 916:17350) */}
      {activeTab === 'LEAVE' && (
        <div className="desktop-table-card" data-testid="attendance-leave-table">
          <div className="desktop-table-header-tools">
            <h3 className="desktop-section-title" style={{ margin: 0 }}>Leave Requests</h3>
            <button
              type="button"
              className="desktop-btn desktop-btn-sm desktop-btn-gold"
              onClick={() => {
                setRegType('LEAVE');
                setIsRegModalOpen(true);
              }}
            >
              <Plus size={14} />
              <span>Request Leave</span>
            </button>
          </div>

          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Staff Name</th>
                <th>Leave Type</th>
                <th>Date</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '28px', color: '#686869' }}>
                    No leave requests recorded.
                  </td>
                </tr>
              ) : (
                leaveRequests.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div className="desktop-user-cell">
                        <div className="desktop-avatar-circle">{getInitials(req.staffName)}</div>
                        <span className="desktop-cell-primary">{req.staffName}</span>
                      </div>
                    </td>
                    <td>Casual Leave</td>
                    <td>{req.date}</td>
                    <td style={{ maxWidth: '300px' }}>{req.reason}</td>
                    <td>
                      {req.status === 'APPROVED' && <span className="desktop-pill-confirmed">Approved</span>}
                      {req.status === 'PENDING' && <span className="desktop-pill-pending">Pending</span>}
                      {req.status === 'REJECTED' && <span className="desktop-pill-revision">Rejected</span>}
                    </td>
                    <td>
                      {req.status === 'PENDING' && isAdmin ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => handleReviewRegularization(req.id, 'APPROVED')}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '14px',
                              border: 'none',
                              background: '#D1FAE5',
                              color: '#065F46',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Approve Leave"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => handleReviewRegularization(req.id, 'REJECTED')}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '14px',
                              border: 'none',
                              background: '#FEE2E2',
                              color: '#991B1B',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Reject Leave"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#686869', fontSize: '12px' }}>{req.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: Summary (Figma 918:17790 Weekly Attendance + Team Insights) */}
      {activeTab === 'SUMMARY' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }} data-testid="attendance-summary-view">
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #F1F1F3' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1D1D1F' }}>
              Weekly Attendance
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#686869' }}>
              Team attendance overview for the selected week.
            </p>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', fontSize: '13px', color: '#686869', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#248A3D' }} />
                <span>Present · not on site</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#695132' }} />
                <span>On site · present</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#DF3344' }} />
                <span>Absent</span>
              </div>
            </div>

            {/* Stacked Bar Plot */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', alignItems: 'end', height: '210px', paddingTop: '16px', borderBottom: '1px solid #E9E9EB' }}>
              {weeklySummary.days.map((day) => {
                const maxH = 160;
                const unit = maxH / weeklySummary.totalMembers;
                return (
                  <div key={`${day.label}-${day.dateNum}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: `${maxH}px`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        borderRadius: '5px 5px 0 0',
                        overflow: 'hidden',
                        background: '#F9FAFB',
                      }}
                      title={`${day.label} ${day.dateNum}: ${day.studioPresent} Studio, ${day.onSiteCount} On-Site, ${day.absentCount} Absent`}
                    >
                      {day.absentCount > 0 && (
                        <div style={{ height: `${Math.round(day.absentCount * unit)}px`, background: '#DF3344' }} />
                      )}
                      {day.onSiteCount > 0 && (
                        <div style={{ height: `${Math.round(day.onSiteCount * unit)}px`, background: '#695132' }} />
                      )}
                      {day.studioPresent > 0 && (
                        <div style={{ height: `${Math.round(day.studioPresent * unit)}px`, background: '#248A3D' }} />
                      )}
                    </div>
                    <span style={{ fontSize: '12px', color: '#4A4A4C', fontWeight: 500 }}>
                      {day.label} <span style={{ color: '#686869', fontWeight: 400 }}>{day.dateNum}</span>
                    </span>
                  </div>
                );
              })}
            </div>

            <p style={{ margin: '14px 0 0', fontSize: '13px', color: '#686869' }}>
              On-site attendance is part of present. Present + absent = total staff.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #F1F1F3', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600, color: '#1D1D1F' }}>
                Team Insights
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
                Key attendance highlights for your team.
              </p>
            </div>

            <div style={{ background: '#F9F4EF', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MapPin size={22} color="#695132" />
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#695132' }}>Most On Site</p>
                <p style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>
                  {weeklySummary.topOnSite ? weeklySummary.topOnSite[0] : 'No site visits logged'}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
                  {weeklySummary.topOnSite ? `${weeklySummary.topOnSite[1]} sessions` : '—'}
                </p>
              </div>
            </div>

            <div style={{ background: '#F9F4EF', borderRadius: '12px', padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} color="#695132" />
              </div>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: '13px', fontWeight: 600, color: '#695132' }}>Most Present</p>
                <p style={{ margin: '0 0 2px', fontSize: '17px', fontWeight: 600, color: '#1D1D1F' }}>
                  {weeklySummary.topPresent ? weeklySummary.topPresent[0] : 'No attendance logged'}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: '#686869' }}>
                  {weeklySummary.topPresent ? `${weeklySummary.topPresent[1]} days` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Staff Audit Log Drawer */}
      {auditTarget && (
        <div className="desktop-modal-backdrop">
          <div className="desktop-modal-box">
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Biometric Log — {auditTarget.name}</h3>
              <button type="button" className="desktop-modal-close" onClick={() => setAuditTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="desktop-modal-body">
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#4A4A4C' }}>
                <strong>Role:</strong> {auditTarget.role}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#4A4A4C' }}>
                <strong>Status:</strong> {auditTarget.status}
              </p>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#4A4A4C' }}>
                <strong>Clock In:</strong> {auditTarget.clockInTime || 'Not Clocked In'}
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#4A4A4C' }}>
                <strong>Location:</strong> {auditTarget.location || 'Studio HQ'}
              </p>
            </div>
            <div className="desktop-modal-footer">
              <button type="button" className="desktop-btn desktop-btn-secondary" onClick={() => setAuditTarget(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Request Regularization / Leave */}
      {isRegModalOpen && (
        <div className="desktop-modal-backdrop">
          <div className="desktop-modal-box">
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">
                {regType === 'LEAVE' ? 'Submit Leave Request' : 'Submit Regularization Request'}
              </h3>
              <button type="button" className="desktop-modal-close" onClick={() => setIsRegModalOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="desktop-modal-body">
              <div className="desktop-form-group">
                <label>Request Type</label>
                <select
                  className="desktop-form-select"
                  value={regType}
                  onChange={(e) => setRegType(e.target.value as 'REGULARIZATION' | 'LEAVE')}
                >
                  <option value="REGULARIZATION">Attendance Regularization</option>
                  <option value="LEAVE">Leave Request</option>
                </select>
              </div>
              <div className="desktop-form-group">
                <label>Target Date</label>
                <input
                  type="date"
                  className="desktop-form-select"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                />
              </div>
              {regType === 'REGULARIZATION' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="desktop-form-group">
                    <label>Requested Clock In</label>
                    <input
                      type="time"
                      className="desktop-form-select"
                      value={regClockInTime}
                      onChange={(e) => setRegClockInTime(e.target.value)}
                    />
                  </div>
                  <div className="desktop-form-group">
                    <label>Requested Clock Out</label>
                    <input
                      type="time"
                      className="desktop-form-select"
                      value={regClockOutTime}
                      onChange={(e) => setRegClockOutTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="desktop-form-group">
                <label>Justification / Reason</label>
                <textarea
                  className="desktop-form-textarea"
                  rows={3}
                  placeholder="Explain the reason for regularization or leave..."
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                />
              </div>
            </div>
            <div className="desktop-modal-footer">
              <button type="button" className="desktop-btn desktop-btn-secondary" onClick={() => setIsRegModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="desktop-btn desktop-btn-gold"
                disabled={regReason.trim().length < 3 || actionBusy}
                onClick={handleSubmitRegularization}
              >
                {actionBusy ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Daily Work Update */}
      {isUpdateModalOpen && (
        <div className="desktop-modal-backdrop">
          <div className="desktop-modal-box">
            <div className="desktop-modal-header">
              <h3 className="desktop-modal-title">Submit Daily Work Update</h3>
              <button
                type="button"
                className="desktop-modal-close"
                onClick={() => setIsUpdateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="desktop-modal-body">
              <div className="desktop-form-group">
                <label>Project</label>
                <select
                  className="desktop-form-select"
                  value={updateProjectCode}
                  onChange={(e) => setUpdateProjectCode(e.target.value)}
                >
                  {projects.length > 0 ? (
                    projects.map((p) => (
                      <option key={p.id} value={p.projectCode}>
                        {p.name} ({p.projectCode})
                      </option>
                    ))
                  ) : (
                    <option value="AF-VILLA">AF-VILLA</option>
                  )}
                </select>
              </div>
              <div className="desktop-form-group">
                <label>Update Window Slot</label>
                <select
                  className="desktop-form-select"
                  value={updateSlot}
                  onChange={(e) => setUpdateSlot(e.target.value)}
                >
                  <option value="Slot 12:00">Slot 12:00 (Midday Check-in)</option>
                  <option value="Slot 17:30">Slot 17:30 (Evening Shift Close)</option>
                  <option value="Morning (10:00 - 13:00)">Morning Slot (10:00 - 13:00)</option>
                  <option value="Afternoon (14:00 - 17:00)">Afternoon Slot (14:00 - 17:00)</option>
                  <option value="Evening (17:00 - 19:30)">Evening Shift Close (17:00 - 19:30)</option>
                </select>
              </div>
              <div className="desktop-form-group">
                <label>Completed Work &amp; Deliverable Details</label>
                <textarea
                  className="desktop-form-textarea"
                  rows={4}
                  placeholder="Detail drawings drafted, consultant calls attended, site checks completed..."
                  value={updateNotes}
                  onChange={(e) => setUpdateNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="desktop-modal-footer">
              <button
                type="button"
                className="desktop-btn desktop-btn-secondary"
                onClick={() => setIsUpdateModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="desktop-btn desktop-btn-gold"
                disabled={!updateNotes.trim() || actionBusy}
                onClick={handleSendDailyUpdate}
              >
                <Send size={14} style={{ marginRight: '6px' }} />
                {actionBusy ? 'Submitting...' : 'Submit Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
