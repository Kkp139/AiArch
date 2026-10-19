import React, { useState } from 'react';
import { AuthProvider, useAuth, UserProfile, UserRole } from './context/AuthContext';
import { Shell } from './components/layout/Shell';
import { DocumentExplorer } from './pages/Vault/DocumentExplorer';
import { VerificationList, VerificationItem } from './pages/Verification/VerificationList';
import { MeetingCalendar } from './pages/Meetings/MeetingCalendar';
import { StaffAttendance } from './pages/Attendance/StaffAttendance';
import { PaymentLedger, PaymentRecord } from './pages/Payments/PaymentLedger';
import { ProjectChatRoom, ChatMessageItem } from './pages/Chat/ProjectChatRoom';
import { FolderKanban, ArrowRight, Shield, UserCheck, Eye, HardHat } from 'lucide-react';

const MOCK_USERS: Record<UserRole, UserProfile> = {
  ADMIN: {
    id: 'usr-admin-1',
    fullName: 'Kamal Patel',
    role: 'ADMIN',
    showPricing: true,
  },
  STAFF: {
    id: 'usr-staff-1',
    fullName: 'Ronak Shah',
    role: 'STAFF',
    showPricing: false,
  },
  CLIENT_LEADER: {
    id: 'usr-client-1',
    fullName: 'Rajesh Mehta',
    role: 'CLIENT_LEADER',
    showPricing: true,
  },
  CLIENT_VIEWER: {
    id: 'usr-viewer-1',
    fullName: 'Pooja Mehta',
    role: 'CLIENT_VIEWER',
    showPricing: false,
  },
};

const INITIAL_VERIFICATIONS: VerificationItem[] = [
  {
    id: 'ver-1',
    drawingTitle: 'Ground Floor Architectural Layout Plan',
    category: '01_ARCHITECTURAL_PLANS',
    revisionNumber: 3,
    status: 'PENDING_APPROVAL',
    submittedAt: '2026-10-18T14:30:00Z',
  },
  {
    id: 'ver-2',
    drawingTitle: 'RCC Foundation & Column Schedule',
    category: '02_STRUCTURAL_DRAWINGS',
    revisionNumber: 2,
    status: 'APPROVED',
    submittedAt: '2026-10-16T10:00:00Z',
  },
  {
    id: 'ver-3',
    drawingTitle: 'Living Room Ceiling & Lighting Detail',
    category: '06_INTERIOR_DETAILS',
    revisionNumber: 1,
    status: 'REVISION_REQUIRED',
    submittedAt: '2026-10-17T16:15:00Z',
    adminNotes: 'Increase cove light offset by 50mm as requested by client.',
  },
];

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'pay-1',
    milestoneTitle: 'Mobilization & Concept Sign-off (10%)',
    amount: 500000,
    paymentMode: 'NEFT_RTGS',
    status: 'CONFIRMED',
    referenceNumber: 'NEFT99887711',
    bankName: 'HDFC Bank',
    createdAt: '2026-09-15',
  },
  {
    id: 'pay-2',
    milestoneTitle: 'Municipal Permit Drawings Approval (25%)',
    amount: 1250000,
    paymentMode: 'CHEQUE',
    status: 'CONFIRMED',
    referenceNumber: 'CHQ-445566',
    bankName: 'ICICI Bank',
    createdAt: '2026-10-01',
  },
  {
    id: 'pay-3',
    milestoneTitle: 'Structural Working Drawings Release (25%)',
    amount: 1250000,
    paymentMode: 'NEFT_RTGS',
    status: 'PENDING_CLEARANCE',
    referenceNumber: 'UTR-20261019-8822',
    bankName: 'Axis Bank',
    createdAt: '2026-10-18',
  },
];

const INITIAL_CHAT_MESSAGES: ChatMessageItem[] = [
  {
    id: 'msg-1',
    senderName: 'Kamal Patel',
    senderRole: 'ADMIN',
    text: 'Good morning Rajesh bhai. We have updated the ground floor electrical layout with the Italian marble island lighting.',
    createdAt: '2026-10-19T09:30:00Z',
  },
  {
    id: 'msg-2',
    senderName: 'Rajesh Mehta',
    senderRole: 'CLIENT_LEADER',
    text: 'Thank you Kamal. Can we review the lighting switchboards in our 4:00 PM consultation slot today?',
    createdAt: '2026-10-19T09:45:00Z',
  },
];

