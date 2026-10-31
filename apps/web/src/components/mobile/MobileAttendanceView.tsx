import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
} from 'lucide-react';
import './mobile.css';

export interface StaffMemberRecord {
  id: string;
  name: string;
  role: string;
  status: 'PRESENT' | 'ON_SITE' | 'ABSENT' | 'LEAVE';
  clockInTime?: string;
  location?: string;
  avatar: string;
}

export interface MobileAttendanceViewProps {
  userRole: UserRole;
  isClockedIn: boolean;
  pendingUpdates: string[];
  onBack: () => void;
  onClockIn?: (coords: { lat: number; lng: number; address: string }) => void;
  onClockOut?: () => void;
  onSubmitUpdate?: (slot: string, notes: string) => void;
}

export const MobileAttendanceView: React.FC<MobileAttendanceViewProps> = ({
  userRole,
  isClockedIn,
  pendingUpdates,
  onBack,
  onClockIn,
  onClockOut,
  onSubmitUpdate,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'STAFF_REGISTER' | 'REGULARIZATION'>('OVERVIEW');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateText, setUpdateText] = useState('');
  const [gpsLocation, setGpsLocation] = useState('Ahmedabad Studio HQ (Geofence Verified)');

  const [staffList, setStaffList] = useState<StaffMemberRecord[]>([
    {
      id: 'st-1',
      name: 'Farhan Admani',
      role: 'Principal Architect',
      status: 'PRESENT',
      clockInTime: '09:15 AM',
      location: 'Studio HQ',
      avatar: 'F',
    },
    {
      id: 'st-2',
      name: 'Sonu Sharma',
      role: 'Senior UI/UX & BIM Lead',
      status: 'ON_SITE',
      clockInTime: '09:30 AM',
      location: 'Courtyard Villa Site',
      avatar: 'S',
    },
    {
      id: 'st-3',
      name: 'Rajesh Patel',
      role: 'Project Architect',
      status: 'PRESENT',
      clockInTime: '09:45 AM',
      location: 'Studio HQ',
      avatar: 'R',
    },
    {
      id: 'st-4',
      name: 'Ananya Roy',
      role: 'Interior Designer',
      status: 'ON_SITE',
      clockInTime: '10:00 AM',
      location: 'Artilla Inn Site',
      avatar: 'A',
    },
    {
      id: 'st-5',
      name: 'Karan Dave',
      role: 'Site Supervisor',
      status: 'ABSENT',
      avatar: 'K',
    },
  ]);

  const [regularizationRequests, setRegularizationRequests] = useState([
    {
      id: 'reg-1',
      staffName: 'Karan Dave',
      date: 'Yesterday',
      reason: 'Late site punch due to concrete pour transit delay',
      requestedTime: '09:30 AM - 07:00 PM',
      status: 'PENDING',
    },
  ]);

  const handlePunchClock = () => {
    if (isClockedIn) {
      if (onClockOut) onClockOut();
    } else {
      if (onClockIn) {
        onClockIn({ lat: 23.0225, lng: 72.5714, address: 'Ahmedabad Studio HQ' });
      }
    }
  };

  const handleSendDailyUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;
    if (onSubmitUpdate) {
      onSubmitUpdate(pendingUpdates[0] || '12:00 PM Slot', updateText);
    }
    setUpdateText('');
    setIsUpdateModalOpen(false);
  };

  const handleApproveReg = (id: string) => {
    setRegularizationRequests((prev) => prev.filter((r) => r.id !== id));
    alert('Regularization request approved.');
  };

  const handleRejectReg = (id: string) => {
    setRegularizationRequests((prev) => prev.filter((r) => r.id !== id));
    alert('Regularization request rejected.');
  };

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header matching Figma 409:5723 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Attendance Summary</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className={`figma-clock-toggle-btn ${isClockedIn ? 'clocked-in' : ''}`}
            onClick={handlePunchClock}
          >
            <Clock size={15} />
            <span>{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
          </button>
        </div>
      </div>

      <div className="figma-subpage-body">
        {/* Date Selector Banner (Figma: 409:5728) */}
        <div className="figma-attendance-date-banner">
          <Calendar size={18} color="#BF935A" />
          <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
            Current Week: 05 Oct – 11 Oct 2026
          </span>
          <ChevronRight size={16} color="#979798" />
        </div>

        {/* 4 Attendance Metrics Chips (Figma: 409:5733) */}
        <div className="figma-attendance-metric-grid">
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">Total Staff</span>
            <span className="figma-att-metric-val" style={{ color: '#1D1D1F' }}>5</span>
          </div>
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">Present</span>
            <span className="figma-att-metric-val" style={{ color: '#087A48' }}>4</span>
          </div>
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">On Site</span>
            <span className="figma-att-metric-val" style={{ color: '#A35A13' }}>2</span>
          </div>
          <div className="figma-att-metric-box">
            <span className="figma-att-metric-label">Absent</span>
            <span className="figma-att-metric-val" style={{ color: '#D70015' }}>1</span>
          </div>
        </div>

        {/* Personal Clock Status Card */}
        <div className="figma-clock-status-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#686869', textTransform: 'uppercase' }}>
              My Daily Status
            </span>
            <span className={`figma-status-badge ${isClockedIn ? 'cleared' : 'pending'}`}>
              {isClockedIn ? 'Actively Shifted' : 'Not Clocked In'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4A4A4C', marginBottom: '12px' }}>
            <MapPin size={14} color="#BF935A" />
            <span>{gpsLocation}</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`figma-btn-full ${isClockedIn ? 'figma-btn-danger' : 'figma-btn-gold'}`}
              onClick={handlePunchClock}
            >
              <Clock size={16} />
              <span>{isClockedIn ? 'Clock Out (Finish Shift)' : 'Punch Clock In (Start Shift)'}</span>
            </button>
            {isClockedIn && (
              <button
                className="figma-btn-secondary"
                onClick={() => setIsUpdateModalOpen(true)}
                title="Submit Work Update"
              >
                <Send size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Weekly Attendance Distribution Chart (Figma: 409:5748) */}
        <div className="figma-detail-card" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1D1D1F' }}>Weekly Attendance Overview</span>
            <span style={{ fontSize: '11px', color: '#087A48', fontWeight: 600 }}>92% Compliance</span>
          </div>

          {/* Simple stacked bar representation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '90px', padding: '0 4px' }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
              const presentHeight = [65, 80, 75, 85, 70, 60][idx];
              const siteHeight = [20, 25, 30, 25, 20, 15][idx];
              return (
                <div key={day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '24px', height: '70px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', borderRadius: '4px', overflow: 'hidden', background: '#F0F0F2' }}>
                    <div style={{ height: `${siteHeight}%`, background: '#BF935A', width: '100%' }} title="On Site" />
                    <div style={{ height: `${presentHeight - siteHeight}%`, background: '#087A48', width: '100%' }} title="Present" />
                  </div>
                  <span style={{ fontSize: '11px', color: '#686869' }}>{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Register Tabs */}
        <div style={{ marginTop: '20px' }}>
          <div className="figma-pill-tab-group" style={{ marginBottom: '12px' }}>
            <button
              className={`figma-pill-tab ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
              onClick={() => setActiveTab('OVERVIEW')}
            >
              <span>Staff Register (5)</span>
            </button>
            {userRole === 'ADMIN' && (
              <button
                className={`figma-pill-tab ${activeTab === 'REGULARIZATION' ? 'active' : ''}`}
                onClick={() => setActiveTab('REGULARIZATION')}
              >
                <span>Regularizations ({regularizationRequests.length})</span>
              </button>
            )}
          </div>

          {activeTab === 'OVERVIEW' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {staffList.map((st) => (
                <div key={st.id} className="figma-staff-row-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="figma-avatar-md">{st.avatar}</div>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1D1D1F', margin: '0 0 2px 0' }}>
                        {st.name}
                      </h4>
                      <span style={{ fontSize: '12px', color: '#686869' }}>{st.role}</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      className={`figma-status-badge ${
                        st.status === 'PRESENT' ? 'cleared' : st.status === 'ON_SITE' ? 'pending' : 'revision'
                      }`}
                    >
                      {st.status.replace('_', ' ')}
                    </span>
                    {st.clockInTime && (
                      <div style={{ fontSize: '11px', color: '#686869', marginTop: '4px' }}>
                        In: {st.clockInTime}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {regularizationRequests.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#979798', fontSize: '13px', padding: '24px 0' }}>
                  No pending regularization requests.
                </p>
              ) : (
                regularizationRequests.map((req) => (
                  <div key={req.id} className="figma-reg-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '14px', color: '#1D1D1F' }}>{req.staffName}</strong>
                      <span style={{ fontSize: '12px', color: '#979798' }}>{req.date}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4A4A4C', margin: '0 0 6px 0' }}>{req.reason}</p>
                    <div style={{ fontSize: '12px', color: '#BF935A', marginBottom: '12px', fontWeight: 600 }}>
                      Adjusted slot: {req.requestedTime}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="figma-btn-sm figma-btn-danger" onClick={() => handleRejectReg(req.id)}>
                        Reject
                      </button>
                      <button className="figma-btn-sm figma-btn-gold" onClick={() => handleApproveReg(req.id)}>
                        Approve Regularization
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit Work Update Modal (Figma: 409:5828) */}
      {isUpdateModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsUpdateModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Daily Work Update</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleSendDailyUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Current Task / Activity Slot</label>
                <div style={{ padding: '10px 14px', background: '#F5F5F7', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                  {pendingUpdates[0] || '12:00 PM - 02:00 PM Mid-day Slot'}
                </div>
              </div>

              <div>
                <label className="figma-form-label">Work Summary & Site Progress</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail activities completed, vendors inspected, or drawing revisions issued..."
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsUpdateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  <Send size={16} />
                  <span>Submit Work Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

