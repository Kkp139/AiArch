import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  Calendar,
  Clock,
  Video,
  MapPin,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  RefreshCw,
  FolderKanban,
} from 'lucide-react';
import './mobile.css';

export interface MeetingItem {
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

export interface MobileMeetingsViewProps {
  userRole: UserRole;
  onBack: () => void;
}

export const MobileMeetingsView: React.FC<MobileMeetingsViewProps> = ({ userRole, onBack }) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(2); // Wednesday default
  const [meetings, setMeetings] = useState<MeetingItem[]>([
    {
      id: 'm-1',
      projectCode: 'AF-VILLA',
      projectName: 'Courtyard Villa',
      clientName: 'Dr. Sameer Mehta',
      date: '2026-11-04',
      slotTime: '12:00 – 13:30',
      agenda: 'Ground floor layout approval & travertine stone selection review',
      type: 'VIRTUAL',
      status: 'CONFIRMED',
      meetUrl: 'https://meet.google.com/xyz-af-villa',
    },
    {
      id: 'm-2',
      projectCode: 'AF-INN',
      projectName: 'Artilla Inn',
      clientName: 'Vikram Singhania',
      date: '2026-11-04',
      slotTime: '16:00 – 17:30',
      agenda: 'Facade lighting & MEP coordinate conflict resolution',
      type: 'STUDIO',
      status: 'PENDING_APPROVAL',
    },
    {
      id: 'm-3',
      projectCode: 'AF-CORP',
      projectName: 'Zenith HQ',
      clientName: 'Priya Sharma',
      date: '2026-11-05',
      slotTime: '18:00 – 19:30',
      agenda: 'Auditorium acoustics and ceiling elevation review',
      type: 'VIRTUAL',
      status: 'CONFIRMED',
      meetUrl: 'https://meet.google.com/corp-zenith',
    },
  ]);

  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Schedule New Meeting State
  const [newProject, setNewProject] = useState('Courtyard Villa');
  const [newClient, setNewClient] = useState('Dr. Sameer Mehta');
  const [newDate, setNewDate] = useState('2026-11-06');
  const [newSlot, setNewSlot] = useState('12:00 – 13:30');
  const [newType, setNewType] = useState<'VIRTUAL' | 'STUDIO'>('VIRTUAL');
  const [newAgenda, setNewAgenda] = useState('');

