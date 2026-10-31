import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  BellRing,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  X,
  Trash2,
  Check,
  FolderKanban,
} from 'lucide-react';
import './mobile.css';

export interface ReminderItem {
  id: string;
  title: string;
  projectCode: string;
  projectName: string;
  dueDate: string;
  dueTime: string;
  priority: 'HIGH' | 'MEDIUM' | 'NORMAL';
  isCompleted: boolean;
  notes?: string;
}

export interface MobileRemindersViewProps {
  userRole: UserRole;
  onBack: () => void;
}

export const MobileRemindersView: React.FC<MobileRemindersViewProps> = ({ userRole, onBack }) => {
  const [reminders, setReminders] = useState<ReminderItem[]>([
    {
      id: 'rem-1',
      title: 'Review MEP Shaft Drawings for Villa Courtyard',
      projectCode: 'AF-VILLA',
      projectName: 'Courtyard Villa',
      dueDate: 'Today',
      dueTime: '02:30 PM',
      priority: 'HIGH',
      isCompleted: false,
      notes: 'Check clearance between HVAC ducts and primary structural beams in corridor B.',
    },
    {
      id: 'rem-2',
      title: 'Follow-up on Client Stone Selection Sample',
      projectCode: 'AF-INN',
      projectName: 'Artilla Inn',
      dueDate: 'Today',
      dueTime: '05:00 PM',
      priority: 'MEDIUM',
      isCompleted: false,
      notes: 'Sample travertine slabs dispatched from vendor.',
    },
    {
      id: 'rem-3',
      title: 'Structural Engineer Sign-off on Foundation Pours',
      projectCode: 'AF-CORP',
      projectName: 'Zenith Headquarters',
      dueDate: 'Tomorrow',
      dueTime: '11:00 AM',
      priority: 'HIGH',
      isCompleted: false,
      notes: 'Require official sealed certificate before casting begins.',
    },
    {
      id: 'rem-4',
      title: 'Submit Weekly Progress Billing to Client Finance',
      projectCode: 'AF-INN',
      projectName: 'Artilla Inn',
      dueDate: 'Tomorrow',
      dueTime: '04:00 PM',
      priority: 'NORMAL',
      isCompleted: true,
      notes: 'Invoice #PAY-1029-08 generated in payment ledger.',
    },
  ]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<ReminderItem | null>(null);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newProject, setNewProject] = useState('Courtyard Villa');
  const [newDate, setNewDate] = useState('Today');
  const [newTime, setNewTime] = useState('11:00 AM');
  const [newPriority, setNewPriority] = useState<'HIGH' | 'MEDIUM' | 'NORMAL'>('NORMAL');
  const [newNotes, setNewNotes] = useState('');

  const toggleComplete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !r.isCompleted } : r))
    );
  };

  const deleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    setSelectedReminder(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created: ReminderItem = {
      id: `rem-${Date.now()}`,
      title: newTitle,
      projectName: newProject,
      projectCode: 'AF-GEN',
      dueDate: newDate,
      dueTime: newTime,
      priority: newPriority,
      isCompleted: false,
      notes: newNotes,
    };

    setReminders([created, ...reminders]);
    setIsCreateModalOpen(false);
    setNewTitle('');
    setNewNotes('');
  };

  // Group by Today vs Tomorrow vs Later
  const todayReminders = reminders.filter((r) => r.dueDate === 'Today');
  const upcomingReminders = reminders.filter((r) => r.dueDate !== 'Today');

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header matching Figma 440:4427 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Reminders</h2>
        </div>
        <button
          className="figma-primary-btn-sm"
          onClick={() => setIsCreateModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} />
          <span>New</span>
        </button>
      </div>

      <div className="figma-subpage-body">
        {/* Today Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4A4A4C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Due Today ({todayReminders.length})
            </span>
            <span style={{ fontSize: '12px', color: '#BF935A', fontWeight: 600 }}>
              {todayReminders.filter((r) => r.isCompleted).length} Completed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {todayReminders.map((item) => (
              <div
                key={item.id}
                className={`figma-reminder-card ${item.isCompleted ? 'completed' : ''}`}
                onClick={() => setSelectedReminder(item)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <button
                    className={`figma-checkbox-circle ${item.isCompleted ? 'checked' : ''}`}
                    onClick={(e) => toggleComplete(item.id, e)}
                  >
                    {item.isCompleted && <Check size={14} color="#FFFFFF" />}
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span className="figma-reminder-project">{item.projectName}</span>
                      <span className={`figma-priority-badge ${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    </div>

                    <h4 className={`figma-reminder-title ${item.isCompleted ? 'strikethrough' : ''}`}>
                      {item.title}
                    </h4>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '12px', color: '#686869' }}>
                      <Clock size={13} />
                      <span>{item.dueTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Section */}
        {upcomingReminders.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#4A4A4C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upcoming ({upcomingReminders.length})
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingReminders.map((item) => (
                <div
                  key={item.id}
                  className={`figma-reminder-card ${item.isCompleted ? 'completed' : ''}`}
                  onClick={() => setSelectedReminder(item)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <button
                      className={`figma-checkbox-circle ${item.isCompleted ? 'checked' : ''}`}
                      onClick={(e) => toggleComplete(item.id, e)}
                    >
                      {item.isCompleted && <Check size={14} color="#FFFFFF" />}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span className="figma-reminder-project">{item.projectName}</span>
                        <span className={`figma-priority-badge ${item.priority.toLowerCase()}`}>
                          {item.priority}
                        </span>
                      </div>

                      <h4 className={`figma-reminder-title ${item.isCompleted ? 'strikethrough' : ''}`}>
                        {item.title}
                      </h4>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '12px', color: '#686869' }}>
                        <Calendar size={13} />
                        <span>{item.dueDate} at {item.dueTime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Reminder Detail Modal (Figma: 440:4855) */}
      {selectedReminder && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedReminder(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className={`figma-priority-badge ${selectedReminder.priority.toLowerCase()}`}>
                {selectedReminder.priority} Priority
              </span>
              <button onClick={() => setSelectedReminder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 10px 0', lineHeight: 1.3 }}>
              {selectedReminder.title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: '#686869' }}>
              <FolderKanban size={15} color="#BF935A" />
              <strong style={{ color: '#0C0C0D' }}>{selectedReminder.projectName}</strong>
              <span>• Due {selectedReminder.dueDate} at {selectedReminder.dueTime}</span>
            </div>

            <div className="figma-receipt-divider" />

            <div style={{ margin: '14px 0 24px 0' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#979798', textTransform: 'uppercase' }}>Notes & Instructions</span>
              <p style={{ fontSize: '14px', color: '#4A4A4C', lineHeight: 1.5, marginTop: '6px' }}>
                {selectedReminder.notes || 'No extra notes provided.'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="figma-btn-secondary-full"
                onClick={() => deleteReminder(selectedReminder.id)}
                style={{ color: '#D92D20', borderColor: '#FECDCA' }}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
              <button
                className="figma-btn-gold-full"
                onClick={(e) => {
                  toggleComplete(selectedReminder.id, e);
                  setSelectedReminder(null);
                }}
              >
                <Check size={16} />
                <span>{selectedReminder.isCompleted ? 'Mark Active' : 'Mark Completed'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Reminder Sheet (Figma: 440:4678) */}
      {isCreateModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Create Reminder</h3>
              <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Task / Reminder Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify plumbing shaft elevations"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Related Project</label>
                <select
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  className="figma-form-input"
                >
                  <option value="Courtyard Villa">Courtyard Villa</option>
                  <option value="Artilla Inn">Artilla Inn</option>
                  <option value="Zenith Headquarters">Zenith Headquarters</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="figma-form-label">Due Date</label>
                  <select
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="figma-form-input"
                  >
                    <option value="Today">Today</option>
                    <option value="Tomorrow">Tomorrow</option>
                    <option value="Next Week">Next Week</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="figma-form-label">Due Time</label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="figma-form-input"
                  />
                </div>
              </div>

              <div>
                <label className="figma-form-label">Priority</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['NORMAL', 'MEDIUM', 'HIGH'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`figma-choice-pill ${newPriority === p ? 'active' : ''}`}
                      onClick={() => setNewPriority(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="figma-form-label">Notes & Details</label>
                <textarea
                  rows={3}
                  placeholder="Add context or drawing references..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

