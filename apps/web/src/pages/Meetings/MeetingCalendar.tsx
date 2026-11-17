import React, { useState, useEffect } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  Users,
  MapPin,
  Building2,
  Plus,
  X,
  FileText,
  Check,
  CalendarCheck,
  Briefcase,
  UserCheck,
  ChevronRight,
  Filter,
} from 'lucide-react';

const FIXED_MEETING_SLOTS = ['12:00–13:30', '16:00–17:30', '18:00–19:30'] as const;

export interface ScheduledMeeting {
  id: string;
  projectId?: string;
  projectCode: string;
  projectName?: string;
  bookingDate: string; // YYYY-MM-DD
  slot: string;
  slotTime: string; // 12:00–13:30
  type: 'OFFICE_MEETING' | 'SITE_VISIT';
  status: 'REQUESTED' | 'CONFIRMED' | 'REJECTED' | 'RESCHEDULE_PENDING' | 'CANCELLED';
  agenda: string;
  attendees: string[];
  location?: string;
  taskDetails?: string;
  notes?: string;
  rsvp?: Record<string, 'IN' | 'OUT'>;
  requestedBy: string;
  approvedBy?: string;
  createdAt?: string;
}

export interface MeetingCalendarProps {
  projectCode: string;
  userRole?: UserRole;
  userName?: string;
  meetings?: ScheduledMeeting[];
  bookedSlots?: string[];
  onBookSlot?: (slot: string, agenda: string, date: string) => void;
  onRsvpMeeting?: (meetingId: string, rsvp: 'IN' | 'OUT') => Promise<void>;
  onArrangeMeeting?: (data: {
    projectCode: string;
    bookingDate: string;
    slot: string;
    type: 'OFFICE_MEETING' | 'SITE_VISIT';
    agenda: string;
    attendees: string[];
    location?: string;
    notes?: string;
  }) => Promise<void>;
  onApproveMeeting?: (id: string) => Promise<void>;
  onCancelMeeting?: (id: string) => Promise<void>;
  onDateChange?: (date: string) => void;
  activeMeeting?: any;
  getAuthHeaders?: () => Record<string, string>;
  projects?: Array<{ projectCode: string; name: string }>;
}

const DEFAULT_TEAM_MEMBERS = [
  { name: 'Ar. Ronak Shah', role: 'Staff Architect', type: 'STAFF' },
  { name: 'Ar. Priya Sharma', role: 'Design Lead', type: 'STAFF' },
  { name: 'Rajesh Mehta', role: 'Client Representative', type: 'CLIENT_LEADER' },
  { name: 'Pooja Mehta', role: 'Client Observer', type: 'CLIENT_VIEWER' },
  { name: 'Kamal Patel', role: 'Principal Architect', type: 'ADMIN' },
];

