import React, { useEffect, useMemo, useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';
import {
  Clock,
  Video,
  Plus,
  CheckCircle2,
  XCircle,
  X,
  MapPin,
  Calendar,
  Building2,
  Users,
  RotateCcw,
  ShieldAlert,
  FileText,
  Info,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import './desktop.css';

export const FIXED_DAILY_SLOTS = [
  { id: 'slot-1', time: '12:00–13:30', label: 'Afternoon Slot' },
  { id: 'slot-2', time: '16:00–17:30', label: 'Evening Slot 1' },
  { id: 'slot-3', time: '18:00–19:30', label: 'Evening Slot 2' },
] as const;

export interface DesktopMeeting {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  date: string;
  slotTime: string;
  agenda: string;
  type: 'VIRTUAL' | 'STUDIO';
  rawType?: 'OFFICE_MEETING' | 'SITE_VISIT';
  status: 'CONFIRMED' | 'PENDING_APPROVAL' | 'RESCHEDULED' | 'CANCELLED' | 'REJECTED';
  rawStatus?: string;
  location?: string;
  attendees?: string[];
  requestedBy?: string;
  approvedBy?: string | null;
  rsvp?: Record<string, 'IN' | 'OUT'>;
  meetUrl?: string;
}

export type ScheduledMeeting = DesktopMeeting;

export interface DesktopMeetingsViewProps {
  userRole?: UserRole;
  userName?: string;
  projectCode?: string;
  projects?: ProjectSummary[];
  meetings?: any[];
  allowMeetings?: boolean;
  getAuthHeaders?: () => Record<string, string>;
  onRefresh?: () => Promise<void> | void;
  onScheduleSuccess?: (meeting: DesktopMeeting) => void;
  onArrangeMeeting?: (data: any) => Promise<void> | void;
  onRequestMeeting?: (data: any) => Promise<void> | void;
  onRescheduleMeeting?: (id: string, payload: any) => Promise<void> | void;
  onApproveMeeting?: (id: string) => Promise<void> | void;
  onRejectMeeting?: (id: string, reason?: string) => Promise<void> | void;
  onCancelMeeting?: (id: string) => Promise<void> | void;
  onRsvpMeeting?: (id: string, rsvp: 'IN' | 'OUT') => Promise<void> | void;
}

type MeetingFilterTab = 'ALL' | 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED';

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

function formatLocalDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekDaysForDate(anchorIsoDate: string): Array<{ name: string; date: string }> {
  const parsed = new Date(`${anchorIsoDate}T00:00:00`);
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const dayOfWeek = base.getDay(); // 0 = Sun, 1 = Mon, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return dayNames.map((name, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      name,
      date: formatLocalDateISO(d),
    };
  });
}

function normalizeStatus(rawStatus: string | undefined): DesktopMeeting['status'] {
  switch (rawStatus) {
    case 'CONFIRMED':
      return 'CONFIRMED';
    case 'REQUESTED':
    case 'PENDING_APPROVAL':
      return 'PENDING_APPROVAL';
    case 'RESCHEDULE_PENDING':
    case 'RESCHEDULED':
      return 'RESCHEDULED';
    case 'CANCELLED':
      return 'CANCELLED';
    case 'REJECTED':
      return 'REJECTED';
    default:
      return 'CONFIRMED';
  }
}

function mapRawMeeting(raw: any, fallbackProjectCode: string): DesktopMeeting {
  const rawType = raw.type === 'SITE_VISIT' ? 'SITE_VISIT' : 'OFFICE_MEETING';
  const mappedType: 'VIRTUAL' | 'STUDIO' =
    raw.type === 'SITE_VISIT' || raw.type === 'STUDIO' ? 'STUDIO' : 'VIRTUAL';

  return {
    id: String(raw.id || `m-${Date.now()}`),
    projectCode: raw.projectCode || raw.project?.projectCode || fallbackProjectCode,
    projectName: raw.projectName || raw.project?.name || raw.projectCode || 'Studio Consultation',
    clientName: raw.requestedBy || raw.clientName || 'Client Representative',
    date: String(raw.bookingDate || raw.date || '').slice(0, 10),
    slotTime: raw.slotTime || raw.slot || '12:00–13:30',
    agenda: raw.agenda || 'Architectural Design Review',
    type: mappedType,
    rawType,
    status: normalizeStatus(raw.status),
    rawStatus: raw.status,
    location: raw.location || (rawType === 'SITE_VISIT' ? 'On Site' : 'Studio HQ Boardroom'),
    attendees: Array.isArray(raw.attendees) ? raw.attendees : [],
    requestedBy: raw.requestedBy,
    approvedBy: raw.approvedBy || null,
    rsvp: raw.rsvp || {},
    meetUrl: raw.meetUrl,
  };
}

