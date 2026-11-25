import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageSquare,
  Mail,
  Send,
  Star,
  BookOpen,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export interface MobileHelpSupportViewProps {
  onBack: () => void;
}

const STUDIO_FAQS = [
  {
    q: 'How are the 16 architectural drawing folders structured?',
    a: 'Every A&F Design project includes 6 Concept folders, 9 Construction folders, and 03_OTHER for miscellaneous reference files. Progress percentages update based on populated standard folders.',
  },
  {
    q: 'Why can some users download drawings while others are View-Only?',
    a: 'Drawing downloads are controlled per project by the studio administrator. Projects set to View-Only restrict client downloads while keeping high-resolution sheets viewable.',
  },
  {
    q: 'How does staff attendance and daily update submission work?',
    a: 'Staff clock in using device GPS, submit project daily work updates during working hours, and clock out cleanly once mandatory daily updates are completed.',
  },
  {
    q: 'Who can schedule meetings or view project payments?',
    a: 'Admins manage all meetings and payments directly. Client Leaders can view payments (when enabled), request or reschedule meetings, and RSVP IN/OUT. Studio Staff do not have access to Payments or Meetings.',
  },
];

export const MobileHelpSupportView: React.FC<MobileHelpSupportViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'feedback'>('faq');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    const mailtoHref = `mailto:studio@afdesign.in?subject=${encodeURIComponent(
      `[A&F Design Support] ${subject.trim()}`
    )}&body=${encodeURIComponent(message.trim())}`;
    if (typeof window !== 'undefined') {
      window.location.href = mailtoHref;
    }
    setNotice('Opening your email client to send this inquiry to A&F Design Studio support.');
    setSubject('');
    setMessage('');
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackComment.trim()) return;
    const mailtoHref = `mailto:studio@afdesign.in?subject=${encodeURIComponent(
      `[A&F Design Feedback] Rating: ${rating}/5`
    )}&body=${encodeURIComponent(feedbackComment.trim())}`;
    if (typeof window !== 'undefined') {
      window.location.href = mailtoHref;
    }
    setNotice('Thank you! Opening email compose with your feedback.');
    setFeedbackComment('');
  };

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            More
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Support Desk</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Help &amp; Support
            </h2>
            <div style={{ fontSize: '12px', color: '#686869' }}>
              A&amp;F Design Documentation &amp; Studio Desk
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', background: '#F5F5F7', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'faq', label: 'Frequently Asked Questions', icon: BookOpen },
            { id: 'contact', label: 'Contact Support', icon: MessageSquare },
            { id: 'feedback', label: 'Send Feedback', icon: Star },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setNotice(null);
                }}
                style={{
                  flex: 1,
                  padding: '8px 6px',
                  borderRadius: '10px',
                  border: 'none',
                  background: active ? '#352618' : 'transparent',
                  color: active ? '#FFFFFF' : '#4A4A4C',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {notice && (
        <div
          style={{
            margin: '12px 20px 0 20px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#ECFDF3',
            color: '#027A48',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <CheckCircle2 size={15} />
          <span>{notice}</span>
        </div>
      )}

      <div style={{ padding: '16px 20px' }}>
        {activeTab === 'faq' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {STUDIO_FAQS.map((item, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedFaq(isOpen ? null : idx)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0C0C0D', lineHeight: 1.4 }}>
                      {item.q}
                    </span>
                    {isOpen ? (
                      <ChevronUp size={18} color="#979798" style={{ flexShrink: 0 }} />
                    ) : (
                      <ChevronDown size={18} color="#979798" style={{ flexShrink: 0 }} />
                    )}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '0 16px 16px 16px',
                        fontSize: '13px',
                        color: '#4A4A4C',
                        lineHeight: 1.5,
                        borderTop: '1px solid #F0F0F2',
                        paddingTop: '10px',
                      }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'contact' && (
          <form
            onSubmit={handleSubmitTicket}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0C0C0D' }}>
              <HelpCircle size={18} color="#352618" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Studio Admin Support</h3>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Subject / Project Reference
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Drawing access inquiry"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Message
              </label>
              <textarea
                rows={4}
                required
                placeholder="Describe your question or issue..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Mail size={16} /> Compose Support Email
            </button>
          </form>
        )}

        {activeTab === 'feedback' && (
          <form
            onSubmit={handleSubmitFeedback}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0C0C0D' }}>
              <ShieldCheck size={18} color="#352618" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Studio Portal Feedback</h3>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '10px 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <Star
                    size={28}
                    color={star <= rating ? '#BF935A' : '#E5E7EB'}
                    fill={star <= rating ? '#BF935A' : 'none'}
                  />
                </button>
              ))}
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Comments or Suggestions
              </label>
              <textarea
                rows={4}
                required
                placeholder="Share ideas or workflow improvements..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                background: '#352618',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Send size={16} /> Send Feedback
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
