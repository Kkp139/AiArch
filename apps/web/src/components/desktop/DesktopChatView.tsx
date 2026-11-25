import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Send,
  Paperclip,
  MessageSquare,
  Search,
  Lock,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';
import type { ChatMessageItem } from '../../pages/Chat/ProjectChatRoom';

export type { ChatMessageItem };

export interface ProjectThread {
  id?: string;
  projectCode: string;
  projectName?: string;
  clientName?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  updatedAt?: string;
}

export type ChatThreadItem = ProjectThread;

export interface DesktopChatViewProps {
  user: { fullName: string; role: UserRole };
  projects?: ProjectSummary[];
  threads?: ProjectThread[];
  activeProjectCode?: string;
  messages?: ChatMessageItem[];
  onSelectThread?: (projectCode: string) => void;
  onSendMessage?:
    | ((payload: {
        text: string;
        attachmentUrl?: string;
        attachmentName?: string;
      }) => Promise<void> | void)
    | ((text: string, attachmentUrl?: string) => Promise<void> | void);
  getAuthHeaders?: () => Record<string, string>;
}

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // 10 MB

export const DesktopChatView: React.FC<DesktopChatViewProps> = ({
  user,
  projects = [],
  threads,
  activeProjectCode,
  messages,
  onSelectThread,
  onSendMessage,
  getAuthHeaders,
}) => {
  const isRestricted = user.role === 'STAFF' || user.role === 'CLIENT_VIEWER';

  const derivedThreads = useMemo<ChatThreadItem[]>(() => {
    if (threads && threads.length > 0) return threads;
    return projects.map((p) => ({
      projectCode: p.projectCode,
      projectName: p.name,
    }));
  }, [threads, projects]);

  const [selectedCode, setSelectedCode] = useState<string>(
    activeProjectCode || derivedThreads[0]?.projectCode || '',
  );
  const [threadSearch, setThreadSearch] = useState<string>('');
  const [localMessages, setLocalMessages] = useState<ChatMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [draftText, setDraftText] = useState<string>('');
  const [pendingAttachment, setPendingAttachment] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [sending, setSending] = useState<boolean>(false);
  const [banner, setBanner] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endOfChatRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeProjectCode) {
      setSelectedCode(activeProjectCode);
    } else if (!selectedCode && derivedThreads.length > 0) {
      setSelectedCode(derivedThreads[0].projectCode);
    }
  }, [activeProjectCode, derivedThreads, selectedCode]);

  const authHeaders = useCallback(
    () => (getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' }),
    [getAuthHeaders],
  );

  const fetchThreadMessages = useCallback(
    async (code: string) => {
      if (isRestricted || !code) return;
      setLoadingMessages(true);
      try {
        const res = await fetch(`/api/chat/${encodeURIComponent(code)}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load messages');
        }
        const data = await res.json();
        const rows: any[] = Array.isArray(data) ? data : data.messages || [];
        setLocalMessages(
          rows.map((m) => ({
            id: String(m.id),
            senderName: m.senderName || m.sender?.fullName || 'Studio Member',
            senderRole: (m.senderRole || m.sender?.role || 'ADMIN') as UserRole,
            text: m.text || m.message || '',
            attachmentUrl: m.attachmentUrl,
            attachmentName: m.attachmentName,
            createdAt: m.createdAt || new Date().toISOString(),
          })),
        );
      } catch (err: any) {
        setBanner({ type: 'error', text: err?.message || 'Unable to fetch project messages.' });
      } finally {
        setLoadingMessages(false);
      }
    },
    [isRestricted, authHeaders],
  );

  useEffect(() => {
    if (!messages && selectedCode) {
      void fetchThreadMessages(selectedCode);
    }
  }, [messages, selectedCode, fetchThreadMessages]);

  const activeMessages = messages || localMessages;

  useEffect(() => {
    if (typeof endOfChatRef.current?.scrollIntoView === 'function') {
      endOfChatRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages.length, selectedCode]);

  const filteredThreads = useMemo(() => {
    const q = threadSearch.trim().toLowerCase();
    if (!q) return derivedThreads;
    return derivedThreads.filter(
      (t) =>
        t.projectCode.toLowerCase().includes(q) ||
        (t.projectName || '').toLowerCase().includes(q),
    );
  }, [derivedThreads, threadSearch]);

  if (isRestricted) {
    return (
      <div className="desk-restricted-card" data-testid="chat-restricted-card">
        <div className="desk-restricted-icon-box">
          <Lock size={28} />
        </div>
        <h2 className="desk-restricted-title">Access Restricted</h2>
        <p className="desk-restricted-desc">
          {user.role === 'STAFF'
            ? 'Direct project messaging is strictly scoped between Studio Admin and the Client Leader.'
            : 'Client Viewer accounts do not have permission to participate in Client Leader chat rooms.'}
        </p>
      </div>
    );
  }

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    onSelectThread?.(code);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setBanner({
        type: 'error',
        text: `Attachment "${file.name}" exceeds the 10 MB limit.`,
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingAttachment({ url: reader.result, name: file.name });
        setBanner(null);
      }
    };
    reader.onerror = () => {
      setBanner({ type: 'error', text: 'Unable to read attachment file.' });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSend = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    const cleanText = draftText.trim();
    if (!selectedCode) return;
    if (!cleanText && !pendingAttachment) return;

    setSending(true);
    setBanner(null);
    const payload = {
      text: cleanText || (pendingAttachment ? `Shared attachment: ${pendingAttachment.name}` : ''),
      attachmentUrl: pendingAttachment?.url,
      attachmentName: pendingAttachment?.name,
    };

    setDraftText('');
    setPendingAttachment(null);

    try {
      if (onSendMessage) {
        try {
          await (onSendMessage as any)(
            cleanText || (pendingAttachment ? `Shared attachment: ${pendingAttachment.name}` : ''),
            pendingAttachment?.url,
          );
        } catch {
          await (onSendMessage as any)(payload);
        }
      } else {
        const res = await fetch(`/api/chat/${encodeURIComponent(selectedCode)}`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to send message');
        }
        await fetchThreadMessages(selectedCode);
      }
    } catch (err: any) {
      setDraftText(cleanText);
      setBanner({ type: 'error', text: err?.message || 'Message failed to send.' });
    } finally {
      setSending(false);
    }
  };

  const activeThreadObj = derivedThreads.find((t) => t.projectCode === selectedCode);

  return (
    <div>
      <div className="desk-page-header" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="desk-page-title">Project Discussions</h1>
          <p className="desk-page-subtitle">
            Private project-scoped messaging between Studio Principal and Client Leader.
          </p>
        </div>
      </div>

      {banner && (
        <div className={`desk-banner ${banner.type}`}>
          <span>{banner.text}</span>
          <button type="button" className="desk-btn-close" onClick={() => setBanner(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {derivedThreads.length === 0 ? (
        <div className="desk-empty-card">
          <MessageSquare size={28} style={{ color: 'var(--brand-gold)', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            No active project threads yet
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
            Once a project is created and assigned, its dedicated chat room appears here.
          </p>
        </div>
      ) : (
        <div className="desktop-chat-container">
          {/* Threads Pane */}
          <div className="desktop-chat-threads-pane" data-testid="chat-threads-pane">
            <div className="desktop-chat-threads-header">
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                  }}
                />
                <input
                  type="text"
                  className="desk-form-input"
                  style={{ paddingLeft: 30, fontSize: 13 }}
                  placeholder="Search project threads..."
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="desktop-chat-threads-list">
              {filteredThreads.map((t) => {
                const isActive = t.projectCode === selectedCode;
                return (
                  <button
                    key={t.projectCode}
                    type="button"
                    data-testid={`chat-thread-${t.projectCode}`}
                    className={`desktop-chat-thread-card ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelect(t.projectCode)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                      }}
                    >
                      <span className="desk-pill gold">{t.projectCode}</span>
                      {t.unreadCount ? (
                        <span className="desktop-unread-badge">{t.unreadCount}</span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: 'var(--text-primary)',
                        marginTop: 6,
                        textAlign: 'left',
                      }}
                    >
                      {t.projectName || t.projectCode}
                    </div>
                    {t.lastMessage && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-muted)',
                          marginTop: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          width: '100%',
                          textAlign: 'left',
                        }}
                      >
                        {t.lastMessage}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation Pane */}
          <div className="desktop-chat-conversation-pane" data-testid="chat-conversation-pane">
            <div className="desktop-chat-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="desk-pill gold">{selectedCode}</span>
                  <strong>{activeThreadObj?.projectName ? `${activeThreadObj.projectName} (${selectedCode})` : selectedCode}</strong>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Signed in as {user.fullName}
                </div>
              </div>
            </div>

            <div className="desktop-chat-messages-container" data-testid="chat-messages-container">
              {loadingMessages && activeMessages.length === 0 ? (
                <div className="desk-empty-card" style={{ border: 'none' }}>
                  Loading conversation...
                </div>
              ) : activeMessages.length === 0 ? (
                <div className="desk-empty-card" style={{ border: 'none' }}>
                  <MessageSquare size={24} style={{ color: 'var(--brand-gold)', marginBottom: 6 }} />
                  <div style={{ fontWeight: 600 }}>No messages in {selectedCode} yet</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Start the discussion below or attach reference photos/drawings (up to 10 MB).
                  </div>
                </div>
              ) : (
                activeMessages.map((msg) => {
                  const isMine = msg.senderName === user.fullName && msg.senderRole === user.role;
                  return (
                    <div
                      key={msg.id}
                      className={`desktop-chat-message-row ${isMine ? 'mine' : 'theirs'}`}
                    >
                      <div className={`desktop-chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            opacity: 0.75,
                            marginBottom: 4,
                          }}
                        >
                          {msg.senderName} · {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {msg.text && <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>}
                        {msg.attachmentUrl && (
                          <div style={{ marginTop: 8 }}>
                            {msg.attachmentUrl.startsWith('data:image') ? (
                              <img
                                src={msg.attachmentUrl}
                                alt={msg.attachmentName || 'Attachment'}
                                style={{
                                  maxWidth: 260,
                                  maxHeight: 200,
                                  borderRadius: 10,
                                  display: 'block',
                                }}
                              />
                            ) : (
                              <a
                                href={msg.attachmentUrl}
                                download={msg.attachmentName || 'attachment'}
                                style={{ fontSize: 12, textDecoration: 'underline' }}
                              >
                                {msg.attachmentName || 'Download Attachment'}
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endOfChatRef} />
            </div>

            {pendingAttachment && (
              <div
                style={{
                  padding: '8px 16px',
                  borderTop: '1px solid var(--border-subtle)',
                  background: 'var(--bg-canvas)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ImageIcon size={14} />
                  Attached: <strong>{pendingAttachment.name}</strong>
                </span>
                <button
                  type="button"
                  className="desk-btn-close"
                  onClick={() => setPendingAttachment(null)}
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form className="desktop-chat-input-bar" onSubmit={handleSend}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="desk-btn desk-btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                title="Attach image or PDF (max 10 MB)"
              >
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                className="desk-form-input"
                data-testid="chat-input-textarea"
                style={{ flex: 1 }}
                placeholder={`Message ${selectedCode}...`}
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
              />
              <button
                type="submit"
                className="desk-btn desk-btn-primary"
                data-testid="chat-send-btn"
                onClick={handleSend}
                disabled={sending || (!draftText.trim() && !pendingAttachment)}
              >
                <Send size={15} />
                <span>{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
