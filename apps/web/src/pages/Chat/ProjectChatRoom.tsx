import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { ShieldX, Send, Image, AlertCircle, Paperclip } from 'lucide-react';

export interface ChatMessageItem {
  id: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachmentUrl?: string;
  attachmentName?: string;
  createdAt: string;
}

export interface ProjectChatRoomProps {
  projectCode: string;
  userRole: UserRole;
  userName: string;
  messages: ChatMessageItem[];
  onSendMessage?: (text: string, attachment?: { name: string; size: number; url: string }) => void;
}

export function ProjectChatRoom({
  projectCode,
  userRole,
  userName,
  messages,
  onSendMessage,
}: ProjectChatRoomProps) {
  const [inputText, setInputText] = useState('');
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<{ name: string; size: number; url: string } | null>(null);

  // ACCESS CONTROL: Strictly Admin and Client Leader only
  const isAllowed = userRole === 'ADMIN' || userRole === 'CLIENT_LEADER';
  if (!isAllowed) {
    return (
      <div
        style={{
          padding: '48px 24px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <ShieldX size={44} color="var(--accent-rose)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Access Denied
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Real-time project chat is restricted to Studio Admins and Client Leaders.
        </p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Attachment validation: <= 10MB limit and must be an image
      if (file.size > 10 * 1024 * 1024) {
        setAttachmentError('Attachment exceeds 10MB limit.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setAttachmentError('Only image attachments are permitted in project chat.');
        return;
      }
      setSelectedAttachment({
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && !selectedAttachment) return;
    if (onSendMessage) {
      onSendMessage(inputText, selectedAttachment || undefined);
    }
    setInputText('');
    setSelectedAttachment(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 128px)',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* Chat Room Header */}
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-gold)', fontWeight: 700 }}>
            Encrypted Project Room
          </span>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Project {projectCode} Consultation Chat
          </h3>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Direct Channel: Studio Admin & Client Leaders
        </span>
      </div>

      {/* Messages Feed */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => {
          const isOwn = msg.senderName === userName;
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isOwn ? 'flex-end' : 'flex-start',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {msg.senderName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isOwn ? 'var(--accent-gold)' : 'var(--bg-tertiary)',
                  color: isOwn ? '#0d0f12' : 'var(--text-primary)',
                  border: isOwn ? 'none' : '1px solid var(--border-subtle)',
                  fontSize: '13px',
                  lineHeight: 1.4,
                }}
              >
                {msg.text && <p>{msg.text}</p>}
                {msg.attachmentUrl && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={msg.attachmentUrl}
                      alt={msg.attachmentName || 'Attachment'}
                      style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: 'var(--radius-sm)' }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Attachment Error Banner */}
      {attachmentError && (
        <div style={{ padding: '8px 24px', backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', fontSize: '12px' }}>
          {attachmentError}
        </div>
      )}

      {/* Input Composer */}
      <div
        style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-tertiary)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}
      >
        <label
          htmlFor="chat-file-upload"
          style={{
            cursor: 'pointer',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image size={18} />
          <input
            id="chat-file-upload"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>

        {selectedAttachment && (
          <span style={{ fontSize: '12px', color: 'var(--accent-gold)' }}>
            {selectedAttachment.name} ({(selectedAttachment.size / 1024).toFixed(0)} KB)
          </span>
        )}

        <input
          type="text"
          placeholder="Type an architectural update or client query..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        />

        <button
          onClick={handleSend}
          style={{
            padding: '10px 20px',
            backgroundColor: 'var(--accent-gold)',
            color: '#0d0f12',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Send size={15} />
          <span>Send</span>
        </button>
      </div>
    </div>
  );
}