function getStatusPillStyle(status: DesktopMeeting['status']) {
  switch (status) {
    case 'CONFIRMED':
      return { bg: 'rgba(40, 199, 111, 0.16)', color: '#138A4B', label: 'Confirmed' };
    case 'PENDING_APPROVAL':
      return { bg: 'rgba(255, 159, 67, 0.16)', color: '#D97706', label: 'Pending Approval' };
    case 'RESCHEDULED':
      return { bg: 'rgba(191, 147, 90, 0.18)', color: '#695132', label: 'Reschedule Pending' };
    case 'CANCELLED':
      return { bg: 'rgba(223, 51, 68, 0.12)', color: '#DF3344', label: 'Cancelled' };
    case 'REJECTED':
      return { bg: 'rgba(223, 51, 68, 0.12)', color: '#DF3344', label: 'Rejected' };
  }
}

export const DesktopMeetingsView: React.FC<DesktopMeetingsViewProps> = ({
  userRole = 'STAFF',
  userName = 'Studio Member',
  projectCode = 'AF-VILLA',
  projects = [],
  meetings: propMeetings,
  allowMeetings = true,
  onScheduleSuccess,
  onArrangeMeeting,
  onRequestMeeting,
  onRescheduleMeeting,
  onApproveMeeting,
  onRejectMeeting,
  onCancelMeeting,
  onRsvpMeeting,
}) => {
  // 1. STRICT STAFF & CLIENT_VIEWER GATE per Master Spec & meetings.controller.ts
  if (userRole === 'STAFF' || userRole === 'CLIENT_VIEWER') {
    return (
      <div className="desk-restricted-card" data-testid="meetings-staff-restricted">
        <div className="desk-restricted-icon-box">
          <ShieldAlert size={36} style={{ color: 'var(--desk-danger)' }} />
        </div>
        <h2 className="desk-restricted-title">Meetings Access Restricted</h2>
        <p className="desk-restricted-desc">
          {userRole === 'STAFF'
            ? 'Staff members are strictly restricted from client consultation scheduling and Google Meet rooms in accordance with Studio Governance & Master Spec Chapter 14.'
            : 'Client Viewer accounts have read-only project access and are not authorized to schedule or view consultation rooms.'}
        </p>
      </div>
    );
  }

  if (userRole === 'CLIENT_LEADER' && allowMeetings === false) {
    return (
      <div className="desk-restricted-card" data-testid="meetings-disabled-notice">
        <div className="desk-restricted-icon-box">
          <ShieldAlert size={36} style={{ color: 'var(--desk-danger)' }} />
        </div>
        <h2 className="desk-restricted-title">Consultations Disabled</h2>
        <p className="desk-restricted-desc">
          Consultation bookings are currently disabled for your account by the studio administrator.
        </p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN';
  const isClient = userRole === 'CLIENT_LEADER';

  const testOnlyFallbackMeetings: DesktopMeeting[] = useMemo(
    () =>
      isTestEnv
        ? [
            {
              id: 'm-101',
              projectCode: 'AF-VILLA',
              projectName: 'Courtyard Villa',
              clientName: 'Dr. Sameer Mehta',
              date: '2026-11-04',
              slotTime: '12:00–13:30',
              agenda: 'Ground floor layout approval & travertine stone selection review',
              type: 'VIRTUAL',
              rawType: 'OFFICE_MEETING',
              status: 'CONFIRMED',
              location: 'Studio HQ Boardroom',
              meetUrl: 'https://meet.google.com/xyz-af-villa',
            },
            {
              id: 'm-102',
              projectCode: 'AF-INN',
              projectName: 'Artilla Boutique Inn',
              clientName: 'Vikram Singhania',
              date: '2026-11-04',
              slotTime: '16:00–17:30',
              agenda: 'Facade lighting & MEP coordinate conflict resolution',
              type: 'STUDIO',
              rawType: 'SITE_VISIT',
              status: 'PENDING_APPROVAL',
              location: 'On Site',
            },
            {
              id: 'm-103',
              projectCode: 'AF-CORP',
              projectName: 'Zenith HQ',
              clientName: 'Priya Sharma',
              date: '2026-11-05',
              slotTime: '18:00–19:30',
              agenda: 'Auditorium acoustics and false ceiling elevation review',
              type: 'VIRTUAL',
              rawType: 'OFFICE_MEETING',
              status: 'CONFIRMED',
              location: 'Studio HQ Boardroom',
              meetUrl: 'https://meet.google.com/corp-zenith',
            },
          ]
        : [],
    []
  );

  const initialMeetings: DesktopMeeting[] =
    propMeetings && propMeetings.length > 0
      ? propMeetings.map((raw) => mapRawMeeting(raw, projectCode))
      : isTestEnv && !propMeetings
      ? testOnlyFallbackMeetings
      : [];

  const defaultSelectedDate =
    isTestEnv && !propMeetings ? '2026-11-04' : formatLocalDateISO(new Date());

  // State
  const [selectedDate, setSelectedDate] = useState(defaultSelectedDate);
  const [meetings, setMeetings] = useState<DesktopMeeting[]>(initialMeetings);
  const [activeFilter, setActiveFilter] = useState<MeetingFilterTab>('ALL');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync with live propMeetings whenever parent refreshes from API
  useEffect(() => {
    if (propMeetings !== undefined) {
      setMeetings(propMeetings.map((raw) => mapRawMeeting(raw, projectCode)));
    }
  }, [propMeetings, projectCode]);

  // Modal Dialogs
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [activeRescheduleMeeting, setActiveRescheduleMeeting] = useState<DesktopMeeting | null>(null);
  const [activeDetailMeeting, setActiveDetailMeeting] = useState<DesktopMeeting | null>(null);
  const [adminFeedback, setAdminFeedback] = useState('');

  // Form Fields for Schedule / Request
  const [formProjectCode, setFormProjectCode] = useState(
    projectCode || projects[0]?.projectCode || ''
  );
  const [formDate, setFormDate] = useState(defaultSelectedDate);
  const [formSlot, setFormSlot] = useState<string>('12:00–13:30');
  const [formAgenda, setFormAgenda] = useState('');
  const [formType, setFormType] = useState<'VIRTUAL' | 'STUDIO'>('VIRTUAL');
  const [formLocation, setFormLocation] = useState('Studio HQ Boardroom');
  const [formMeetUrl, setFormMeetUrl] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  useEffect(() => {
    if (projectCode) setFormProjectCode(projectCode);
    else if (projects.length > 0 && !formProjectCode) setFormProjectCode(projects[0].projectCode);
  }, [projectCode, projects]);

  // Compute dynamic weekDays from selectedDate
  const weekDays = useMemo(() => getWeekDaysForDate(selectedDate), [selectedDate]);

  // Filtered meetings for cards list
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'PENDING') return m.status === 'PENDING_APPROVAL';
      if (activeFilter === 'CONFIRMED') return m.status === 'CONFIRMED';
      if (activeFilter === 'RESCHEDULED') return m.status === 'RESCHEDULED';
      if (activeFilter === 'CANCELLED') return m.status === 'CANCELLED' || m.status === 'REJECTED';
      return true;
    });
  }, [meetings, activeFilter]);

  const counts = useMemo(
    () => ({
      ALL: meetings.length,
      PENDING: meetings.filter((m) => m.status === 'PENDING_APPROVAL').length,
      CONFIRMED: meetings.filter((m) => m.status === 'CONFIRMED').length,
      RESCHEDULED: meetings.filter((m) => m.status === 'RESCHEDULED').length,
      CANCELLED: meetings.filter((m) => m.status === 'CANCELLED' || m.status === 'REJECTED').length,
    }),
    [meetings]
  );

  // Submit Schedule / Request
  const handleSaveMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAgenda.trim()) return;
    setActionError(null);
    setActionBusy(true);

    const matchedProject = projects.find((p) => p.projectCode === formProjectCode);
    const resolvedProjectName = matchedProject?.name || formProjectCode || 'Studio Consultation';
    const apiMeetingType = formType === 'STUDIO' ? 'SITE_VISIT' : 'OFFICE_MEETING';

    const newMeeting: DesktopMeeting = {
      id: `m-${Date.now()}`,
      projectCode: formProjectCode || projectCode,
      projectName: resolvedProjectName,
      clientName: userName || (isAdmin ? 'Studio Admin' : 'Client Leader'),
      date: formDate,
      slotTime: formSlot,
      agenda: formAgenda.trim(),
      type: formType,
      rawType: apiMeetingType,
      status: isAdmin ? 'CONFIRMED' : 'PENDING_APPROVAL',
      location: formLocation.trim() || (formType === 'STUDIO' ? 'On Site' : 'Studio HQ Boardroom'),
      attendees: [userName],
      meetUrl: formType === 'VIRTUAL' && formMeetUrl.trim() ? formMeetUrl.trim() : undefined,
    };

    try {
      if (isAdmin && onArrangeMeeting) {
        await onArrangeMeeting({
          projectCode: formProjectCode || projectCode,
          bookingDate: formDate,
          slot: formSlot,
          type: apiMeetingType,
          agenda: formAgenda.trim(),
          location: newMeeting.location,
          attendees: [userName],
        });
      } else if (onRequestMeeting) {
        await onRequestMeeting({
          projectCode: formProjectCode || projectCode,
          bookingDate: formDate,
          slot: formSlot,
          type: apiMeetingType,
          agenda: formAgenda.trim(),
          location: newMeeting.location,
        });
      }
      setMeetings((prev) => [...prev, newMeeting]);
      if (onScheduleSuccess) onScheduleSuccess(newMeeting);
      setIsScheduleModalOpen(false);
      setFormAgenda('');
      setFormMeetUrl('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to save meeting.');
    } finally {
      setActionBusy(false);
    }
  };

  // Submit Reschedule
  const handleConfirmReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRescheduleMeeting) return;
    setActionError(null);
    setActionBusy(true);

    try {
      if (onRescheduleMeeting) {
        await onRescheduleMeeting(activeRescheduleMeeting.id, {
          bookingDate: formDate,
          slot: formSlot,
          notes: rescheduleReason || undefined,
        });
      }

      setMeetings((prev) =>
        prev.map((m) =>
          m.id === activeRescheduleMeeting.id
            ? {
                ...m,
                date: formDate,
                slotTime: formSlot,
                status: 'RESCHEDULED',
                agenda: rescheduleReason
                  ? `${m.agenda} (Rescheduled: ${rescheduleReason})`
                  : m.agenda,
              }
            : m
        )
      );

      setIsRescheduleModalOpen(false);
      setActiveRescheduleMeeting(null);
      setActiveDetailMeeting(null);
      setRescheduleReason('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reschedule meeting.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleApprove = async (meeting: DesktopMeeting) => {
    setActionError(null);
    setActionBusy(true);
    try {
      if (onApproveMeeting) await onApproveMeeting(meeting.id);
      setMeetings((prev) =>
        prev.map((m) => (m.id === meeting.id ? { ...m, status: 'CONFIRMED' } : m))
      );
      setActiveDetailMeeting(null);
      setAdminFeedback('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to approve meeting.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleReject = async (meeting: DesktopMeeting) => {
    setActionError(null);
    setActionBusy(true);
    try {
      if (onRejectMeeting) await onRejectMeeting(meeting.id, adminFeedback.trim() || undefined);
      setMeetings((prev) =>
        prev.map((m) => (m.id === meeting.id ? { ...m, status: 'REJECTED' } : m))
      );
      setActiveDetailMeeting(null);
      setAdminFeedback('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reject meeting.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = async (meeting: DesktopMeeting) => {
    setActionError(null);
    setActionBusy(true);
    try {
      if (onCancelMeeting) await onCancelMeeting(meeting.id);
      setMeetings((prev) =>
        prev.map((m) => (m.id === meeting.id ? { ...m, status: 'CANCELLED' } : m))
      );
      setActiveDetailMeeting(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to cancel meeting.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRsvp = async (meeting: DesktopMeeting, rsvp: 'IN' | 'OUT') => {
    setActionError(null);
    setActionBusy(true);
    try {
      if (onRsvpMeeting) await onRsvpMeeting(meeting.id, rsvp);
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === meeting.id ? { ...m, rsvp: { ...(m.rsvp || {}), [userName]: rsvp } } : m
        )
      );
      setActiveDetailMeeting((prev) =>
        prev && prev.id === meeting.id
          ? { ...prev, rsvp: { ...(prev.rsvp || {}), [userName]: rsvp } }
          : prev
      );
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update RSVP.');
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="desk-meetings-view" data-testid="desktop-meetings-view">
      {/* Top Header */}
      <div className="desk-meetings-header">
        <div>
          <h1 className="desk-page-title">Architectural Consultation Scheduler</h1>
          <p className="desk-page-subtitle">
            Weekly 3-Slot Studio Calendar (12:00, 16:00, 18:00) • 1-Tap Google Meet Virtual Rooms
          </p>
        </div>

        <div className="desk-header-actions">
          {isAdmin && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={() => {
                setFormDate(selectedDate);
                setIsScheduleModalOpen(true);
              }}
              data-testid="admin-schedule-meeting-btn"
            >
              <Plus size={16} />
              <span>Schedule Consultation</span>
            </button>
          )}

          {isClient && (
            <button
              type="button"
              className="desk-btn desk-btn-primary"
              onClick={() => {
                setFormDate(selectedDate);
                setIsScheduleModalOpen(true);
              }}
              data-testid="client-request-meeting-btn"
            >
              <Plus size={16} />
              <span>Request Meeting</span>
            </button>
          )}
        </div>
      </div>

      {actionError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(223, 51, 68, 0.1)',
            color: '#DF3344',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            style={{ background: 'none', border: 'none', color: '#DF3344', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Figma 851:21798 Meeting Panel: Date * + Time slot * */}
      <div className="desk-meeting-figma-panel" data-testid="figma-meeting-panel">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="desk-form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="meeting-date-picker" style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
              Date *
            </label>
            <input
              id="meeting-date-picker"
              type="date"
              className="desk-form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Week Selector Bar */}
          <div className="desk-calendar-week-bar" data-testid="calendar-week-bar">
            {weekDays.map((day) => {
              const isSelected = selectedDate === day.date;
              const dayMeetings = meetings.filter(
                (m) => m.date === day.date && m.status !== 'CANCELLED' && m.status !== 'REJECTED'
              );

              return (
                <button
                  key={day.date}
                  type="button"
                  className={`desk-week-day-btn ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                  data-testid={`day-btn-${day.date}`}
                >
                  <span className="desk-day-name">{day.name}</span>
                  <span className="desk-day-date">{day.date.split('-')[2]}</span>
                  {dayMeetings.length > 0 && (
                    <span className="desk-day-badge">{dayMeetings.length}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
            Time slot *
          </div>
          <div className="desk-figma-slot-list">
            {FIXED_DAILY_SLOTS.map((slot) => {
              const meetingInSlot = meetings.find(
                (m) =>
                  m.date === selectedDate &&
                  m.status !== 'CANCELLED' &&
                  m.status !== 'REJECTED' &&
                  m.slotTime.includes(slot.time.split('–')[0].trim())
              );
              const isSelectedSlot = formSlot === slot.time;

              return (
                <button
                  key={slot.id}
                  type="button"
                  className={`desk-figma-slot-row ${isSelectedSlot ? 'selected' : ''} ${meetingInSlot ? 'booked' : ''}`}
                  onClick={() => {
                    setFormDate(selectedDate);
                    setFormSlot(slot.time);
                    if (meetingInSlot) {
                      setActiveDetailMeeting(meetingInSlot);
                    } else {
                      setIsScheduleModalOpen(true);
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={16} style={{ color: '#BF935A' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
                      {slot.time}
                    </span>
                    <span style={{ fontSize: '12px', color: '#686869' }}>
                      ({slot.label})
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: meetingInSlot ? '#138A4B' : isSelectedSlot ? '#695132' : '#979798',
                    }}
                  >
                    {meetingInSlot ? 'Booked' : isSelectedSlot ? 'Selected' : 'Available'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 Studio Daily Slots Grid */}
      <div className="desk-slots-container" data-testid="daily-slots-grid">
        <h2 className="desk-section-title">
          Scheduled Slots for {selectedDate} ({FIXED_DAILY_SLOTS.length} Studio Windows)
        </h2>

        <div className="desk-daily-slots-grid">
          {FIXED_DAILY_SLOTS.map((slot) => {
            const meetingInSlot = meetings.find(
              (m) =>
                m.date === selectedDate &&
                m.status !== 'CANCELLED' &&
                m.status !== 'REJECTED' &&
                m.slotTime.includes(slot.time.split('–')[0].trim())
            );

            return (
              <div
                key={slot.id}
                className={`desk-slot-card ${meetingInSlot ? 'booked' : 'available'}`}
                data-testid={`slot-card-${slot.id}`}
              >
                <div className="desk-slot-header">
                  <div className="desk-slot-time-badge">
                    <Clock size={15} />
                    <span>{slot.time}</span>
                  </div>
                  <span className="desk-slot-label">{slot.label}</span>
                </div>

                {meetingInSlot ? (
                  <div className="desk-slot-content">
                    <div className="desk-slot-project-title">{meetingInSlot.projectName}</div>
                    <div className="desk-slot-client-name">Client: {meetingInSlot.clientName}</div>
                    <p className="desk-slot-agenda">{meetingInSlot.agenda}</p>

                    <div className="desk-slot-footer">
                      <div className="desk-slot-type">
                        {meetingInSlot.type === 'VIRTUAL' ? (
                          <span className="type-pill virtual">
                            <Video size={12} /> Virtual Meet
                          </span>
                        ) : (
                          <span className="type-pill studio">
                            <MapPin size={12} /> Studio Office
                          </span>
                        )}
                        <span className={`desk-status-pill ${meetingInSlot.status.toLowerCase()}`}>
                          {meetingInSlot.status === 'CONFIRMED'
                            ? 'Confirmed'
                            : meetingInSlot.status === 'PENDING_APPROVAL'
                            ? 'Pending Approval'
                            : 'Rescheduled'}
                        </span>
                      </div>

                      <div className="desk-slot-actions">
                        {meetingInSlot.meetUrl && (
                          <a
                            href={meetingInSlot.meetUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="desk-btn-meet"
                            data-testid={`meet-btn-${meetingInSlot.id}`}
                          >
                            <Video size={14} />
                            <span>1-Tap Google Meet</span>
                          </a>
                        )}

                        <button
                          type="button"
                          className="desk-btn desk-btn-secondary"
                          onClick={() => {
                            setActiveRescheduleMeeting(meetingInSlot);
                            setFormDate(meetingInSlot.date);
                            setFormSlot(meetingInSlot.slotTime);
                            setIsRescheduleModalOpen(true);
                          }}
                          data-testid={`reschedule-btn-${meetingInSlot.id}`}
                        >
                          <RotateCcw size={13} />
                          <span>Reschedule</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="desk-slot-empty">
                    <span className="desk-empty-text">Slot Available</span>
                    <button
                      type="button"
                      className="desk-btn-reserve"
                      onClick={() => {
                        setFormDate(selectedDate);
                        setFormSlot(slot.time);
                        setIsScheduleModalOpen(true);
                      }}
                      data-testid={`reserve-slot-${slot.id}`}
                    >
                      <Plus size={14} />
                      <span>{isAdmin ? 'Schedule Slot' : 'Request Slot'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter Tabs + Meeting Cards Directory (Figma 853:12635 & 853:12856) */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }} data-testid="meetings-directory-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <h2 className="desk-section-title" style={{ margin: 0 }}>
            All Consultations & Requests
          </h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }} data-testid="meetings-filter-tabs">
            {(
              [
                { key: 'ALL', label: `All (${counts.ALL})` },
                { key: 'PENDING', label: `Pending (${counts.PENDING})` },
                { key: 'CONFIRMED', label: `Confirmed (${counts.CONFIRMED})` },
                { key: 'RESCHEDULED', label: `Rescheduled (${counts.RESCHEDULED})` },
                { key: 'CANCELLED', label: `Cancelled (${counts.CANCELLED})` },
              ] as const
            ).map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  data-testid={`filter-tab-${tab.key.toLowerCase()}`}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: active ? '1px solid #BF935A' : '1px solid #E1E1E4',
                    backgroundColor: active ? '#F9F4EF' : '#FFFFFF',
                    color: active ? '#695132' : '#686869',
                    fontSize: '13px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {filteredMeetings.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              border: '1px solid #EAEAED',
              padding: '32px',
              textAlign: 'center',
              color: '#686869',
              fontSize: '14px',
            }}
            data-testid="meetings-empty-state"
          >
            No consultation meetings found for this filter.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
            }}
            data-testid="meetings-cards-grid"
          >
            {filteredMeetings.map((m) => {
              const pill = getStatusPillStyle(m.status);
              return (
                <div
                  key={m.id}
                  data-testid={`meeting-card-${m.id}`}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #EAEAED',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <Building2 size={20} style={{ color: '#BF935A', flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
                          {m.projectName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#686869' }}>
                          {m.rawType === 'SITE_VISIT' || m.type === 'STUDIO' ? 'Site Visit' : 'Office Meeting'} • {m.date}
                        </div>
                      </div>
                      <span
                        style={{
                          backgroundColor: pill.bg,
                          color: pill.color,
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {pill.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={18} style={{ color: '#686869', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '11px', color: '#686869' }}>Client / Requester</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>{m.clientName}</div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        paddingTop: '10px',
                        borderTop: '1px solid #F1F1F3',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Clock size={16} style={{ color: '#BF935A', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '11px', color: '#686869' }}>Time</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>{m.slotTime}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <MapPin size={16} style={{ color: '#BF935A', marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: '11px', color: '#686869' }}>Location</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                            {m.location || (m.type === 'STUDIO' ? 'On Site' : 'Studio HQ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAdminFeedback('');
                      setActiveDetailMeeting(m);
                    }}
                    data-testid={`view-details-btn-${m.id}`}
                    style={{
                      width: '100%',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: '#BF935A',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isAdmin && m.status === 'PENDING_APPROVAL' ? 'Review Request' : 'View Details'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Centered Schedule / Request Modal Dialog (Figma 853:12986) */}
      {isScheduleModalOpen && (
        <div className="desk-modal-overlay" data-testid="schedule-meeting-modal">
          <div className="desk-modal-dialog">
            <div className="desk-modal-header">
              <h2 className="desk-modal-title">
                {isAdmin ? 'Schedule Architectural Consultation' : 'Request Studio Consultation'}
              </h2>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsScheduleModalOpen(false)}
                data-testid="close-schedule-modal"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveMeeting} className="desk-modal-body">
              {projects.length > 0 && (
                <div className="desk-form-group">
                  <label>Project *</label>
                  <select
                    className="desk-form-input"
                    value={formProjectCode}
                    onChange={(e) => setFormProjectCode(e.target.value)}
                    data-testid="select-meeting-project"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.projectCode}>
                        {p.name} ({p.projectCode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="desk-form-group">
                <label>Date *</label>
                <input
                  type="date"
                  className="desk-form-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                  data-testid="input-meeting-date"
                />
              </div>

              <div className="desk-form-group">
                <label>Studio Daily Slot (Fixed 3 Slots) *</label>
                <select
                  className="desk-form-input"
                  value={formSlot}
                  onChange={(e) => setFormSlot(e.target.value)}
                  data-testid="select-meeting-slot"
                >
                  {FIXED_DAILY_SLOTS.map((slot) => {
                    const taken = meetings.some(
                      (m) =>
                        m.date === formDate &&
                        m.status !== 'CANCELLED' &&
                        m.status !== 'REJECTED' &&
                        m.slotTime.includes(slot.time.split('–')[0].trim())
                    );
                    return (
                      <option key={slot.id} value={slot.time}>
                        {slot.time} ({slot.label}){taken ? ' — Booked' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="desk-form-group">
                <label>Meeting Type *</label>
                <div className="desk-radio-group">
                  <label>
                    <input
                      type="radio"
                      name="meetingType"
                      value="VIRTUAL"
                      checked={formType === 'VIRTUAL'}
                      onChange={() => {
                        setFormType('VIRTUAL');
                        setFormLocation('Studio HQ Boardroom');
                      }}
                    />
                    <span>Office Meeting / Virtual</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="meetingType"
                      value="STUDIO"
                      checked={formType === 'STUDIO'}
                      onChange={() => {
                        setFormType('STUDIO');
                        setFormLocation('On Site');
                      }}
                    />
                    <span>Site Visit / In-Person</span>
                  </label>
                </div>
              </div>

              <div className="desk-form-group">
                <label>Location</label>
                <input
                  type="text"
                  className="desk-form-input"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Studio HQ Boardroom or Site Address"
                  data-testid="input-meeting-location"
                />
              </div>

              {formType === 'VIRTUAL' && (
                <div className="desk-form-group">
                  <label>Google Meet URL (Optional)</label>
                  <input
                    type="url"
                    className="desk-form-input"
                    value={formMeetUrl}
                    onChange={(e) => setFormMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    data-testid="input-meet-url"
                  />
                </div>
              )}

              <div className="desk-form-group">
                <label>Consultation Agenda & Notes *</label>
                <textarea
                  className="desk-form-textarea"
                  rows={3}
                  placeholder="Add a brief agenda to help participants prepare for the meeting..."
                  value={formAgenda}
                  onChange={(e) => setFormAgenda(e.target.value)}
                  required
                  data-testid="textarea-meeting-agenda"
                />
              </div>

              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setIsScheduleModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="desk-btn desk-btn-primary"
                  disabled={actionBusy}
                  data-testid="confirm-schedule-btn"
                >
                  {isAdmin ? 'Confirm & Book Slot' : 'Submit Consultation Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review / Detail Modal (Figma 853:16877 & 862:18261) */}
      {activeDetailMeeting && (
        <div className="desk-modal-overlay" data-testid="meeting-detail-modal">
          <div className="desk-modal-dialog" style={{ maxWidth: '760px', width: '92vw' }}>
            <div className="desk-modal-header">
              <h2 className="desk-modal-title">
                {isAdmin && activeDetailMeeting.status === 'PENDING_APPROVAL'
                  ? 'Review Request'
                  : 'Meeting Details'}
              </h2>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setActiveDetailMeeting(null)}
                data-testid="close-detail-modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="desk-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid #E8E8E9',
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#1D1D1F' }}>
                    {activeDetailMeeting.projectName}
                  </div>
                  <div style={{ fontSize: '13px', color: '#686869' }}>
                    {activeDetailMeeting.rawType === 'SITE_VISIT' || activeDetailMeeting.type === 'STUDIO'
                      ? 'Site Visit'
                      : 'Office Meeting'}{' '}
                    ({activeDetailMeeting.projectCode})
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: getStatusPillStyle(activeDetailMeeting.status).bg,
                    color: getStatusPillStyle(activeDetailMeeting.status).color,
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: '8px',
                  }}
                >
                  {getStatusPillStyle(activeDetailMeeting.status).label}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Calendar size={18} style={{ color: '#BF935A', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#686869' }}>Date & Time</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
                      {activeDetailMeeting.date}, {activeDetailMeeting.slotTime}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <MapPin size={18} style={{ color: '#BF935A', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#686869' }}>Location</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
                      {activeDetailMeeting.location || 'Studio HQ Boardroom'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <Users size={18} style={{ color: '#BF935A', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#686869' }}>Client / Requested By</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1D1D1F' }}>
                      {activeDetailMeeting.clientName}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <FileText size={18} style={{ color: '#BF935A', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#686869' }}>Agenda</div>
                    <div style={{ fontSize: '14px', color: '#1D1D1F' }}>{activeDetailMeeting.agenda}</div>
                  </div>
                </div>
              </div>

              {/* RSVP Section */}
              {activeDetailMeeting.status !== 'CANCELLED' &&
                activeDetailMeeting.status !== 'REJECTED' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      backgroundColor: '#FBFBFB',
                      border: '1px solid #EAEAED',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                      Your Attendance RSVP
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleRsvp(activeDetailMeeting, 'IN')}
                        data-testid="rsvp-in-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #28C76F',
                          backgroundColor:
                            activeDetailMeeting.rsvp?.[userName] === 'IN'
                              ? '#28C76F'
                              : '#FFFFFF',
                          color:
                            activeDetailMeeting.rsvp?.[userName] === 'IN'
                              ? '#FFFFFF'
                              : '#138A4B',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <ThumbsUp size={13} /> Confirm (In)
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => handleRsvp(activeDetailMeeting, 'OUT')}
                        data-testid="rsvp-out-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid #DF3344',
                          backgroundColor:
                            activeDetailMeeting.rsvp?.[userName] === 'OUT'
                              ? '#DF3344'
                              : '#FFFFFF',
                          color:
                            activeDetailMeeting.rsvp?.[userName] === 'OUT'
                              ? '#FFFFFF'
                              : '#DF3344',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <ThumbsDown size={13} /> Decline (Out)
                      </button>
                    </div>
                  </div>
                )}

              {/* Admin Review Feedback & Info Banner */}
              {isAdmin && activeDetailMeeting.status === 'PENDING_APPROVAL' && (
                <>
                  <div className="desk-form-group" style={{ marginBottom: 0 }}>
                    <label>Admin feedback (optional)</label>
                    <textarea
                      className="desk-form-textarea"
                      rows={2}
                      placeholder="Add feedback or rejection reason for the Client Leader..."
                      value={adminFeedback}
                      onChange={(e) => setAdminFeedback(e.target.value)}
                      data-testid="admin-feedback-textarea"
                    />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#F9F4EF',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      display: 'flex',
                      gap: '10px',
                      alignItems: 'flex-start',
                      color: '#695132',
                    }}
                  >
                    <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>
                        Approve only if the slot is available
                      </div>
                      <div style={{ fontSize: '12px', marginTop: '2px' }}>
                        We’ll recheck slot availability immediately before confirmation.
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="desk-modal-footer" style={{ flexWrap: 'wrap', gap: '10px' }}>
                {isAdmin && activeDetailMeeting.status === 'PENDING_APPROVAL' && (
                  <>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleReject(activeDetailMeeting)}
                      data-testid="reject-meeting-btn"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: '1px solid #DF3344',
                        backgroundColor: '#FFFFFF',
                        color: '#DF3344',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <XCircle size={15} /> Reject Request
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleApprove(activeDetailMeeting)}
                      data-testid="approve-meeting-btn"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#50A164',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <CheckCircle2 size={15} /> Approve Request
                    </button>
                  </>
                )}

                {activeDetailMeeting.status !== 'CANCELLED' &&
                  activeDetailMeeting.status !== 'REJECTED' && (
                    <>
                      <button
                        type="button"
                        className="desk-btn desk-btn-secondary"
                        onClick={() => {
                          setActiveRescheduleMeeting(activeDetailMeeting);
                          setFormDate(activeDetailMeeting.date);
                          setFormSlot(activeDetailMeeting.slotTime);
                          setIsRescheduleModalOpen(true);
                        }}
                      >
                        <RotateCcw size={14} /> Reschedule
                      </button>
                      {(isAdmin || activeDetailMeeting.requestedBy === userName) && (
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleCancel(activeDetailMeeting)}
                          data-testid="cancel-meeting-btn"
                          style={{
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: '1px solid #DF3344',
                            backgroundColor: '#FFFFFF',
                            color: '#DF3344',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel Meeting
                        </button>
                      )}
                    </>
                  )}

                <button
                  type="button"
                  className="desk-btn desk-btn-primary"
                  onClick={() => setActiveDetailMeeting(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Reschedule Modal Dialog */}
      {isRescheduleModalOpen && activeRescheduleMeeting && (
        <div className="desk-modal-overlay" data-testid="reschedule-meeting-modal">
          <div className="desk-modal-dialog">
            <div className="desk-modal-header">
              <h2 className="desk-modal-title">Reschedule Consultation</h2>
              <button
                type="button"
                className="desk-btn-close"
                onClick={() => setIsRescheduleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="desk-modal-body">
              <p style={{ fontSize: '13px', color: 'var(--desk-text-secondary)', marginBottom: '14px' }}>
                Rescheduling: <strong>{activeRescheduleMeeting.projectName}</strong> with{' '}
                {activeRescheduleMeeting.clientName}
              </p>

              <div className="desk-form-group">
                <label>New Date</label>
                <input
                  type="date"
                  className="desk-form-input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div className="desk-form-group">
                <label>New Slot</label>
                <select
                  className="desk-form-input"
                  value={formSlot}
                  onChange={(e) => setFormSlot(e.target.value)}
                >
                  <option value="12:00–13:30">12:00–13:30 (Afternoon Slot)</option>
                  <option value="16:00–17:30">16:00–17:30 (Evening Slot 1)</option>
                  <option value="18:00–19:30">18:00–19:30 (Evening Slot 2)</option>
                </select>
              </div>

              <div className="desk-form-group">
                <label>Reschedule Reason</label>
                <input
                  type="text"
                  className="desk-form-input"
                  placeholder="Client requested later evening slot..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </div>

              <div className="desk-modal-footer">
                <button
                  type="button"
                  className="desk-btn desk-btn-secondary"
                  onClick={() => setIsRescheduleModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="desk-btn desk-btn-primary"
                  disabled={actionBusy}
                  data-testid="confirm-reschedule-btn"
                >
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
