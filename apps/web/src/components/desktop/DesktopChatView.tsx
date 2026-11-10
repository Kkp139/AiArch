import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../../context/AuthContext';
import { ChatMessageItem } from '../../pages/Chat/ProjectChatRoom';
import {
  Search,
  Send,
  Paperclip,
  FileText,
  Image as ImageIcon,
  ShieldX,
  CheckCheck,
  Building,
  User,
  Clock,
  Download,
  X,
} from 'lucide-react';
import './desktop.css';

export interface ProjectThread {
  id: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount?: number;
}

export interface DesktopChatViewProps {
  user: {
    fullName: string;
    role: UserRole;
    email?: string;
  };
  threads?: ProjectThread[];
  activeProjectCode?: string;
  messages?: ChatMessageItem[];
  onSelectThread?: (projectCode: string) => void;
  onSendMessage?: (text: string, attachment?: { name: string; size: number; url: string }) => void;
}

const DEFAULT_THREADS: ProjectThread[] = [
  {
    id: 'th-1',
    projectCode: 'AF-VILLA',
    projectName: 'Courtyard Villa',
    clientName: 'Dr. Sameer Mehta',
    lastMessage: 'The cantilever structural drawing package has been reviewed and stamped.',
    lastMessageTime: '10:30 AM',
    unreadCount: 2,
  },
  {
    id: 'th-2',
    projectCode: 'AF-INN',
    projectName: 'Artilla Inn',
    clientName: 'Vikram Singhania',
    lastMessage: 'Facade lighting samples delivered to site.',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
  },
  {
    id: 'th-3',
    projectCode: 'AF-CORP',
    projectName: 'Zenith HQ',
    clientName: 'Priya Sharma',
    lastMessage: 'Auditorium acoustics and ceiling elevation review scheduled.',
    lastMessageTime: '03 Nov',
    unreadCount: 0,
  },
];

const DEFAULT_MESSAGES: Record<string, ChatMessageItem[]> = {
  'AF-VILLA': [
    {
      id: 'm-1',
      senderName: 'Farhaz Patel',
      senderRole: 'ADMIN',
      text: 'Good morning Dr. Mehta! The revised courtyard cantilever structural drawing package has been reviewed, certified, and stamped in the document vault.',
      createdAt: '10:15 AM',
    },
    {
      id: 'm-2',
      senderName: 'Dr. Sameer Mehta',
      senderRole: 'CLIENT_LEADER',
      text: 'Thank you Farhaz. Can we also inspect the Italian travertine stone options for the double-height foyer wall?',
      createdAt: '10:24 AM',
    },
    {
      id: 'm-3',
      senderName: 'Farhaz Patel',
      senderRole: 'ADMIN',
      text: 'Yes certainly. Rajesh has uploaded 4 high-resolution slab photographs to Folder 05 (Material Selection) for your direct reference.',
      createdAt: '10:30 AM',
    },
  ],
  'AF-INN': [
    {
      id: 'm-4',
      senderName: 'Vikram Singhania',
      senderRole: 'CLIENT_LEADER',
      text: 'Facade lighting samples delivered to site today for trial illumination.',
      createdAt: 'Yesterday',
    },
  ],
  'AF-CORP': [
    {
      id: 'm-5',
      senderName: 'Priya Sharma',
      senderRole: 'CLIENT_LEADER',
      text: 'Auditorium acoustics and ceiling elevation review scheduled for tomorrow.',
      createdAt: '03 Nov',
    },
  ],
};

