import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  Send,
  Paperclip,
  MessageSquare,
  ShieldX,
  Image as ImageIcon,
  X,
  Loader2,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { ProjectSummary } from '../../App';
import { ChatMessageItem } from '../../pages/Chat/ProjectChatRoom';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileChatViewProps {
  userRole: UserRole;
  userName?: string;
  projectCode: string;
  projectName?: string;
  availableProjects?: ProjectSummary[];
  messages?: ChatMessageItem[];
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onSelectProject?: (projectCode: string) => void;
  onSendMessage?: (text: string, attachmentUrl?: string, attachmentName?: string) => Promise<void> | void;
  onBack: () => void;
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10MB

export const MobileChatView: React.FC<MobileChatViewProps> = ({
  userRole,
  userName = '',
  projectCode,
  projectName,
  availableProjects = [],
  messages: propMessages,
  authHeaders,
  getAuthHeaders,
  onSelectProject,
  onSendMessage,
  onBack,
}) => {
  const [activeProjectCode, setActiveProjectCode] = useState(
    projectCode || availableProjects[0]?.projectCode || ''
  );
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ url: string; name: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectCode) {
      setActiveProjectCode(projectCode);
    } else if (!activeProjectCode && availableProjects[0]?.projectCode) {
      setActiveProjectCode(availableProjects[0].projectCode);
    }
  }, [projectCode, availableProjects, activeProjectCode]);

  const fetchMessages = useCallback(async () => {
    if (!activeProjectCode) return;
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      const res = await fetch(
        `/api/chat/projects/${encodeURIComponent(activeProjectCode)}/messages`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data.messages || [];
        setLocalMessages(
          rows.map((m: any) => ({
            id: m.id,
            senderName: m.senderName || m.sender?.fullName || 'Studio Member',
            senderRole: m.senderRole || m.sender?.role || 'ADMIN',
            text: m.text ?? m.messageText ?? '',
            attachmentUrl: m.attachmentUrl ?? m.attachmentKey ?? undefined,
            attachmentName: m.attachmentName ?? (m.attachmentKey ? 'Attachment' : undefined),
            createdAt: m.createdAt,
          }))
        );
      }
    } catch {
      // Handled gracefully
    } finally {
      setLoading(false);
    }
  }, [activeProjectCode, authHeaders, getAuthHeaders]);

  useEffect(() => {
    if (!propMessages) {
      fetchMessages();
    }
  }, [propMessages, fetchMessages]);

  const activeMessages = propMessages ?? localMessages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Strict RBAC: Only ADMIN and CLIENT_LEADER have access to Project Chat
  if (userRole === 'STAFF' || userRole === 'CLIENT_VIEWER') {
    return (
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Project Chat</h2>
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <ShieldX size={48} color="#D92D20" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Access Restricted
          </h3>
          <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
            Direct project communication is restricted to Studio Administrators and Client Leaders.
          </p>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setErrorMsg('Attachment size exceeds the 10MB studio limit.');
      e.target.value = '';
      return;
    }

    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedFile({
          url: reader.result,
          name: file.name,
        });
      }
    };
    reader.onerror = () => {
      setErrorMsg('Unable to read the selected image attachment.');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    setSending(true);
    setErrorMsg(null);
    const text = inputText.trim();
    const attUrl = attachedFile?.url;
    const attName = attachedFile?.name;

    try {
      if (onSendMessage) {
        await onSendMessage(text, attUrl, attName);
      } else if (activeProjectCode) {
        const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
        const res = await fetch(
          `/api/chat/projects/${encodeURIComponent(activeProjectCode)}/messages`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({
              messageText: text || attName || 'Attachment',
              attachmentKey: attUrl,
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setErrorMsg(err.error || 'Failed to dispatch message.');
          setSending(false);
          return;
        }
        await fetchMessages();
      }
      setInputText('');
      setAttachedFile(null);
    } catch {
      setErrorMsg('Network error sending message.');
    } finally {
      setSending(false);
    }
  };

  const activeProjectObj = availableProjects.find((p) => p.projectCode === activeProjectCode);
  const displayProjectTitle = activeProjectObj?.name || projectName || activeProjectCode || 'Channel';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Header */}
      <div className="figma-subpage-header" style={{ paddingBottom: '12px' }}>
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            Home
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Chat</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                margin: 0,
                color: '#0C0C0D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayProjectTitle}
            </h2>
            <div style={{ fontSize: '11px', color: '#686869' }}>
              {activeProjectCode || 'Studio'} Consultation Chat
            </div>
          </div>
        </div>

        {availableProjects.length > 0 && (
          <select
            value={activeProjectCode}
            onChange={(e) => {
              setActiveProjectCode(e.target.value);
              onSelectProject?.(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '9px 12px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
              fontWeight: 600,
              background: '#F9F9FB',
              color: '#0C0C0D',
            }}
          >
            {availableProjects.map((p) => (
              <option key={p.id} value={p.projectCode}>
                {p.projectCode} — {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {errorMsg && (
        <div
          style={{
            margin: '10px 16px 0 16px',
            padding: '8px 12px',
            borderRadius: '10px',
            background: '#FEF3F2',
            color: '#B42318',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 16px 150px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {loading && activeMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <Loader2 size={26} color="#352618" className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Loading channel messages...</div>
          </div>
        ) : activeMessages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#686869' }}>
            <MessageSquare size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#0C0C0D' }}>
              No messages yet
            </h4>
            <p style={{ margin: 0, fontSize: '12px' }}>
              Start the conversation for {displayProjectTitle}.
            </p>
          </div>
        ) : (
          activeMessages.map((msg) => {
            const isMine =
              (userName && msg.senderName === userName) || msg.senderRole === userRole;

            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMine ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  background: isMine ? '#352618' : '#FFFFFF',
                  color: isMine ? '#FFFFFF' : '#0C0C0D',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                  border: isMine ? 'none' : '1px solid rgba(0,0,0,0.05)',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isMine ? '#E5C396' : '#BF935A',
                    marginBottom: '4px',
                  }}
                >
                  {msg.senderName}
                </div>

                {msg.attachmentUrl && (
                  <div style={{ marginBottom: '6px' }}>
                    {msg.attachmentUrl.startsWith('data:image') ||
                    /\.(png|jpe?g|webp|gif)(\?|$)/i.test(msg.attachmentUrl) ? (
                      <img
                        src={msg.attachmentUrl}
                        alt={msg.attachmentName || 'Attachment'}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '180px',
                          borderRadius: '10px',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '12px', textDecoration: 'underline' }}>
                        {msg.attachmentName || 'Attachment'}
                      </div>
                    )}
                  </div>
                )}

                {msg.text && (
                  <div style={{ fontSize: '13px', lineHeight: 1.45, wordBreak: 'break-word' }}>
                    {msg.text}
                  </div>
                )}

                <div
                  style={{
                    fontSize: '10px',
                    marginTop: '4px',
                    textAlign: 'right',
                    opacity: 0.65,
                  }}
                >
                  {msg.createdAt}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Sticky Message Composer (above dock) */}
      <div
        style={{
          position: 'fixed',
          bottom: '74px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '420px',
          background: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          padding: '10px 14px',
          boxSizing: 'border-box',
          zIndex: 50,
        }}
      >
        {attachedFile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F4EFEA',
              padding: '6px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#352618',
              marginBottom: '8px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <ImageIcon size={13} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachedFile.name}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#352618' }}
            >
              <X size={13} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              background: '#F9F9FB',
              color: '#352618',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            placeholder="Write a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flex: 1,
              height: '38px',
              padding: '0 12px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />

          <button
            type="submit"
            disabled={sending || (!inputText.trim() && !attachedFile)}
            style={{
              width: '40px',
              height: '38px',
              borderRadius: '10px',
              border: 'none',
              background: '#352618',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              opacity: sending || (!inputText.trim() && !attachedFile) ? 0.55 : 1,
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