function MainApp() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [activeTab, setActiveTab] = useState('projects');

  // Attendance simulation states
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState<string[]>(['Slot +3h (12:00)']);

  // Verification simulation state
  const [verifications, setVerifications] = useState<VerificationItem[]>(INITIAL_VERIFICATIONS);

  // Payments simulation state
  const [payments, setPayments] = useState<PaymentRecord[]>(INITIAL_PAYMENTS);

  // Chat simulation state
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>(INITIAL_CHAT_MESSAGES);

  const currentUser = MOCK_USERS[selectedRole];

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    // If Staff is selected and current tab is Payments or Chat, navigate to Projects
    if (role === 'STAFF' && (activeTab === 'payments' || activeTab === 'chat' || activeTab === 'meetings')) {
      setActiveTab('projects');
    }
  };

  const handleApproveVerification = (id: string) => {
    setVerifications((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: 'APPROVED' } : v))
    );
  };

  const handleRequestRevision = (id: string, notes: string) => {
    setVerifications((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              status: 'REVISION_REQUIRED',
              revisionNumber: v.revisionNumber + 1,
              adminNotes: notes,
            }
          : v
      )
    );
  };

  const handleDiscrepancySubmit = (paymentId: string, note: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? { ...p, status: 'REVISION_REQUESTED', discrepancyNote: note }
          : p
      )
    );
  };

  const handleSendMessage = (text: string, attachment?: { name: string; size: number; url: string }) => {
    const newMsg: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      senderName: currentUser.fullName,
      senderRole: currentUser.role,
      text,
      attachmentName: attachment?.name,
      attachmentUrl: attachment?.url,
      createdAt: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, newMsg]);
  };

  return (
    <div>
      {/* Interactive Role Switcher Bar (For local preview & workflow testing) */}
      <div
        style={{
          backgroundColor: '#161b22',
          borderBottom: '1px solid #30363d',
          padding: '8px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-gold)' }}>
          <Shield size={14} />
          <strong>Local Workflow Simulator:</strong> Switch roles to test access control & user experience
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {(['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER'] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: selectedRole === r ? 'var(--accent-gold)' : '#21262d',
                color: selectedRole === r ? '#0d0f12' : '#c9d1d9',
                border: '1px solid #30363d',
              }}
            >
              {r === 'ADMIN' && '👑 Admin (Kamal)'}
              {r === 'STAFF' && '👷 Staff (Ronak)'}
              {r === 'CLIENT_LEADER' && '🤝 Client Leader (Rajesh)'}
              {r === 'CLIENT_VIEWER' && '👁️ Client Viewer (Pooja)'}
            </button>
          ))}
        </div>
      </div>

      <Shell
        user={currentUser}
        studioName="A&F Design"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      >
        {/* TAB 1: PROJECTS OVERVIEW DASHBOARD */}
        {activeTab === 'projects' && (
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <div style={{ marginBottom: '24px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700 }}>
                Active Studio Portfolios
              </span>
              <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Architectural Projects
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                Manage design workflows, category milestones, and client handoffs.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              {/* Project Card 1 */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--accent-emerald)',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                    >
                      ACTIVE
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      AF-VILLA
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Villa Horizon
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    4-BHK Luxury Bungalow • Client: Rajesh Mehta
                  </p>

                  {/* 16-Category Progress Meter */}
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Workflow Progress</span>
                      <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>56% (9/16 Folders)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '56%', height: '100%', backgroundColor: 'var(--accent-gold)', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('vault')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <span>Open Document Vault</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Project Card 2 */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '24px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        color: 'var(--accent-blue)',
                        borderRadius: '10px',
                        fontWeight: 600,
                      }}
                    >
                      CONCEPT PHASE
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      AF-SKYLN
                    </span>
                  </div>

                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Skyline Penthouse
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    Duplex Interior Renovation • Client: Anand Shah
                  </p>

                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Workflow Progress</span>
                      <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>25% (4/16 Folders)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '25%', height: '100%', backgroundColor: 'var(--accent-gold)', borderRadius: '4px' }} />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('vault')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  <span>Open Document Vault</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENT VAULT & 16 CATEGORIES */}
        {activeTab === 'vault' && (
          <DocumentExplorer
            projectCode="AF-VILLA"
            userRole={currentUser.role}
            clientName={currentUser.fullName}
            userEmail="rajesh@mehta-holdings.com"
          />
        )}

        {/* TAB 3: DESIGN VERIFICATION & APPROVALS (REVISION COUNTER) */}
        {activeTab === 'verification' && (
          <VerificationList
            userRole={currentUser.role}
            items={verifications}
            onApprove={handleApproveVerification}
            onRequestRevision={handleRequestRevision}
          />
        )}

        {/* TAB 4: CONSULTATION MEETINGS (3 FIXED SLOTS) */}
        {activeTab === 'meetings' && (
          <MeetingCalendar
            projectCode="AF-VILLA"
            bookedSlots={['12:00–13:30']}
            onBookSlot={(slot, agenda) => alert(`Meeting booked for ${slot}! Agenda: ${agenda}`)}
          />
        )}

        {/* TAB 5: ATTENDANCE & CLOCK-OUT HARD GATE */}
        {activeTab === 'attendance' && (
          <StaffAttendance
            isClockedIn={isClockedIn}
            pendingUpdates={pendingUpdates}
            onClockIn={(coords) => {
              setIsClockedIn(true);
              setPendingUpdates(['Slot +3h (12:00)']);
            }}
            onClockOut={() => {
              setIsClockedIn(false);
              alert('Successfully clocked out! Session closed.');
            }}
            onSubmitUpdate={(slot, notes) => {
              setPendingUpdates((prev) => prev.filter((s) => s !== slot));
              alert(`Daily work update submitted for ${slot}! Clock-Out gate unlocked.`);
            }}
          />
        )}

        {/* TAB 6: PAYMENTS LEDGER (STRICTLY HIDDEN FOR STAFF) */}
        {activeTab === 'payments' && (
          <PaymentLedger
            userRole={currentUser.role}
            showPricing={currentUser.showPricing ?? false}
            payments={payments}
            onSubmitDiscrepancy={handleDiscrepancySubmit}
          />
        )}

        {/* TAB 7: ENCRYPTED PROJECT CHAT */}
        {activeTab === 'chat' && (
          <ProjectChatRoom
            projectCode="AF-VILLA"
            userRole={currentUser.role}
            userName={currentUser.fullName}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
          />
        )}
      </Shell>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