export const DesktopChatView: React.FC<DesktopChatViewProps> = ({
  user,
  threads = DEFAULT_THREADS,
  activeProjectCode: controlledProjectCode,
  messages: propMessages,
  onSelectThread,
  onSendMessage,
}) => {
  // Strict RBAC: Staff and Client Viewer are blocked from chat
  if (user.role === 'STAFF' || user.role === 'CLIENT_VIEWER') {
    return (
      <div className="desktop-access-restricted" data-testid="chat-restricted-card">
        <div className="desktop-access-restricted-icon">
          <ShieldX size={36} color="#D92D20" />
        </div>
        <h2 className="desktop-access-restricted-title">Access Restricted</h2>
        <p className="desktop-access-restricted-desc">
          Real-time architectural project chat is restricted to Studio Administrators and Client Leaders per Master Specification Chapter 14.
        </p>
      </div>
    );
  }

  const [selectedCode, setSelectedCode] = useState<string>(
    controlledProjectCode || (threads.length > 0 ? threads[0].projectCode : 'AF-VILLA')
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>(
    propMessages || DEFAULT_MESSAGES[selectedCode] || []
  );
  const [attachment, setAttachment] = useState<{ name: string; size: number; url: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlledProjectCode) {
      setSelectedCode(controlledProjectCode);
    } else if (threads.length > 0 && !threads.some((t) => t.projectCode === selectedCode)) {
      setSelectedCode(threads[0].projectCode);
    }
  }, [controlledProjectCode, threads, selectedCode]);

  useEffect(() => {
    if (propMessages) {
      setLocalMessages(propMessages);
    } else {
      setLocalMessages(DEFAULT_MESSAGES[selectedCode] || []);
    }
  }, [selectedCode, propMessages]);

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  const filteredThreads = threads.filter(
    (t) =>
      t.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.projectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeThread = threads.find((t) => t.projectCode === selectedCode) || threads[0];

  const handleSelectThread = (code: string) => {
    setSelectedCode(code);
    if (onSelectThread) {
      onSelectThread(code);
    }
  };

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed && !attachment) return;

    const newMsg: ChatMessageItem = {
      id: `msg-${Date.now()}`,
      senderName: user.fullName,
      senderRole: user.role,
      text: trimmed,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setLocalMessages((prev) => [...prev, newMsg]);
    if (onSendMessage) {
      onSendMessage(trimmed, attachment || undefined);
    }

    setInputText('');
    setAttachment(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File size exceeds 10MB limit.');
        return;
      }
      setAttachment({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }
  };

  return (
    <div className="desktop-chat-container" data-testid="desktop-chat-container">
      {/* 1. Left 320px Pane: Project Threads */}
      <div className="desktop-chat-threads-pane" data-testid="chat-threads-pane">
        <div className="desktop-chat-threads-header">
          <div className="desktop-chat-threads-title-row">
            <h2 className="desktop-chat-threads-title">Conversations</h2>
            <span className="desktop-badge-gold">{threads.length} Projects</span>
          </div>
          <div className="desktop-chat-search-wrap">
            <Search size={16} className="desktop-chat-search-icon" />
            <input
              type="text"
              placeholder="Search project threads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="desktop-chat-search-input"
            />
          </div>
        </div>

        <div className="desktop-chat-threads-list">
          {filteredThreads.map((thread) => {
            const isActive = thread.projectCode === selectedCode;
            return (
              <div
                key={thread.id}
                data-testid={`chat-thread-${thread.projectCode}`}
                onClick={() => handleSelectThread(thread.projectCode)}
                className={`desktop-chat-thread-card ${isActive ? 'active' : ''}`}
              >
                <div className="desktop-chat-thread-avatar">
                  <Building size={18} color={isActive ? '#0C0C0D' : '#BF935A'} />
                </div>
                <div className="desktop-chat-thread-info">
                  <div className="desktop-chat-thread-row">
                    <span className="desktop-chat-thread-name">{thread.projectName}</span>
                    <span className="desktop-chat-thread-time">{thread.lastMessageTime}</span>
                  </div>
                  <div className="desktop-chat-thread-row">
                    <span className="desktop-chat-thread-client">{thread.clientName}</span>
                    {thread.unreadCount && thread.unreadCount > 0 ? (
                      <span className="desktop-chat-unread-badge">{thread.unreadCount}</span>
                    ) : null}
                  </div>
                  <p className="desktop-chat-thread-snippet">{thread.lastMessage}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Right Pane: Active Conversation */}
      <div className="desktop-chat-conversation-pane" data-testid="chat-conversation-pane">
        {/* Header */}
        <div className="desktop-chat-header">
          <div className="desktop-chat-header-info">
            <h2 className="desktop-chat-header-title">
              {activeThread ? `${activeThread.projectName} (${activeThread.projectCode})` : 'Project Chat'}
            </h2>
            <div className="desktop-chat-header-meta">
              <span className="desktop-chat-status-dot" />
              <span className="desktop-chat-header-sub">
                Client: {activeThread ? activeThread.clientName : 'Client Representative'} • Active Real-Time Channel
              </span>
            </div>
          </div>
          <div className="desktop-chat-header-actions">
            <span className="desktop-tag-pill">256-Bit Encrypted</span>
          </div>
        </div>

        {/* Message History */}
        <div className="desktop-chat-messages-container" data-testid="chat-messages-container">
          <div className="desktop-chat-watermark">
            <span className="desktop-chat-watermark-text">A&F DESIGN STUDIO CONSULTATION CHANNEL</span>
          </div>

          {localMessages.length === 0 && (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#889096' }}>
              <Building size={36} color="#BF935A" style={{ opacity: 0.6, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>
                No messages yet in this project channel.
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#686869' }}>
                Studio Admin and Client Leader can communicate securely here.
              </p>
            </div>
          )}

          {localMessages.map((msg) => {
            const isMine =
              msg.senderName === user.fullName ||
              (user.role === 'ADMIN' && msg.senderRole === 'ADMIN') ||
              (user.role === 'CLIENT_LEADER' && msg.senderRole === 'CLIENT_LEADER');

            const formattedTime = msg.createdAt?.includes('T')
              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : msg.createdAt;

            return (
              <div
                key={msg.id}
                className={`desktop-chat-message-row ${isMine ? 'mine' : 'theirs'}`}
              >
                <div className="desktop-chat-bubble">
                  <div className="desktop-chat-bubble-header">
                    <span className="desktop-chat-sender-name">{msg.senderName}</span>
                    <span className="desktop-chat-sender-role">
                      {msg.senderRole === 'ADMIN' ? 'Studio Architect' : 'Client Leader'}
                    </span>
                  </div>
                  <p className="desktop-chat-bubble-text">{msg.text}</p>
                  {msg.attachmentUrl && (
                    <div style={{ marginTop: '8px', marginBottom: '4px' }}>
                      <img
                        src={msg.attachmentUrl}
                        alt="attachment"
                        style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '6px', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                  <div className="desktop-chat-bubble-footer">
                    <span className="desktop-chat-timestamp">
                      <Clock size={11} style={{ marginRight: '4px' }} />
                      {formattedTime}
                    </span>
                    {isMine && <CheckCheck size={14} color="#BF935A" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="desktop-chat-input-bar">
          {attachment && (
            <div className="desktop-chat-attachment-preview">
              <FileText size={16} color="#BF935A" />
              <span className="desktop-chat-attachment-name">{attachment.name}</span>
              <button
                type="button"
                className="desktop-chat-attachment-remove"
                onClick={() => setAttachment(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="desktop-chat-input-row">
            <button
              type="button"
              className="desktop-chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach File (Max 10MB)"
            >
              <Paperclip size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.dwg,.png,.jpg,.jpeg,.webp"
            />

            <input
              type="text"
              data-testid="chat-input-textarea"
              placeholder={`Type an architectural update for ${activeThread ? activeThread.projectName : 'project'}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="desktop-chat-text-input"
            />

            <button
              type="button"
              data-testid="chat-send-btn"
              onClick={handleSend}
              disabled={!inputText.trim() && !attachment}
              className="desktop-chat-send-btn"
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