export function MeetingCalendar({
  projectCode,
  userRole = 'ADMIN',
  userName = 'Kamal Patel',
  meetings = [],
  bookedSlots = [],
  onBookSlot,
  onRsvpMeeting,
  onArrangeMeeting,
  onApproveMeeting,
  onCancelMeeting,
  onDateChange,
  activeMeeting,
  getAuthHeaders,
  projects = [],
}: MeetingCalendarProps) {
  const isAdmin = userRole === 'ADMIN';

  // Filter for meetings list
  const [meetingFilter, setMeetingFilter] = useState<'ALL' | 'INVITED' | 'UPCOMING' | 'OFFICE' | 'SITE'>('ALL');

  // Slot booking state
  const [selectedDate, setSelectedDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [agenda, setAgenda] = useState('');

  // Date-specific slot lock calculation
  const dateBookedSlots = React.useMemo(() => {
    return meetings
      .filter((m) => {
        const mDate = m.bookingDate ? m.bookingDate.split('T')[0] : '';
        return mDate === selectedDate && m.status !== 'CANCELLED' && m.status !== 'REJECTED';
      })
      .map((m) => m.slotTime || m.slot);
  }, [meetings, selectedDate]);

  // Arrange Meeting Modal State (Admin initiates meeting based on task and time)
  const [isArrangeModalOpen, setIsArrangeModalOpen] = useState(false);
  const [arrangeTask, setArrangeTask] = useState('');
  const [arrangeProject, setArrangeProject] = useState(projectCode || 'AF-VILLA');
  const [arrangeDate, setArrangeDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [arrangeSlot, setArrangeSlot] = useState<string>(FIXED_MEETING_SLOTS[0]);
  const [arrangeType, setArrangeType] = useState<'OFFICE_MEETING' | 'SITE_VISIT'>('OFFICE_MEETING');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([
    'Ar. Ronak Shah',
    'Rajesh Mehta',
  ]);
  const [arrangeLocation, setArrangeLocation] = useState('Studio Boardroom A • Ahmedabad HQ');
  const [arrangeNotes, setArrangeNotes] = useState('');
  const [arrangeError, setArrangeError] = useState<string | null>(null);
  const [isSubmittingArrange, setIsSubmittingArrange] = useState(false);

  // Available users list
  const [availableUsers, setAvailableUsers] = useState(DEFAULT_TEAM_MEMBERS);

  // Fetch real users from database for attendees list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (typeof window === 'undefined') return;
        const headers = getAuthHeaders ? getAuthHeaders() : {};
        const res = await fetch('/api/auth/users', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.users && Array.isArray(data.users)) {
            const mapped = data.users.map((u: any) => ({
              name: u.fullName,
              role: u.role === 'ADMIN' ? 'Principal Architect' : u.role === 'STAFF' ? 'Staff Architect' : 'Client Representative',
              type: u.role,
            }));
            const unique = mapped.filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.name === v.name) === i);
            setAvailableUsers(unique.length > 0 ? unique : DEFAULT_TEAM_MEMBERS);
          }
        }
      } catch (e) {
        // Fallback to defaults
      }
    };
    fetchUsers();
  }, [getAuthHeaders]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedSlot(null);
    if (onDateChange) onDateChange(newDate);
  };

  const handleConfirmSlotBooking = () => {
    if (!selectedSlot || !agenda.trim()) return;
    if (onBookSlot) {
      onBookSlot(selectedSlot, agenda, selectedDate);
    }
    setSelectedSlot(null);
    setAgenda('');
  };

  const handleToggleAttendee = (attendeeName: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(attendeeName) ? prev.filter((n) => n !== attendeeName) : [...prev, attendeeName]
    );
  };

  const handleArrangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setArrangeError(null);

    if (!arrangeTask.trim()) {
      setArrangeError('Please enter a task or meeting agenda.');
      return;
    }
    if (!arrangeDate) {
      setArrangeError('Please select a valid meeting date.');
      return;
    }
    if (selectedAttendees.length === 0) {
      setArrangeError('Please select at least one team member or client to involve in the meeting.');
      return;
    }

    setIsSubmittingArrange(true);
    try {
      const payload = {
        projectCode: arrangeProject,
        bookingDate: arrangeDate,
        slot: arrangeSlot,
        type: arrangeType,
        agenda: arrangeTask.trim(),
        attendees: selectedAttendees,
        location: arrangeLocation.trim(),
        notes: arrangeNotes.trim(),
      };

      if (onArrangeMeeting) {
        await onArrangeMeeting(payload);
      } else {
        const headers = getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' };
        const res = await fetch('/api/meetings/request', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to arrange meeting');
        }
      }

      setIsArrangeModalOpen(false);
      setArrangeTask('');
      setArrangeNotes('');
    } catch (err: any) {
      setArrangeError(err.message || 'Failed to schedule meeting. Please check inputs.');
    } finally {
      setIsSubmittingArrange(false);
    }
  };

  const isUserInvolved = (m: ScheduledMeeting) => {
    if (!userName) return false;
    const nameLower = userName.toLowerCase();
    let attendeesList = Array.isArray(m.attendees) ? [...m.attendees] : [];
    if (m.notes && typeof m.notes === 'string' && m.notes.trim().startsWith('{')) {
      try {
        const p = JSON.parse(m.notes);
        if (Array.isArray(p.attendees)) attendeesList = p.attendees;
      } catch (_) {}
    }
    return attendeesList.some((att) => {
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
  };

  const [localRsvps, setLocalRsvps] = useState<Record<string, 'IN' | 'OUT'>>({});

  const getUserRsvp = (m: ScheduledMeeting): 'IN' | 'OUT' | null => {
    if (localRsvps[m.id]) return localRsvps[m.id];
    if (userName && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`meeting_rsvp_${m.id}_${userName}`);
      if (stored === 'IN' || stored === 'OUT') return stored as 'IN' | 'OUT';
    }
    let parsedNotes: any = {};
    if (m.notes && typeof m.notes === 'string' && m.notes.trim().startsWith('{')) {
      try {
        parsedNotes = JSON.parse(m.notes);
      } catch (_) {}
    }
    const rsvpObj = parsedNotes?.rsvp || m.rsvp || {};
    if (userName && rsvpObj[userName]) return rsvpObj[userName];
    return null;
  };

  const handleRsvp = async (meetingId: string, rsvp: 'IN' | 'OUT') => {
    setLocalRsvps((prev) => ({ ...prev, [meetingId]: rsvp }));
    if (userName && typeof window !== 'undefined') {
      localStorage.setItem(`meeting_rsvp_${meetingId}_${userName}`, rsvp);
    }
    if (onRsvpMeeting) {
      await onRsvpMeeting(meetingId, rsvp);
    } else {
      const headers = getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' };
      fetch(`/api/meetings/${meetingId}/rsvp`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ rsvp }),
      }).catch(() => {});
    }
  };

  const invitedMeetings = meetings.filter(isUserInvolved);

  const filteredMeetings = meetings.filter((m) => {
    if (meetingFilter === 'INVITED') return isUserInvolved(m);
    if (meetingFilter === 'OFFICE') return m.type === 'OFFICE_MEETING';
    if (meetingFilter === 'SITE') return m.type === 'SITE_VISIT';
    if (meetingFilter === 'UPCOMING') {
      const today = new Date().toISOString().split('T')[0];
      return m.bookingDate >= today && m.status !== 'CANCELLED';
    }
    return true;
  });

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Top Header & Action Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Consultation &amp; Task Meetings
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                color: 'var(--accent-gold)',
                border: '1px solid var(--border-strong)',
              }}
            >
              PROJECT: {projectCode}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            {isAdmin
              ? 'Initiate task-focused design reviews, invite team members and clients, and track meeting schedules.'
              : 'Fixed 90-minute design review sessions with atomic collision safeguards.'}
          </p>
        </div>

        {/* Action Button: Admin Arranges Meeting */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <button
              onClick={() => {
                setArrangeError(null);
                setIsArrangeModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Plus size={16} strokeWidth={2.5} /> Arrange Meeting
            </button>
          )}
        </div>
      </div>

      {/* Active Consultation Banner */}
      {activeMeeting && (
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--accent-gold)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 800 }}>
                Active Confirmed Consultation
              </span>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>
                {activeMeeting.date} at {activeMeeting.slotTime}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Agenda: {activeMeeting.agenda}
              </p>
            </div>
            {activeMeeting.status === 'RESCHEDULE_PENDING' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  color: 'var(--accent-amber)',
                  fontWeight: 700,
                }}
              >
                Reschedule Pending (Prior Slot Preserved)
              </span>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: 3 FIXED CONSULTATION SLOTS (Visible to Admin & Clients; hidden for Staff) */}
      {userRole !== 'STAFF' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Available Consultation Slots for {selectedDate}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Select a 90-minute studio window to reserve or book
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                padding: '6px 12px',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        {/* 3 Fixed Slots Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {FIXED_MEETING_SLOTS.map((slot) => {
            const isBooked = dateBookedSlots.includes(slot) || bookedSlots.includes(slot);
            const isSelected = selectedSlot === slot;

            return (
              <div
                key={slot}
                style={{
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: isSelected ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isBooked ? 0.6 : 1,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Clock size={16} color={isBooked ? 'var(--text-muted)' : 'var(--accent-gold)'} />
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {slot}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    90-Minute Studio Review Session
                  </div>
                </div>

                <div style={{ marginTop: '16px' }}>
                  {isBooked ? (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 700,
                      }}
                    >
                      <AlertCircle size={12} /> Booked
                    </span>
                  ) : isAdmin ? (
                    <button
                      onClick={() => setSelectedSlot(slot)}
                      style={{
                        width: '100%',
                        padding: '6px 12px',
                        backgroundColor: isSelected ? 'var(--accent-gold)' : 'var(--bg-surface)',
                        color: isSelected ? '#0d0f12' : 'var(--text-primary)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {isSelected ? 'Selected' : 'Select Slot'}
                    </button>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      Available Studio Window
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isAdmin && (
          <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={13} color="var(--accent-gold)" />
            <span>Meeting scheduling and consultations are initiated exclusively by the Studio Administrator.</span>
          </div>
        )}

        {/* Booking Confirmation Box (Admin only) */}
        {selectedSlot && isAdmin && (
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
            }}
          >
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Confirm Consultation for {selectedSlot} on {selectedDate}
            </h4>
            <input
              type="text"
              placeholder="Specify meeting agenda (e.g. Ground Floor MEP coordination and material selection)..."
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                marginBottom: '12px',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setSelectedSlot(null)}
                style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSlotBooking}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#0d0f12',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Confirm Booking
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* SECTION 2: SCHEDULED MEETINGS & TASK LIST */}
      <div style={{ borderTop: userRole !== 'STAFF' ? '1px solid var(--border-subtle)' : 'none', paddingTop: userRole !== 'STAFF' ? '20px' : '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Scheduled Meetings &amp; Task Reviews ({meetings.length})
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              View upcoming studio meetings, site visits, and involved participants
            </span>
          </div>

          {/* Sub-Filters */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: `All (${meetings.length})` },
              { key: 'INVITED', label: `Involving Me (${invitedMeetings.length})`, highlight: invitedMeetings.length > 0 },
              { key: 'UPCOMING', label: 'Upcoming' },
              { key: 'OFFICE', label: 'Office' },
              { key: 'SITE', label: 'Site Visits' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setMeetingFilter(f.key as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: meetingFilter === f.key ? '1px solid var(--accent-gold)' : f.highlight ? '1px solid var(--accent-emerald)' : '1px solid var(--border-subtle)',
                  backgroundColor: meetingFilter === f.key ? 'rgba(197, 160, 89, 0.15)' : f.highlight ? 'rgba(18, 183, 106, 0.1)' : 'transparent',
                  color: meetingFilter === f.key ? 'var(--accent-gold)' : f.highlight ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {f.key === 'INVITED' && <UserCheck size={12} />}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Meeting Invitations Banner for Invited Attendees */}
        {invitedMeetings.length > 0 && !isAdmin && (
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(197, 160, 89, 0.08)',
              border: '1px solid var(--accent-gold)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#0d0f12',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <CalendarCheck size={18} />
              </div>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  You have {invitedMeetings.length} scheduled meeting{invitedMeetings.length > 1 ? 's' : ''} requiring your presence
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Studio administrator has arranged meetings and included you as an attendee.
                </p>
              </div>
            </div>

            {meetingFilter !== 'INVITED' && (
              <button
                type="button"
                onClick={() => setMeetingFilter('INVITED')}
                style={{
                  padding: '6px 14px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#0d0f12',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                View My Invitations ({invitedMeetings.length})
              </button>
            )}
          </div>
        )}

        {/* Meetings Feed */}
        {filteredMeetings.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            <CalendarCheck size={36} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
              No meetings found
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
              {isAdmin
                ? 'Click "+ Arrange Meeting" above to set a task, date & time, and invite project members.'
                : 'No meetings scheduled in this view.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredMeetings.map((meeting) => {
              const dateObj = new Date(meeting.bookingDate);
              const dayNum = dateObj.getDate();
              const monthStr = dateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase();
              const yearStr = dateObj.getFullYear();
              const isSite = meeting.type === 'SITE_VISIT';

              // Robust parsing in case notes holds JSON from previous requests
              let effectiveAgenda = meeting.agenda;
              let effectiveAttendees = Array.isArray(meeting.attendees) ? [...meeting.attendees] : [];
              let effectiveLocation = meeting.location;

              if (meeting.notes && typeof meeting.notes === 'string' && meeting.notes.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(meeting.notes);
                  if (!effectiveAgenda && parsed.agenda) effectiveAgenda = parsed.agenda;
                  if (effectiveAttendees.length === 0 && Array.isArray(parsed.attendees)) {
                    effectiveAttendees = parsed.attendees;
                  }
                  if (!effectiveLocation && parsed.location) effectiveLocation = parsed.location;
                } catch (_) {}
              }

              if (!effectiveAgenda) effectiveAgenda = meeting.notes || 'Architectural Review';
              if (!effectiveLocation) effectiveLocation = isSite ? 'On Site' : 'Studio HQ Boardroom';

              const myRsvp = getUserRsvp(meeting);
              let rsvpMap: Record<string, string> = {};
              if (meeting.notes && typeof meeting.notes === 'string' && meeting.notes.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(meeting.notes);
                  if (parsed.rsvp) rsvpMap = parsed.rsvp;
                } catch (_) {}
              }
              if (meeting.rsvp) {
                rsvpMap = { ...rsvpMap, ...meeting.rsvp };
              }

              return (
                <div
                  key={meeting.id}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {/* Left: Date & Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '170px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-strong)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--accent-gold)' }}>
                        {monthStr}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {dayNum}
                      </span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                        {yearStr}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <Clock size={13} color="var(--accent-gold)" />
                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {meeting.slotTime || meeting.slot}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '8px',
                          backgroundColor: isSite ? 'rgba(59, 130, 246, 0.12)' : 'rgba(197, 160, 89, 0.12)',
                          color: isSite ? 'var(--accent-blue)' : 'var(--accent-gold)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {isSite ? <MapPin size={10} /> : <Building2 size={10} />}
                        {isSite ? 'Site Visit' : 'Office Meeting'}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Agenda, Project, and Involved Attendees */}
                  <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {effectiveAgenda}
                      </h4>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                          fontWeight: 700,
                        }}
                      >
                        {meeting.projectCode}
                      </span>
                      {isUserInvolved(meeting) && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 7px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(18, 183, 106, 0.15)',
                            color: 'var(--accent-emerald)',
                            border: '1px solid var(--accent-emerald)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckCircle2 size={11} /> You Are Invited
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={11} color="var(--text-secondary)" />
                      <span>{effectiveLocation}</span>
                      <span>•</span>
                      <span>By <strong>{meeting.requestedBy}</strong></span>
                    </div>

                    {effectiveAttendees && effectiveAttendees.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Users size={11} /> Involves:
                        </span>
                        {effectiveAttendees.map((att, i) => {
                          const isMe = userName && (
                            att.toLowerCase().includes(userName.toLowerCase()) ||
                            userName.toLowerCase().includes(att.toLowerCase()) ||
                            (att.includes('Ronak') && userName.toLowerCase().includes('ronak')) ||
                            (att.includes('Priya') && userName.toLowerCase().includes('priya')) ||
                            (att.includes('Rajesh') && userName.toLowerCase().includes('rajesh')) ||
                            (att.includes('Pooja') && userName.toLowerCase().includes('pooja'))
                          );
                          const attRsvp = (isMe && myRsvp) || rsvpMap[att] || rsvpMap[att.toLowerCase()];

                          return (
                            <span
                              key={i}
                              style={{
                                fontSize: '10px',
                                fontWeight: isMe ? 800 : 700,
                                backgroundColor: isMe ? 'rgba(197, 160, 89, 0.22)' : 'var(--bg-surface)',
                                color: isMe ? 'var(--accent-gold)' : 'var(--text-primary)',
                                padding: '1px 7px',
                                borderRadius: '10px',
                                border: isMe ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <span>{att}</span>
                              {isMe && <span style={{ opacity: 0.8 }}> (You)</span>}
                              {attRsvp === 'IN' && (
                                <span style={{ color: 'var(--accent-emerald)', fontWeight: 800 }}>✓ In</span>
                              )}
                              {attRsvp === 'OUT' && (
                                <span style={{ color: 'var(--accent-rose)', fontWeight: 800 }}>✕ Out</span>
                              )}
                              {!attRsvp && isAdmin && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>• Pending</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right: Status badge, Invitee RSVP & Admin Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Invitee RSVP Controls (I'm In vs I'm Out) */}
                    {isUserInvolved(meeting) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {myRsvp === 'IN' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(18, 183, 106, 0.15)',
                                color: 'var(--accent-emerald)',
                                border: '1px solid var(--accent-emerald)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Check size={12} strokeWidth={3} /> You're In (Confirmed)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRsvp(meeting.id, 'OUT')}
                              title="Change RSVP to Out"
                              style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                              }}
                            >
                              Change to Out
                            </button>
                          </div>
                        ) : myRsvp === 'OUT' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                color: 'var(--accent-rose)',
                                border: '1px solid var(--accent-rose)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <X size={12} strokeWidth={2.5} /> You're Out (Declined)
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRsvp(meeting.id, 'IN')}
                              title="Change RSVP to In"
                              style={{
                                fontSize: '11px',
                                color: 'var(--accent-gold)',
                                textDecoration: 'underline',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                              }}
                            >
                              Change to In
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: 'var(--bg-surface)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-md)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                              RSVP:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRsvp(meeting.id, 'IN')}
                              title="Confirm your attendance"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 10px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'var(--accent-emerald)',
                                color: '#FFFFFF',
                                fontSize: '11px',
                                fontWeight: 800,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(18, 183, 106, 0.25)',
                              }}
                            >
                              <Check size={11} strokeWidth={3} />
                              <span>I'm In</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRsvp(meeting.id, 'OUT')}
                              title="Decline meeting invitation"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: '1px solid var(--border-subtle)',
                                cursor: 'pointer',
                              }}
                            >
                              <X size={11} strokeWidth={2.5} />
                              <span>I'm Out</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor:
                          meeting.status === 'CONFIRMED'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : meeting.status === 'CANCELLED'
                            ? 'rgba(107, 114, 128, 0.12)'
                            : 'rgba(245, 158, 11, 0.12)',
                        color:
                          meeting.status === 'CONFIRMED'
                            ? 'var(--accent-emerald)'
                            : meeting.status === 'CANCELLED'
                            ? 'var(--text-muted)'
                            : 'var(--accent-amber)',
                        border:
                          meeting.status === 'CONFIRMED'
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : '1px solid rgba(245, 158, 11, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {meeting.status === 'CONFIRMED' ? (
                        <CheckCircle2 size={11} />
                      ) : meeting.status === 'CANCELLED' ? (
                        <X size={11} />
                      ) : (
                        <Clock size={11} />
                      )}
                      {meeting.status}
                    </span>

                    {isAdmin && meeting.status === 'REQUESTED' && onApproveMeeting && (
                      <button
                        onClick={() => onApproveMeeting(meeting.id)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: 'var(--accent-emerald)',
                          color: '#ffffff',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Confirm
                      </button>
                    )}

                    {isAdmin && meeting.status !== 'CANCELLED' && onCancelMeeting && (
                      <button
                        onClick={() => onCancelMeeting(meeting.id)}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: 'transparent',
                          color: 'var(--accent-rose)',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. ADMIN: ARRANGE MEETING MODAL                                           */}
      {/* ========================================================================= */}
      {isArrangeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setIsArrangeModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-strong)',
              width: '100%',
              maxWidth: '580px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Arrange Studio Task Meeting
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Schedule a task-focused meeting or site inspection and invite required stakeholders.
                </p>
              </div>

              <button
                onClick={() => setIsArrangeModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleArrangeSubmit} style={{ padding: '24px' }}>
              {arrangeError && (
                <div
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    color: 'var(--accent-rose)',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '2px' }}>Meeting Parameter Warning</strong>
                    <span>{arrangeError}</span>
                  </div>
                </div>
              )}

              {/* 1. Meeting Task / Agenda */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Meeting Task / Purpose <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ground Floor Structural Coordination &amp; Column Schedule"
                  value={arrangeTask}
                  onChange={(e) => {
                    setArrangeTask(e.target.value);
                    if (arrangeError) setArrangeError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 2. Project Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Associated Project
                </label>
                <select
                  value={arrangeProject}
                  onChange={(e) => setArrangeProject(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  <option value="AF-VILLA">AF-VILLA • Villa Horizon Luxury Residence</option>
                  <option value="AF-TOWER">AF-TOWER • Skyline Commercial Tower</option>
                  <option value="AMC METRO">AMC METRO • Ahmedabad Metro Infrastructure</option>
                  <option value="ST">ST • Surat Akshardham Temple Complex</option>
                </select>
              </div>

              {/* 3. Date & Time Slot Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Meeting Date <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={arrangeDate}
                    onChange={(e) => setArrangeDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Consultation Slot <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <select
                    value={arrangeSlot}
                    onChange={(e) => setArrangeSlot(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {FIXED_MEETING_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot} (90 Min)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Meeting Type Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Meeting Format &amp; Venue
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setArrangeType('OFFICE_MEETING');
                      setArrangeLocation('Studio Boardroom A • Ahmedabad HQ');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: arrangeType === 'OFFICE_MEETING' ? 'rgba(197, 160, 89, 0.15)' : 'var(--bg-tertiary)',
                      color: arrangeType === 'OFFICE_MEETING' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                      border: arrangeType === 'OFFICE_MEETING' ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <Building2 size={15} /> Office Meeting
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setArrangeType('SITE_VISIT');
                      setArrangeLocation('Project Site • Plot 42, Bodakdev');
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px',
                      fontWeight: 700,
                      backgroundColor: arrangeType === 'SITE_VISIT' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-tertiary)',
                      color: arrangeType === 'SITE_VISIT' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      border: arrangeType === 'SITE_VISIT' ? '1px solid var(--accent-blue)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    <MapPin size={15} /> On-Site Visit
                  </button>
                </div>
              </div>

              {/* 5. Involve Others (Requirement-based Participant Selection) */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Involve Participants Based on Requirement <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                    {selectedAttendees.length} selected
                  </span>
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    padding: '12px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  {availableUsers.map((member) => {
                    const isSelected = selectedAttendees.includes(member.name);
                    return (
                      <button
                        key={member.name}
                        type="button"
                        onClick={() => handleToggleAttendee(member.name)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: isSelected ? 'var(--accent-gold)' : 'var(--bg-surface)',
                          color: isSelected ? '#0d0f12' : 'var(--text-primary)',
                          border: isSelected ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected ? <Check size={13} strokeWidth={3} /> : <Plus size={13} />}
                        <span>{member.name}</span>
                        <span
                          style={{
                            fontSize: '10px',
                            opacity: 0.75,
                            marginLeft: '2px',
                          }}
                        >
                          ({member.role})
                        </span>
                      </button>
                    );
                  })}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                  Invited attendees will see this meeting on their schedule and receive in-portal notifications.
                </span>
              </div>

              {/* 6. Location / Venue */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Location / Meeting Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. Studio Boardroom A (or Google Meet: meet.google.com/xyz)"
                  value={arrangeLocation}
                  onChange={(e) => setArrangeLocation(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 7. Task Notes / Discussion Points */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Discussion Topics &amp; Preparation Notes
                </label>
                <textarea
                  placeholder="Specify key drawings to bring, structural questions, or client decisions required..."
                  value={arrangeNotes}
                  onChange={(e) => setArrangeNotes(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsArrangeModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingArrange || !arrangeTask.trim() || selectedAttendees.length === 0}
                  style={{
                    padding: '10px 22px',
                    backgroundColor: (!arrangeTask.trim() || selectedAttendees.length === 0) ? 'var(--bg-surface)' : 'var(--accent-gold)',
                    color: (!arrangeTask.trim() || selectedAttendees.length === 0) ? 'var(--text-muted)' : '#0d0f12',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: (!arrangeTask.trim() || selectedAttendees.length === 0) ? 'not-allowed' : 'pointer',
                    boxShadow: (!arrangeTask.trim() || selectedAttendees.length === 0) ? 'none' : 'var(--shadow-sm)',
                  }}
                >
                  {isSubmittingArrange ? 'Scheduling...' : 'Arrange Meeting & Notify Attendees'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
