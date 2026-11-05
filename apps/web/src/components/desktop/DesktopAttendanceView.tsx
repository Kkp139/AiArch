import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { StaffMemberRecord } from '../mobile/MobileAttendanceView';
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
} from 'lucide-react';
import './desktop.css';

export interface RegularizationRequest {
  id: string;
  staffName: string;
  date: string;
  reason: string;
  requestedTime: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface DesktopAttendanceViewProps {
  user: {
    fullName: string;
    role: UserRole;
    email?: string;
  };
  isClockedIn?: boolean;
  staffList?: StaffMemberRecord[];
  regularizationQueue?: RegularizationRequest[];
  onClockIn?: (coords: { lat: number; lng: number; address: string }) => void;
  onClockOut?: () => void;
  onSubmitDailyUpdate?: (slot: string, notes: string) => void;
  onApproveRegularization?: (requestId: string) => void;
  onRejectRegularization?: (requestId: string) => void;
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
  },
  {
    id: 'reg-2',
    staffName: 'Ananya Roy',
    date: '2026-11-03',
    requestedTime: '09:30 AM',
    reason: 'Marble supplier vendor warehouse sample inspection.',
    status: 'PENDING',
  },
];

export const DesktopAttendanceView: React.FC<DesktopAttendanceViewProps> = ({
  user,
  isClockedIn: controlledClockedIn = false,
  staffList = DEFAULT_STAFF,
  regularizationQueue = DEFAULT_REGULARIZATIONS,
  onClockIn,
  onClockOut,
  onSubmitDailyUpdate,
  onApproveRegularization,
  onRejectRegularization,
}) => {
  // Strict RBAC: Client roles are restricted from internal studio attendance roster
  if (user.role === 'CLIENT_LEADER' || user.role === 'CLIENT_VIEWER') {
    return (
      <div className="desktop-access-restricted" data-testid="attendance-restricted-card">
        <div className="desktop-access-restricted-icon">
          <ShieldX size={36} color="#D92D20" />
        </div>
        <h2 className="desktop-access-restricted-title">Access Restricted</h2>
        <p className="desktop-access-restricted-desc">
          Staff attendance, biometric geofence logs, and regularization rosters are internal studio operations restricted to studio personnel.
        </p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'ROSTER' | 'REGULARIZATION'>('ROSTER');
  const [internalClockedIn, setInternalClockedIn] = useState(controlledClockedIn);
  const [clockInTime, setClockInTime] = useState(controlledClockedIn ? '09:30 AM' : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateSlot, setUpdateSlot] = useState('Morning (10:00 - 13:00)');
  const [updateNotes, setUpdateNotes] = useState('');

  const isStaff = user.role === 'STAFF';

  const handleClockToggle = () => {
    if (internalClockedIn) {
      setInternalClockedIn(false);
      setClockInTime('');
      if (onClockOut) onClockOut();
    } else {
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setInternalClockedIn(true);
      setClockInTime(now);
      if (onClockIn) {
        onClockIn({
          lat: 23.0225,
          lng: 72.5714,
          address: 'Ahmedabad Studio HQ (Geofence Verified)',
        });
      }
    }
  };

  const handleSendDailyUpdate = () => {
    if (!updateNotes.trim()) return;
    if (onSubmitDailyUpdate) {
      onSubmitDailyUpdate(updateSlot, updateNotes);
    }
    setUpdateNotes('');
    setIsUpdateModalOpen(false);
    alert('Daily work update submitted to Studio Admin log.');
  };

  const filteredStaff = staffList.filter(
    (st) =>
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="desktop-view-container" data-testid="desktop-attendance-container">
      {/* Header Bar */}
      <div className="desktop-view-header">
        <div>
          <h1 className="desktop-view-title">Staff Attendance & Geofence Roster</h1>
          <p className="desktop-view-subtitle">
            Biometric geofence tracking, daily operational check-ins, and studio presence monitoring.
          </p>
        </div>

        <div className="desktop-header-action-group">
          {/* Staff Clock In / Clock Out Controls */}
          {isStaff && (
            <button
              type="button"
              data-testid="attendance-clock-in-btn"
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
            onClick={() => setIsUpdateModalOpen(true)}
            className="desktop-btn desktop-btn-secondary"
          >
            <FileText size={16} />
            <span>Submit Work Update</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Metrics Cards */}
      <div className="desktop-metrics-grid">
        <div className="desktop-metric-card" data-testid="attendance-metric-total">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Total Staff</span>
            <div className="desktop-metric-icon-wrap">
              <Users size={18} color="#0C0C0D" />
            </div>
          </div>
          <div className="desktop-metric-value">{staffList.length + 9}</div>
          <span className="desktop-metric-sub">Studio roster total</span>
        </div>

        <div className="desktop-metric-card" data-testid="attendance-metric-present">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">Present Today</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#E8F8EE' }}>
              <CheckCircle2 size={18} color="#087A48" />
            </div>
          </div>
          <div className="desktop-metric-value">11</div>
          <span className="desktop-metric-sub">Inside HQ geofence</span>
        </div>

        <div className="desktop-metric-card" data-testid="attendance-metric-onsite">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">On Site</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#EFF8FF' }}>
              <MapPin size={18} color="#175CD3" />
            </div>
          </div>
          <div className="desktop-metric-value">2</div>
          <span className="desktop-metric-sub">Architectural field inspection</span>
        </div>

        <div className="desktop-metric-card" data-testid="attendance-metric-leave">
          <div className="desktop-metric-top">
            <span className="desktop-metric-label">On Leave</span>
            <div className="desktop-metric-icon-wrap" style={{ background: '#FEF3F2' }}>
              <AlertCircle size={18} color="#D92D20" />
            </div>
          </div>
          <div className="desktop-metric-value">1</div>
          <span className="desktop-metric-sub">Approved leave</span>
        </div>
      </div>

      {/* Studio Geofence Active Card */}
      <div className="desktop-geofence-banner" data-testid="attendance-geofence-card">
        <div className="desktop-geofence-icon">
          <ShieldCheck size={24} color="#12B76A" />
        </div>
        <div className="desktop-geofence-text">
          <h3 className="desktop-geofence-title">Ahmedabad Studio HQ (23.0225° N, 72.5714° E)</h3>
          <p className="desktop-geofence-sub">
            Precision 100m radial geofence boundary is active. Automatic punch verification logged via GPS & IP coordinates.
          </p>
        </div>
        <span className="desktop-pill-confirmed">Geofence Active</span>
      </div>

      {/* Tab Switcher: Roster vs Regularization */}
      <div className="desktop-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('ROSTER')}
          className={`desktop-tab-btn ${activeTab === 'ROSTER' ? 'active' : ''}`}
        >
          Staff Register ({filteredStaff.length})
        </button>
        <button
          type="button"
          data-testid="attendance-tab-regularization"
          onClick={() => setActiveTab('REGULARIZATION')}
          className={`desktop-tab-btn ${activeTab === 'REGULARIZATION' ? 'active' : ''}`}
        >
          Regularization Requests ({regularizationQueue.length})
        </button>
      </div>

      {/* Roster View */}
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
            <span className="desktop-table-count">{filteredStaff.length} Architects & Engineers</span>
          </div>

          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Designation</th>
                <th>Clock In Time</th>
                <th>Current Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((st) => (
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
                    <div className="desktop-location-cell">
                      <MapPin size={13} color="#BF935A" />
                      <span>{st.location || 'Studio HQ'}</span>
                    </div>
                  </td>
                  <td>
                    {st.status === 'PRESENT' && (
                      <span className="desktop-pill-confirmed">Present</span>
                    )}
                    {st.status === 'ON_SITE' && (
                      <span className="desktop-pill-pending">On Site</span>
                    )}
                    {st.status === 'LEAVE' && (
                      <span className="desktop-pill-revision">Leave</span>
                    )}
                    {st.status === 'ABSENT' && (
                      <span className="desktop-pill-revision">Absent</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="desktop-table-action-link"
                      onClick={() => alert(`View biometric log for ${st.name}`)}
                    >
                      Audit Log
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Regularization Queue */}
      {activeTab === 'REGULARIZATION' && (
        <div className="desktop-table-card" data-testid="attendance-regularization-queue">
          <div className="desktop-table-header-tools">
            <h3 className="desktop-section-title">Pending Attendance Regularizations</h3>
            <span className="desktop-table-count">{regularizationQueue.length} Requests</span>
          </div>

          <table className="desktop-data-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Date</th>
                <th>Requested Punch</th>
                <th>Justification / Reason</th>
                <th>Status</th>
                {user.role === 'ADMIN' && <th>Admin Decision</th>}
              </tr>
            </thead>
            <tbody>
              {regularizationQueue.map((req) => (
                <tr key={req.id}>
                  <td>
                    <span className="desktop-cell-primary">{req.staffName}</span>
                  </td>
                  <td>{req.date}</td>
                  <td>
                    <span className="desktop-tag-pill">{req.requestedTime}</span>
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <span className="desktop-cell-secondary">{req.reason}</span>
                  </td>
                  <td>
                    <span className="desktop-pill-pending">Pending Review</span>
                  </td>
                  {user.role === 'ADMIN' && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="desktop-btn desktop-btn-sm desktop-btn-gold"
                          onClick={() => {
                            if (onApproveRegularization) onApproveRegularization(req.id);
                            alert(`Regularization approved for ${req.staffName}`);
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="desktop-btn desktop-btn-sm desktop-btn-secondary"
                          onClick={() => {
                            if (onRejectRegularization) onRejectRegularization(req.id);
                            alert(`Regularization rejected for ${req.staffName}`);
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
                <label>Time Slot</label>
                <select
                  className="desktop-form-select"
                  value={updateSlot}
                  onChange={(e) => setUpdateSlot(e.target.value)}
                >
                  <option value="Morning (10:00 - 13:00)">Morning (10:00 - 13:00)</option>
                  <option value="Afternoon (14:00 - 17:00)">Afternoon (14:00 - 17:00)</option>
                  <option value="Evening (17:00 - 20:00)">Evening (17:00 - 20:00)</option>
                </select>
              </div>
              <div className="desktop-form-group">
                <label>Architectural Progress & Tasks Performed</label>
                <textarea
                  className="desktop-form-textarea"
                  rows={4}
                  placeholder="Detail drawings drafted, site inspections, CAD layers reconciled, or coordination meetings..."
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
                disabled={!updateNotes.trim()}
                onClick={handleSendDailyUpdate}
              >
                <Send size={14} style={{ marginRight: '6px' }} />
                Submit Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

