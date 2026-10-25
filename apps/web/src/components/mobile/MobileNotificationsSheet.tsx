import React, { useState } from 'react';
import { ChevronLeft, Palette, UserPlus, Upload, Bell } from 'lucide-react';

export interface MobileNotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNotificationsSheet: React.FC<MobileNotificationsSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const [markedRead, setMarkedRead] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="figma-sheet-backdrop" onClick={onClose}>
      <div
        className="figma-sheet-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '20px 20px 32px 20px', borderRadius: '28px 28px 0 0', maxHeight: '90vh' }}
      >
        {/* Header (Figma: 74:9791) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#F5F5F7',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={20} color="#0C0C0D" />
            </button>
            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Notifications
            </h3>
          </div>

          <button
            onClick={() => setMarkedRead(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#BF935A',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Mark all as read
          </button>
        </div>

        {/* TODAY SECTION */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#686869', marginBottom: '12px' }}>
            Today
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2].map((idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid #EFEFEF',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      background: '#352618',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Palette size={20} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0', color: '#0C0C0D' }}>
                      Drawing approved
                    </h5>
                    <div style={{ fontSize: '12px', color: '#686869' }}>
                      Site plan . The Courtyard House
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#979798' }}>10 min ago</span>
                  {!markedRead && (
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#12B76A' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* YESTERDAY SECTION */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#686869', marginBottom: '12px' }}>
            Yesterday
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px',
                border: '1px solid #EFEFEF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#352618',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserPlus size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0', color: '#0C0C0D' }}>
                    New team member
                  </h5>
                  <div style={{ fontSize: '12px', color: '#686869' }}>
                    Lakeview Residence
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#979798' }}>Yesterday</span>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px',
                border: '1px solid #EFEFEF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#352618',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0', color: '#0C0C0D' }}>
                    File uploaded
                  </h5>
                  <div style={{ fontSize: '12px', color: '#686869' }}>
                    Zoning plan . Greenfield House
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#979798' }}>Yesterday</span>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px',
                border: '1px solid #EFEFEF',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: '#352618',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Bell size={20} />
                </div>
                <div>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 2px 0', color: '#0C0C0D' }}>
                    Reminder
                  </h5>
                  <div style={{ fontSize: '12px', color: '#686869' }}>
                    Review pending drawings
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#979798' }}>Yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