  const dateStrip = [
    { day: 'Mon', date: '02 Nov' },
    { day: 'Tue', date: '03 Nov' },
    { day: 'Wed', date: '04 Nov' },
    { day: 'Thu', date: '05 Nov' },
    { day: 'Fri', date: '06 Nov' },
  ];

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgenda.trim()) return;

    const created: MeetingItem = {
      id: `m-${Date.now()}`,
      projectCode: 'AF-GEN',
      projectName: newProject,
      clientName: newClient,
      date: newDate,
      slotTime: newSlot,
      agenda: newAgenda,
      type: newType,
      status: 'CONFIRMED',
      meetUrl: newType === 'VIRTUAL' ? 'https://meet.google.com/studio-call' : undefined,
    };

    setMeetings([created, ...meetings]);
    setIsScheduleModalOpen(false);
    setNewAgenda('');
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    setMeetings((prev) =>
      prev.map((m) =>
        m.id === selectedMeeting.id
          ? { ...m, status: 'RESCHEDULED', slotTime: '16:00 – 17:30' }
          : m
      )
    );
    setIsRescheduleModalOpen(false);
    setSelectedMeeting(null);
    setRescheduleReason('');
    alert('Meeting rescheduled. Client notified automatically.');
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;

    setMeetings((prev) => prev.filter((m) => m.id !== selectedMeeting.id));
    setIsRejectModalOpen(false);
    setSelectedMeeting(null);
    setRejectReason('');
    alert('Meeting request declined. Notification dispatched.');
  };

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header matching Figma 646:5911 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Meeting Schedule</h2>
        </div>
        <button
          className="figma-primary-btn-sm"
          onClick={() => setIsScheduleModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>Schedule</span>
        </button>
      </div>

      <div className="figma-subpage-body">
        {/* Date Selector Strip (Figma: 646:5911) */}
        <div className="figma-meeting-date-strip" style={{ marginBottom: '16px' }}>
          {dateStrip.map((item, idx) => (
            <button
              key={item.date}
              className={`figma-date-pill ${selectedDayIndex === idx ? 'active' : ''}`}
              onClick={() => setSelectedDayIndex(idx)}
            >
              <span className="figma-date-day">{item.day}</span>
              <span className="figma-date-num">{item.date.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Meeting Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {meetings.map((meeting) => {
            const isVirtual = meeting.type === 'VIRTUAL';
            const isConfirmed = meeting.status === 'CONFIRMED';
            const isPending = meeting.status === 'PENDING_APPROVAL';

            return (
              <div
                key={meeting.id}
                className="figma-meeting-card"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="figma-target-project-tag">{meeting.projectName}</span>
                    <span className="figma-meeting-type-tag">
                      {isVirtual ? <Video size={12} /> : <MapPin size={12} />}
                      {isVirtual ? 'Google Meet' : 'Studio HQ'}
                    </span>
                  </div>
                  <span
                    className={`figma-status-badge ${
                      isConfirmed ? 'cleared' : isPending ? 'pending' : 'review'
                    }`}
                  >
                    {meeting.status.replace('_', ' ')}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Clock size={15} color="#BF935A" />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#1D1D1F' }}>
                    {meeting.slotTime}
                  </span>
                </div>

                <h3 className="figma-meeting-agenda">{meeting.agenda}</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #F0F0F2', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} color="#686869" />
                    <span style={{ fontSize: '12px', color: '#686869' }}>{meeting.clientName}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#BF935A', fontWeight: 600 }}>Manage</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Meeting Detail & Action Drawer (Figma: 612:14355) */}
      {selectedMeeting && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedMeeting(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="figma-target-project-tag">{selectedMeeting.projectName}</span>
              <button onClick={() => setSelectedMeeting(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 6px 0' }}>
              {selectedMeeting.agenda}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#686869', marginBottom: '16px' }}>
              <Clock size={15} color="#BF935A" />
              <strong style={{ color: '#0C0C0D' }}>{selectedMeeting.slotTime}</strong>
              <span>• {selectedMeeting.type === 'VIRTUAL' ? 'Online Video Conference' : 'Studio In-Person'}</span>
            </div>

            <div className="figma-receipt-divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '14px 0 20px 0', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#686869' }}>Client:</span>
                <span style={{ fontWeight: 600, color: '#0C0C0D' }}>{selectedMeeting.clientName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#686869' }}>Status:</span>
                <span className="figma-status-badge cleared">{selectedMeeting.status.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedMeeting.meetUrl && (
                <a
                  href={selectedMeeting.meetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="figma-btn-gold-full"
                  style={{ textDecoration: 'none' }}
                >
                  <Video size={18} />
                  <span>Join Video Conference</span>
                </a>
              )}

              <button
                className="figma-btn-secondary-full"
                onClick={() => setIsRescheduleModalOpen(true)}
              >
                <RefreshCw size={16} />
                <span>Reschedule Meeting</span>
              </button>

              <button
                className="figma-btn-secondary-full"
                onClick={() => setIsRejectModalOpen(true)}
                style={{ color: '#D92D20', borderColor: '#FECDCA' }}
              >
                <X size={16} />
                <span>Decline / Cancel Meeting</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal (Figma: 443:7466) */}
      {isRescheduleModalOpen && (
        <div className="figma-bottom-sheet-overlay" style={{ zIndex: 110 }} onClick={() => setIsRescheduleModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px 0', color: '#0C0C0D' }}>
              Reschedule Meeting
            </h3>
            <p style={{ fontSize: '13px', color: '#686869', margin: '0 0 16px 0' }}>
              Select a new open slot from the studio calendar.
            </p>
            <form onSubmit={handleRescheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Available Slots</label>
                <select className="figma-form-input">
                  <option>Tomorrow (05 Nov) • 16:00 – 17:30</option>
                  <option>Tomorrow (05 Nov) • 18:00 – 19:30</option>
                  <option>Friday (06 Nov) • 12:00 – 13:30</option>
                </select>
              </div>

              <div>
                <label className="figma-form-label">Reason for Rescheduling</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Architect attending municipal site inspection..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsRescheduleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal (Figma: 443:7533) */}
      {isRejectModalOpen && (
        <div className="figma-bottom-sheet-overlay" style={{ zIndex: 110 }} onClick={() => setIsRejectModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px 0', color: '#D92D20' }}>
              Decline Meeting Request
            </h3>
            <p style={{ fontSize: '13px', color: '#686869', margin: '0 0 14px 0' }}>
              Please state why this slot cannot be accommodated.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <textarea
                required
                rows={3}
                placeholder="e.g. Conflicting client site handover meeting..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="figma-modal-textarea"
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsRejectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-full figma-btn-danger">
                  Decline Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Meeting Drawer (Figma: 443:7725) */}
      {isScheduleModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsScheduleModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Schedule Consultation</h3>
              <button onClick={() => setIsScheduleModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Project</label>
                <select
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="figma-form-input"
                >
                  <option value="Courtyard Villa">Courtyard Villa</option>
                  <option value="Artilla Inn">Artilla Inn</option>
                  <option value="Zenith HQ">Zenith HQ</option>
                </select>
              </div>

              <div>
                <label className="figma-form-label">Client Name</label>
                <input
                  type="text"
                  required
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="figma-form-label">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="figma-form-input"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="figma-form-label">Slot</label>
                  <select
                    value={newSlot}
                    onChange={(e) => setNewSlot(e.target.value)}
                    className="figma-form-input"
                  >
                    <option value="12:00 – 13:30">12:00 – 13:30</option>
                    <option value="16:00 – 17:30">16:00 – 17:30</option>
                    <option value="18:00 – 19:30">18:00 – 19:30</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="figma-form-label">Mode</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`figma-choice-pill ${newType === 'VIRTUAL' ? 'active' : ''}`}
                    onClick={() => setNewType('VIRTUAL')}
                  >
                    Google Meet
                  </button>
                  <button
                    type="button"
                    className={`figma-choice-pill ${newType === 'STUDIO' ? 'active' : ''}`}
                    onClick={() => setNewType('STUDIO')}
                  >
                    In-Person Studio
                  </button>
                </div>
              </div>

              <div>
                <label className="figma-form-label">Consultation Agenda</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Milestone review, structural sign-off, or material selection..."
                  value={newAgenda}
                  onChange={(e) => setNewAgenda(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsScheduleModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Book Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

