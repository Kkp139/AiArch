import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, Video } from 'lucide-react';

export const FIXED_MEETING_SLOTS = ['12:00–13:30', '16:00–17:30', '18:00–19:30'] as const;

export interface MeetingCalendarProps {
  projectCode: string;
  bookedSlots: string[]; // List of slot times that are already booked for this date
  onBookSlot?: (slot: string, agenda: string) => void;
  activeMeeting?: {
    id: string;
    slotTime: string;
    date: string;
    agenda: string;
    status: 'CONFIRMED' | 'RESCHEDULE_PENDING';
  };
}

export function MeetingCalendar({
  projectCode,
  bookedSlots,
  onBookSlot,
  activeMeeting,
}: MeetingCalendarProps) {
  const [selectedDate, setSelectedDate] = useState('2026-10-20');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [agenda, setAgenda] = useState('');

  const handleConfirmBooking = () => {
    if (!selectedSlot || !agenda.trim()) return;
    if (onBookSlot) {
      onBookSlot(selectedSlot, agenda);
    }
    setSelectedSlot(null);
    setAgenda('');
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        maxWidth: '800px',
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Architectural Consultation Bookings - Project {projectCode}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Fixed 90-minute design review sessions with atomic collision safeguards.
        </p>
      </div>

      {/* Active Meeting Banner & Reschedule Safeguard */}
      {activeMeeting && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--accent-gold)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                Confirmed Active Consultation
              </span>
              <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {activeMeeting.date} at {activeMeeting.slotTime}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Agenda: {activeMeeting.agenda}
              </p>
            </div>

            {activeMeeting.status === 'RESCHEDULE_PENDING' && (
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  color: 'var(--accent-amber)',
                  fontWeight: 600,
                }}
              >
                Reschedule Pending (Prior Slot Preserved)
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3 Fixed Consultation Slots */}
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
        Available Consultation Slots for {selectedDate}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {FIXED_MEETING_SLOTS.map((slot) => {
          const isBooked = bookedSlots.includes(slot);
          const isSelected = selectedSlot === slot;

          return (
            <div
              key={slot}
              style={{
                padding: '18px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: isBooked
                  ? 'var(--bg-surface)'
                  : isSelected
                  ? 'var(--bg-tertiary)'
                  : 'var(--bg-tertiary)',
                border: isSelected
                  ? '2px solid var(--accent-gold)'
                  : '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: isBooked ? 0.6 : 1,
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Clock size={16} color={isBooked ? 'var(--text-muted)' : 'var(--accent-gold)'} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {slot}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  90-Minute Studio Review
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
                      fontWeight: 600,
                    }}
                  >
                    <AlertCircle size={12} /> Booked
                  </span>
                ) : (
                  <button
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      backgroundColor: isSelected ? 'var(--accent-gold)' : 'var(--bg-surface)',
                      color: isSelected ? '#0d0f12' : 'var(--text-primary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {isSelected ? 'Selected' : 'Select Slot'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Booking Confirmation Box */}
      {selectedSlot && (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
            Confirm Consultation for {selectedSlot}
          </h4>
          <input
            type="text"
            placeholder="Specify meeting agenda (e.g. Ground Floor MEP coordination and material selection)..."
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={() => setSelectedSlot(null)}
              style={{ padding: '6px 12px', color: 'var(--text-secondary)', fontSize: '12px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmBooking}
              style={{
                padding: '6px 16px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
