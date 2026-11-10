import React, { useState, useRef, useEffect } from 'react';
import { UserRole } from '../../context/AuthContext';
import { ChatMessageItem } from '../../pages/Chat/ProjectChatRoom';
import {
  ChevronLeft,
  Send,
  Paperclip,
  Image,
  ShieldX,
  User,
  Clock,
  CheckCheck,
  Building,
  X,
} from 'lucide-react';
import './mobile.css';

export interface MobileChatViewProps {
  projectCode: string;
  userRole: UserRole;
  userName: string;
  messages: ChatMessageItem[];
  onBack: () => void;
  onSendMessage?: (text: string, attachment?: { name: string; size: number; url: string }) => void;
  availableProjects?: Array<{ projectCode: string; name: string }>;
  onSelectProject?: (projectCode: string) => void;
}

export const MobileChatView: React.FC<MobileChatViewProps> = ({
  projectCode,
  userRole,
  userName,
  messages,
  onBack,
  onSendMessage,
  availableProjects,
  onSelectProject,
}) => {
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: number; url: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ACCESS CONTROL: Admin and Client Leader
  const isAllowed = userRole === 'ADMIN' || userRole === 'CLIENT_LEADER';
  if (!isAllowed) {
    return (
      <div className="figma-mobile-subpage">
        <div className="figma-subpage-header">
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Project Chat</h2>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEE4E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldX size={28} color="#D92D20" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0C0C0D', marginBottom: '8px' }}>Access Restricted</h3>
          <p style={{ fontSize: '14px', color: '#686869', lineHeight: 1.5 }}>
            Real-time project chat is restricted to Studio Admins and Client Leaders.
          </p>
        </div>
      </div>
    );
  }

  const defaultMessages: ChatMessageItem[] = [
    {
      id: 'msg-1',
      senderName: 'Farhan Admani',
      senderRole: 'ADMIN',
      text: 'Good morning! The updated courtyard cantilever structural drawing package has been reviewed and stamped in the vault.',
      createdAt: '10:30 AM',
    },
    {
      id: 'msg-2',
      senderName: 'Dr. Sameer Mehta',
      senderRole: 'CLIENT_LEADER',
      text: 'Thank you Farhan. Can we review the Italian marble selection options during our scheduled call today?',
      createdAt: '10:45 AM',
    },
    {
      id: 'msg-3',
      senderName: 'Farhan Admani',
      senderRole: 'ADMIN',
      text: 'Yes absolutely. Rajesh has uploaded the high-res slab photographs to the concept folder for direct reference.',
      createdAt: '11:02 AM',
    },
  ];

  const activeMessages = messages !== undefined ? messages : defaultMessages;

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed && !attachment) return;

    if (onSendMessage) {
      onSendMessage(trimmed, attachment || undefined);
    }
    setInputText('');
    setAttachment(null);
  };

  return (
    <div className="figma-mobile-subpage" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header matching Figma 419:5944 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            {availableProjects && availableProjects.length > 1 && onSelectProject ? (
              <select
                value={projectCode}
                onChange={(e) => onSelectProject(e.target.value)}
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  color: '#0C0C0D',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  maxWidth: '100%',
                }}
              >
                {availableProjects.map((p) => (
                  <option key={p.projectCode} value={p.projectCode}>
                    {p.projectCode} - {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <h2 className="figma-subpage-title" style={{ fontSize: '16px', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {projectCode} Consultation Chat
              </h2>
            )}
            <span style={{ fontSize: '11px', color: '#087A48', fontWeight: 600, display: 'block' }}>● Active Studio Channel</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {activeMessages.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#686869' }}>
            <Building size={32} color="#BF935A" style={{ opacity: 0.6, marginBottom: '8px' }} />
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No messages yet in {projectCode}</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px' }}>Start the project conversation below.</p>
          </div>
        )}

        {activeMessages.map((msg) => {
          const isMe =
            msg.senderName === userName ||
            (userRole === 'ADMIN' && msg.senderRole === 'ADMIN') ||
            (userRole === 'CLIENT_LEADER' && msg.senderRole === 'CLIENT_LEADER');
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
              }}
            >
              {!isMe && (
                <span style={{ fontSize: '11px', color: '#686869', marginBottom: '3px', marginLeft: '6px' }}>
                  {msg.senderName} ({msg.senderRole.replace('_', ' ')})
                </span>
              )}
              <div
                className={`figma-chat-bubble ${isMe ? 'outgoing' : 'incoming'}`}
              >
                <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.45 }}>{msg.text}</p>
                {msg.attachmentUrl && (
                  <div style={{ marginTop: '6px' }}>
                    <img
                      src={msg.attachmentUrl}
                      alt="attachment"
                      style={{ maxWidth: '100%', maxHeight: '180px', borderRadius: '6px', objectFit: 'contain' }}
                    />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '10px', opacity: 0.75 }}>
                    {msg.createdAt.includes('T') ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.createdAt}
                  </span>
                  {isMe && <CheckCheck size={12} color="#FFFFFF" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bottom Bar */}
      <div className="figma-chat-input-bar">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          className="figma-chat-attach-btn"
          title="Add Attachment (Max 10MB)"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={18} color="#686869" />
        </button>
        <form onSubmit={handleSend} style={{ display: 'flex', flex: 1, gap: '8px', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {attachment && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F4F5F6', padding: '2px 8px', borderRadius: '4px', marginBottom: '4px', fontSize: '11px', color: '#0C0C0D' }}>
                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                  <X size={12} />
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder="Type a message to project channel..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="figma-chat-input"
            />
          </div>
          <button type="submit" className="figma-chat-send-btn" disabled={!inputText.trim() && !attachment}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
