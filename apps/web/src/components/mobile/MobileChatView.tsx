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
} from 'lucide-react';
import './mobile.css';

export interface MobileChatViewProps {
  projectCode: string;
  userRole: UserRole;
  userName: string;
  messages: ChatMessageItem[];
  onBack: () => void;
  onSendMessage?: (text: string, attachment?: { name: string; size: number; url: string }) => void;
}

export const MobileChatView: React.FC<MobileChatViewProps> = ({
  projectCode,
  userRole,
  userName,
  messages,
  onBack,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const activeMessages = messages && messages.length > 0 ? messages : defaultMessages;

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (onSendMessage) {
      onSendMessage(inputText);
    }
    setInputText('');
  };

  return (
    <div className="figma-mobile-subpage" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header matching Figma 419:5944 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <div>
            <h2 className="figma-subpage-title" style={{ fontSize: '16px', margin: 0 }}>
              {projectCode} Consultation Chat
            </h2>
            <span style={{ fontSize: '11px', color: '#087A48', fontWeight: 600 }}>● Active Studio Channel</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {activeMessages.map((msg) => {
          const isMe = msg.senderName === userName || (userRole === 'ADMIN' && msg.senderRole === 'ADMIN');
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
        <button type="button" className="figma-chat-attach-btn" title="Add Attachment">
          <Paperclip size={18} color="#686869" />
        </button>
        <form onSubmit={handleSend} style={{ display: 'flex', flex: 1, gap: '8px' }}>
          <input
            type="text"
            placeholder="Type a message to project channel..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="figma-chat-input"
          />
          <button type="submit" className="figma-chat-send-btn" disabled={!inputText.trim()}>
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
