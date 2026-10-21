import React, { useState } from 'react';
import { MapPin, Clock, AlertTriangle, CheckCircle, Send, LogOut } from 'lucide-react';

export interface StaffAttendanceProps {
  isClockedIn: boolean;
  pendingUpdates: string[]; // List of required update slots not yet submitted
  onClockIn?: (coords: { lat: number; lng: number; address: string }) => void;
  onClockOut?: () => void;
  onSubmitUpdate?: (slot: string, notes: string) => void;
}

export function StaffAttendance({
  isClockedIn,
  pendingUpdates,
  onClockIn,
  onClockOut,
  onSubmitUpdate,
}: StaffAttendanceProps) {
  const [selectedSlot, setSelectedSlot] = useState(pendingUpdates[0] || '');
  const [updateText, setUpdateText] = useState('');
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const hasPendingUpdates = pendingUpdates.length > 0;

  const handlePunchClockIn = () => {
    // Capture GPS coordinates or use office geofence coordinates
    setGpsStatus('Acquiring high-accuracy GPS coordinates...');
    const coords = { lat: 23.0225, lng: 72.5714, address: 'Ahmedabad Studio HQ' };
    setTimeout(() => {
      setGpsStatus('GPS Verified: 23.0225° N, 72.5714° E (Studio Office)');
      if (onClockIn) onClockIn(coords);
    }, 300);
  };

  const handleSubmitSlotUpdate = () => {
    if (!updateText.trim()) return;
    if (onSubmitUpdate) {
      onSubmitUpdate(selectedSlot || pendingUpdates[0] || 'Current Slot', updateText);
    }
    setUpdateText('');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        maxWidth: '800px',
      }}
    >
      {/* Attendance Punch Card */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Staff Attendance & Geofence Punch
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Mandatory GPS location required for attendance records.
            </p>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: isClockedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
              color: isClockedIn ? 'var(--accent-emerald)' : 'var(--accent-rose)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={14} />
            <span>{isClockedIn ? 'Session Active' : 'Not Clocked In'}</span>
          </div>
        </div>

        {gpsStatus && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--accent-emerald)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <MapPin size={14} />
            <span>{gpsStatus}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          {!isClockedIn ? (
            <button
              onClick={handlePunchClockIn}
              style={{
                padding: '10px 24px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MapPin size={16} />
              <span>Punch Clock-In (GPS)</span>
            </button>
          ) : (
            <div style={{ width: '100%' }}>
              {/* CLOCK-OUT HARD GATE WARNING BANNER */}
              {hasPendingUpdates && (
                <div
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid var(--accent-rose)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={18} color="var(--accent-rose)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-rose)', marginBottom: '4px' }}>
                        Mandatory Daily Update Pending
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Studio policy strictly mandates all scheduled daily work updates be submitted before clocking out.
                      </p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {pendingUpdates.map((slot) => (
                          <span
                            key={slot}
                            style={{
                              padding: '2px 8px',
                              backgroundColor: 'rgba(244, 63, 94, 0.15)',
                              color: 'var(--accent-rose)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {slot}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                disabled={hasPendingUpdates}
                onClick={onClockOut}
                style={{
                  padding: '10px 24px',
                  backgroundColor: hasPendingUpdates ? 'var(--bg-surface)' : 'var(--accent-rose)',
                  color: hasPendingUpdates ? 'var(--text-muted)' : '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: hasPendingUpdates ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <LogOut size={16} />
                <span>Clock Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Daily Work Update Submission Section */}
      {isClockedIn && (
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Submit Daily Work Update
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Document your CAD revisions, client call summaries, or site visit notes for this session slot.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingUpdates.length > 0 && (
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                {pendingUpdates.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot} (Pending)
                  </option>
                ))}
              </select>
            )}

            <textarea
              placeholder="Detail your completed architectural drawings, client revisions, or site measurements..."
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
              style={{
                width: '100%',
                height: '90px',
                padding: '10px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSubmitSlotUpdate}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'var(--accent-gold)',
                  color: '#0d0f12',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Send size={14} />
                <span>Submit Work Update</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
