import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  CalendarDays,
  Clock,
  Video,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  MapPin,
  Calendar,
  Building2,
  Users,
  RotateCcw,
  ShieldAlert,
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
  status: 'CONFIRMED' | 'PENDING_APPROVAL' | 'RESCHEDULED';
  meetUrl?: string;
}

export interface DesktopMeetingsViewProps {
  userRole: UserRole;
  projectCode?: string;
  onScheduleSuccess?: (meeting: DesktopMeeting) => void;
}

export const DesktopMeetingsView: React.FC<DesktopMeetingsViewProps> = ({
  userRole,
  projectCode = 'AF-VILLA',
  onScheduleSuccess,
}) => {
  // 1. STRICT STAFF GATE: Staff cannot access meetings per Master Spec Ch 14
  if (userRole === 'STAFF') {
    return (
      <div className="desk-restricted-card" data-testid="meetings-staff-restricted">
        <div className="desk-restricted-icon-box">
          <ShieldAlert size={36} style={{ color: 'var(--desk-danger)' }} />
        </div>
        <h2 className="desk-restricted-title">Meetings Access Restricted</h2>
        <p className="desk-restricted-desc">
          Staff members are strictly restricted from client consultation scheduling and Google Meet
          rooms in accordance with Studio Governance & Master Spec Chapter 14.
        </p>
      </div>
    );
  }

  const isAdmin = userRole === 'ADMIN';
  const isClient = userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER';

  // State
  const [selectedDate, setSelectedDate] = useState('2026-11-04');
  const [meetings, setMeetings] = useState<DesktopMeeting[]>([
    {
      id: 'm-101',
      projectCode: 'AF-VILLA',
      projectName: 'Courtyard Villa',
      clientName: 'Dr. Sameer Mehta',
      date: '2026-11-04',
      slotTime: '12:00–13:30',
      agenda: 'Ground floor layout approval & travertine stone selection review',
      type: 'VIRTUAL',
      status: 'CONFIRMED',
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
      status: 'PENDING_APPROVAL',
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
      status: 'CONFIRMED',
      meetUrl: 'https://meet.google.com/corp-zenith',
    },
  ]);

  // Modal Dialogs
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [activeRescheduleMeeting, setActiveRescheduleMeeting] = useState<DesktopMeeting | null>(null);

  // Form Fields for Schedule / Request
  const [formDate, setFormDate] = useState('2026-11-04');
  const [formSlot, setFormSlot] = useState<string>('12:00–13:30');
  const [formAgenda, setFormAgenda] = useState('');
  const [formType, setFormType] = useState<'VIRTUAL' | 'STUDIO'>('VIRTUAL');
  const [formMeetUrl, setFormMeetUrl] = useState('https://meet.google.com/studio-consult');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Days of current week for calendar view
  const weekDays = [
    { name: 'Mon', date: '2026-11-02' },
    { name: 'Tue', date: '2026-11-03' },
    { name: 'Wed', date: '2026-11-04' },
    { name: 'Thu', date: '2026-11-05' },
    { name: 'Fri', date: '2026-11-06' },
    { name: 'Sat', date: '2026-11-07' },
    { name: 'Sun', date: '2026-11-08' },
  ];

  // Submit Schedule / Request
  const handleSaveMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAgenda.trim()) return;

    const newMeeting: DesktopMeeting = {
      id: `m-${Date.now()}`,
      projectCode,
      projectName: 'Courtyard Villa',
      clientName: isAdmin ? 'Client Representative' : 'Dr. Sameer Mehta',
      date: formDate,
      slotTime: formSlot,
      agenda: formAgenda.trim(),
      type: formType,
      status: isAdmin ? 'CONFIRMED' : 'PENDING_APPROVAL',
      meetUrl: formType === 'VIRTUAL' ? formMeetUrl : undefined,
    };

    setMeetings((prev) => [...prev, newMeeting]);
    if (onScheduleSuccess) onScheduleSuccess(newMeeting);

    setIsScheduleModalOpen(false);
    setFormAgenda('');
  };

  // Submit Reschedule
  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRescheduleMeeting) return;

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === activeRescheduleMeeting.id
          ? {
              ...m,
              date: formDate,
              slotTime: formSlot,
              status: 'RESCHEDULED',
              agenda: `${m.agenda} (Rescheduled: ${rescheduleReason || 'Requested by studio'})`,
            }
          : m
      )
    );

    setIsRescheduleModalOpen(false);
    setActiveRescheduleMeeting(null);
    setRescheduleReason('');
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

      {/* Week Selector Bar */}
      <div className="desk-calendar-week-bar" data-testid="calendar-week-bar">
        {weekDays.map((day) => {
          const isSelected = selectedDate === day.date;
          const dayMeetings = meetings.filter((m) => m.date === day.date);

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
                <span className="desk-day-badge">{dayMeetings.length} Slots</span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3 Studio Daily Slots Grid */}
      <div className="desk-slots-container" data-testid="daily-slots-grid">
        <h2 className="desk-section-title">
          Scheduled Slots for {selectedDate} ({FIXED_DAILY_SLOTS.length} Studio Windows)
        </h2>

        <div className="desk-daily-slots-grid">
          {FIXED_DAILY_SLOTS.map((slot) => {
            const meetingInSlot = meetings.find(
              (m) => m.date === selectedDate && m.slotTime.includes(slot.time.split('–')[0].trim())
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

      {/* Centered Schedule / Request Modal Dialog */}
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
              <div className="desk-form-group">
                <label>Date</label>
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
                <label>Studio Daily Slot (Fixed 3 Slots)</label>
                <select
                  className="desk-form-input"
                  value={formSlot}
                  onChange={(e) => setFormSlot(e.target.value)}
                  data-testid="select-meeting-slot"
                >
                  <option value="12:00–13:30">12:00–13:30 (Afternoon Slot)</option>
                  <option value="16:00–17:30">16:00–17:30 (Evening Slot 1)</option>
                  <option value="18:00–19:30">18:00–19:30 (Evening Slot 2)</option>
                </select>
              </div>

              <div className="desk-form-group">
                <label>Meeting Format</label>
                <div className="desk-radio-group">
                  <label>
                    <input
                      type="radio"
                      name="meetingType"
                      value="VIRTUAL"
                      checked={formType === 'VIRTUAL'}
                      onChange={() => setFormType('VIRTUAL')}
                    />
                    <span>Virtual (Google Meet)</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="meetingType"
                      value="STUDIO"
                      checked={formType === 'STUDIO'}
                      onChange={() => setFormType('STUDIO')}
                    />
                    <span>In-Person Studio</span>
                  </label>
                </div>
              </div>

              {formType === 'VIRTUAL' && (
                <div className="desk-form-group">
                  <label>Google Meet URL</label>
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
                <label>Consultation Agenda & Notes</label>
                <textarea
                  className="desk-form-textarea"
                  rows={3}
                  placeholder="Travertine stone selection, living courtyard elevation review..."
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
                  data-testid="confirm-schedule-btn"
                >
                  {isAdmin ? 'Confirm & Book Slot' : 'Submit Consultation Request'}
                </button>
              </div>
            </form>
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
                Rescheduling: <strong>{activeRescheduleMeeting.projectName}</strong> with {activeRescheduleMeeting.clientName}
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
