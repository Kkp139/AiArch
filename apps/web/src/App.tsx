import React, { useState } from 'react';
import { AuthProvider, useAuth, UserProfile, UserRole } from './context/AuthContext';
import { LoginPage } from './pages/Auth/LoginPage';
import { Shell } from './components/layout/Shell';
import { DocumentExplorer } from './pages/Vault/DocumentExplorer';
import { VerificationList, VerificationItem } from './pages/Verification/VerificationList';
import { MeetingCalendar } from './pages/Meetings/MeetingCalendar';
import { StaffAttendance } from './pages/Attendance/StaffAttendance';
import { PaymentLedger, PaymentRecord } from './pages/Payments/PaymentLedger';
import { ProjectChatRoom, ChatMessageItem } from './pages/Chat/ProjectChatRoom';
import { FolderKanban, ArrowRight, Shield, UserCheck, Eye, HardHat, RotateCcw, UserPlus } from 'lucide-react';
import { AdminUserManagementModal } from './components/AdminUserManagementModal';

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
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('projects');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  // Interactive Persistent State (Saves to localStorage so CRUD persists across refreshes)
  const [isClockedIn, setIsClockedIn] = useState<boolean>(() => {
    const saved = localStorage.getItem('af_is_clocked_in');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [pendingUpdates, setPendingUpdates] = useState<string[]>(() => {
    const saved = localStorage.getItem('af_pending_updates');
    return saved ? JSON.parse(saved) : ['Slot +3h (12:00)'];
  });

  const [verifications, setVerifications] = useState<VerificationItem[]>(() => {
    const saved = localStorage.getItem('af_verifications');
    return saved ? JSON.parse(saved) : INITIAL_VERIFICATIONS;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('af_payments');
    return saved ? JSON.parse(saved) : INITIAL_PAYMENTS;
  });

  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>(() => {
    const saved = localStorage.getItem('af_chat_messages');
    return saved ? JSON.parse(saved) : INITIAL_CHAT_MESSAGES;
  });

  // Sync to localStorage whenever state updates
  React.useEffect(() => {
    localStorage.setItem('af_is_clocked_in', JSON.stringify(isClockedIn));
  }, [isClockedIn]);

  React.useEffect(() => {
    localStorage.setItem('af_pending_updates', JSON.stringify(pendingUpdates));
  }, [pendingUpdates]);

  React.useEffect(() => {
    localStorage.setItem('af_verifications', JSON.stringify(verifications));
  }, [verifications]);

  React.useEffect(() => {
    localStorage.setItem('af_payments', JSON.stringify(payments));
  }, [payments]);

  React.useEffect(() => {
    localStorage.setItem('af_chat_messages', JSON.stringify(chatMessages));
  }, [chatMessages]);

  const handleResetDemoData = () => {
    localStorage.removeItem('af_is_clocked_in');
    localStorage.removeItem('af_pending_updates');
    localStorage.removeItem('af_verifications');
    localStorage.removeItem('af_payments');
    localStorage.removeItem('af_chat_messages');
    localStorage.removeItem('af_vault_files');
    setIsClockedIn(true);
    setPendingUpdates(['Slot +3h (12:00)']);
    setVerifications(INITIAL_VERIFICATIONS);
    setPayments(INITIAL_PAYMENTS);
    setChatMessages(INITIAL_CHAT_MESSAGES);
    window.location.reload();
  };

  // If user is not authenticated, render Figma High-Fidelity Login Page
  if (!user) {
    return <LoginPage />;
  }

  const currentUser = user;

  const handleRoleSwitch = (role: UserRole) => {
    const mock = MOCK_USERS[role];
    if (mock) {
      localStorage.setItem('pronex_auth_user', JSON.stringify(mock));
      window.location.reload();
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
      {/* Studio Header Action Bar */}
      <div
        style={{
          backgroundColor: '#161b22',
          borderBottom: '1px solid #30363d',
          padding: '10px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#c9d1d9' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent-gold)', fontWeight: 700 }}>
            {currentUser.role}
          </span>
          <span style={{ color: '#8b949e' }}>•</span>
          <strong style={{ color: '#f0f6fc' }}>{currentUser.fullName}</strong>
          <span style={{ color: '#8b949e', fontSize: '12px' }}>({currentUser.username || 'admin'})</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setIsOnboardingOpen(true)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#BF935A',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s',
              }}
            >
              <UserPlus size={14} />
              <span>+ Onboard Team & Clients</span>
            </button>
          )}

          <button
            onClick={logout}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#21262d',
              color: '#f87171',
              border: '1px solid #4b1a1a',
              cursor: 'pointer',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <AdminUserManagementModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      <Shell
        user={currentUser}
        studioName="A&F Design"
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        onLogout={logout}
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
