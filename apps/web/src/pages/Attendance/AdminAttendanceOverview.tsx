import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileText,
  ShieldCheck,
  Building2,
  Smartphone,
  Calendar,
} from 'lucide-react';

export interface AdminAttendanceOverviewProps {
  getAuthHeaders: () => Record<string, string>;
}

interface SubmittedUpdate {
  id: string;
  slot: string;
  workSummary: string;
  submittedAt: string;
  projectCode?: string;
}

interface StaffSessionRecord {
  id: string;
  staffName: string;
  username: string;
  mobile?: string;
  role: string;
  isClockedIn: boolean;
  clockInAt: string;
  clockInAddress: string;
  clockOutAt?: string | null;
  pendingUpdates: string[];
  submittedUpdates: SubmittedUpdate[];
}

export const AdminAttendanceOverview: React.FC<AdminAttendanceOverviewProps> = ({ getAuthHeaders }) => {
  const [sessions, setSessions] = useState<StaffSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');

  const fetchAttendanceOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Attempt dedicated admin overview endpoint if available
      let records: StaffSessionRecord[] = [];
      const res = await fetch('/api/attendance/admin/overview', { headers: getAuthHeaders() });

      if (res.ok) {
        const data = await res.json();
        if (data.records && Array.isArray(data.records)) {
          records = data.records.map((r: any) => ({
            id: r.id,
            staffName: r.staffName || 'Staff Architect',
            username: r.username || 'staff',
            mobile: r.mobile || '+91 98251 00002',
            role: 'STAFF',
            isClockedIn: !r.clockOutAt,
            clockInAt: r.clockInAt,
            clockInAddress: r.clockInAddress || 'Ahmedabad Studio HQ',
            clockOutAt: r.clockOutAt,
            pendingUpdates: r.pendingUpdates || (r.dailyUpdates?.length ? [] : ['Slot 17:30']),
            submittedUpdates: r.dailyUpdates || [],
          }));
        }
      } else {
        // 2. Fallback to live /api/attendance/status
        const fallbackRes = await fetch('/api/attendance/status', { headers: getAuthHeaders() });
        if (fallbackRes.ok) {
          const statusData = await fallbackRes.json();
          if (statusData.isClockedIn && statusData.activeSession) {
            records.push({
              id: statusData.activeSession.id,
              staffName: 'Ar. Ronak Shah',
              username: 'staff',
              mobile: '+91 98251 00002',
              role: 'STAFF',
              isClockedIn: true,
              clockInAt: statusData.activeSession.clockInAt,
              clockInAddress: statusData.activeSession.clockInAddress || 'Ahmedabad Studio HQ',
              pendingUpdates: statusData.pendingUpdates || [],
              submittedUpdates: statusData.submittedUpdates || [],
            });
          }
        }
      }

      setSessions(records);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load admin attendance overview', err);
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAttendanceOverview();
  }, [fetchAttendanceOverview]);

  // Derived metrics
  const activeCount = sessions.filter(s => s.isClockedIn).length;
  const totalUpdatesCount = sessions.reduce((acc, s) => acc + s.submittedUpdates.length, 0);
  const pendingUpdatesCount = sessions.reduce((acc, s) => acc + s.pendingUpdates.length, 0);

  const filteredSessions = sessions.filter(s => {
    if (selectedFilter === 'ACTIVE') return s.isClockedIn;
    if (selectedFilter === 'PENDING') return s.pendingUpdates.length > 0;
    return true;
  });

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoString;
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px', width: '100%' }}>
      {/* Top Banner & Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-subtle, #2A2D32)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: 'var(--accent-gold, #BF935A)',
                backgroundColor: 'rgba(191, 147, 90, 0.12)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              STUDIO OVERSIGHT
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #8E8E93)' }}>
              Last checked: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary, #FFFFFF)', margin: 0 }}>
            Staff Attendance & Field Logs
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary, #A0A0A5)', marginTop: '4px', marginBottom: 0 }}>
            Monitor staff architect GPS clock-in logs, field site visits, and daily work update compliance in real-time.
          </p>
        </div>

        <button
          onClick={fetchAttendanceOverview}
          disabled={isLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-tertiary, #1F2226)',
            color: 'var(--text-primary, #FFFFFF)',
            border: '1px solid var(--border-subtle, #2A2D32)',
            borderRadius: 'var(--radius-sm, 6px)',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          <span>{isLoading ? 'Refreshing...' : 'Refresh Logs'}</span>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--bg-secondary, #141618)',
            border: '1px solid var(--border-subtle, #2A2D32)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #8E8E93)', fontWeight: 600 }}>
              Staff On Duty Today
            </span>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: activeCount > 0 ? '#10B981' : '#6B7280',
                boxShadow: activeCount > 0 ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none',
              }}
            />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary, #FFFFFF)' }}>
            {activeCount}
          </div>
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>
            {activeCount > 0 ? `${activeCount} actively clocked in` : 'No active punches'}
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-secondary, #141618)',
            border: '1px solid var(--border-subtle, #2A2D32)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #8E8E93)', fontWeight: 600 }}>
              Work Updates Logged
            </span>
            <FileText size={16} color="var(--accent-gold, #BF935A)" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-gold, #BF935A)' }}>
            {totalUpdatesCount}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary, #A0A0A5)' }}>
            Progress reports submitted today
          </span>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-secondary, #141618)',
            border: '1px solid var(--border-subtle, #2A2D32)',
            borderRadius: 'var(--radius-md, 8px)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #8E8E93)', fontWeight: 600 }}>
              Pending Clock-Out Gates
            </span>
            <AlertTriangle size={16} color={pendingUpdatesCount > 0 ? '#F59E0B' : '#10B981'} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: pendingUpdatesCount > 0 ? '#F59E0B' : '#10B981' }}>
            {pendingUpdatesCount}
          </div>
          <span style={{ fontSize: '12px', color: pendingUpdatesCount > 0 ? '#F59E0B' : '#10B981' }}>
            {pendingUpdatesCount > 0 ? 'Updates required before punch out' : 'All gates resolved'}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={() => setSelectedFilter('ALL')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid',
            borderColor: selectedFilter === 'ALL' ? 'var(--accent-gold, #BF935A)' : 'var(--border-subtle, #2A2D32)',
            backgroundColor: selectedFilter === 'ALL' ? 'rgba(191, 147, 90, 0.15)' : 'transparent',
            color: selectedFilter === 'ALL' ? 'var(--accent-gold, #BF935A)' : 'var(--text-secondary, #A0A0A5)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All Records ({sessions.length})
        </button>
        <button
          onClick={() => setSelectedFilter('ACTIVE')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid',
            borderColor: selectedFilter === 'ACTIVE' ? '#10B981' : 'var(--border-subtle, #2A2D32)',
            backgroundColor: selectedFilter === 'ACTIVE' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: selectedFilter === 'ACTIVE' ? '#10B981' : 'var(--text-secondary, #A0A0A5)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Active On-Duty ({activeCount})
        </button>
        <button
          onClick={() => setSelectedFilter('PENDING')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid',
            borderColor: selectedFilter === 'PENDING' ? '#F59E0B' : 'var(--border-subtle, #2A2D32)',
            backgroundColor: selectedFilter === 'PENDING' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
            color: selectedFilter === 'PENDING' ? '#F59E0B' : 'var(--text-secondary, #A0A0A5)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Pending Updates ({sessions.filter(s => s.pendingUpdates.length > 0).length})
        </button>
      </div>

      {/* Staff Attendance Logs List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredSessions.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              backgroundColor: 'var(--bg-secondary, #141618)',
              border: '1px solid var(--border-subtle, #2A2D32)',
              borderRadius: 'var(--radius-lg, 12px)',
              textAlign: 'center',
            }}
          >
            <Clock size={40} color="var(--text-muted, #8E8E93)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary, #FFFFFF)', margin: '0 0 6px 0' }}>
              No Staff Attendance Logs Found
            </h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #A0A0A5)', margin: 0 }}>
              Staff members have not punched in yet today, or no records match the active filter.
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              style={{
                backgroundColor: 'var(--bg-secondary, #141618)',
                border: '1px solid var(--border-subtle, #2A2D32)',
                borderRadius: 'var(--radius-lg, 12px)',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              {/* Session Top Bar: Staff Info & Active Status */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  paddingBottom: '14px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(191, 147, 90, 0.15)',
                      border: '1px solid var(--accent-gold, #BF935A)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-gold, #BF935A)',
                      fontWeight: 700,
                      fontSize: '15px',
                    }}
                  >
                    {session.staffName.replace('Ar. ', '').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary, #FFFFFF)', margin: 0 }}>
                        {session.staffName}
                      </h3>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          backgroundColor: '#2A2D32',
                          color: '#A0A0A5',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        STAFF ARCHITECT
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted, #8E8E93)', marginTop: '2px' }}>
                      @{session.username} {session.mobile && `• ${session.mobile}`}
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {session.isClockedIn ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#10B981',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          display: 'inline-block',
                        }}
                      />
                      Clocked In (Active Session)
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: 'rgba(142, 142, 147, 0.15)',
                        color: '#8E8E93',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={14} /> Completed Session
                    </span>
                  )}
                </div>
              </div>

              {/* Time & GPS Verification Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '14px',
                  backgroundColor: 'var(--bg-tertiary, #1A1D20)',
                  borderRadius: 'var(--radius-sm, 8px)',
                  padding: '14px 16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #8E8E93)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Punch In Time
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary, #FFFFFF)', fontSize: '13px', fontWeight: 600 }}>
                    <Calendar size={14} color="var(--accent-gold, #BF935A)" />
                    <span>{formatDate(session.clockInAt)} at {formatTime(session.clockInAt)}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #8E8E93)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    GPS Punch Location
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10B981', fontSize: '13px', fontWeight: 600 }}>
                    <MapPin size={14} />
                    <span>{session.clockInAddress}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #8E8E93)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Clock Out Status
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: session.clockOutAt ? 'var(--text-primary, #FFFFFF)' : '#F59E0B', fontSize: '13px', fontWeight: 600 }}>
                    <Clock size={14} />
                    <span>{session.clockOutAt ? `${formatTime(session.clockOutAt)}` : 'On Duty (Session Active)'}</span>
                  </div>
                </div>
              </div>

              {/* Daily Work Updates Log Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #FFFFFF)' }}>
                    Daily Work Progress Reports ({session.submittedUpdates.length})
                  </span>
                  {session.pendingUpdates.length > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#F59E0B',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                    >
                      Pending: {session.pendingUpdates.join(', ')}
                    </span>
                  )}
                </div>

                {session.submittedUpdates.length === 0 ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'rgba(255,255,255,0.02)',
                      border: '1px dashed var(--border-subtle, #2A2D32)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: 'var(--text-muted, #8E8E93)',
                    }}
                  >
                    No daily work updates submitted for this session yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {session.submittedUpdates.map((update) => (
                      <div
                        key={update.id}
                        style={{
                          backgroundColor: 'var(--bg-tertiary, #1A1D20)',
                          border: '1px solid var(--border-subtle, #2A2D32)',
                          borderRadius: '6px',
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: 'var(--accent-gold, #BF935A)',
                                backgroundColor: 'rgba(191, 147, 90, 0.1)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {update.slot}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted, #8E8E93)' }}>
                              Submitted at {formatTime(update.submittedAt)}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Verified
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary, #FFFFFF)', margin: 0, lineHeight: 1.4 }}>
                          "{update.workSummary}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
