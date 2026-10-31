import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  HelpCircle,
  Search,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FolderKanban,
  Users,
  Calendar,
  CheckCircle2,
  X,
  FileQuestion,
  Sparkles,
} from 'lucide-react';
import './mobile.css';

export interface GuideArticle {
  id: string;
  category: string;
  title: string;
  excerpt: string;
  steps: string[];
}

export interface MobileHelpSupportViewProps {
  onBack: () => void;
}

export const MobileHelpSupportView: React.FC<MobileHelpSupportViewProps> = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<GuideArticle | null>(null);

  // Form states
  const [contactSubject, setContactSubject] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState('Feature Suggestion');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const faqs = [
    {
      q: 'How do I download high-resolution stamped drawings?',
      a: 'Navigate to the Projects tab, select your project, tap into the Drawing Folder (e.g. Site Drawing), and tap on any approved drawing sheet. Click "Download Official PDF" to save the high-res stamped blueprint.',
    },
    {
      q: 'Why are project financials or pricing hidden for my account?',
      a: 'Pricing visibility is configured per project in accordance with studio security policies. If you require financial access, the Studio Administrator can enable the "Show Pricing" permission for your profile.',
    },
    {
      q: 'How do I reschedule a consultation meeting?',
      a: 'Go to the Meetings tab from the bottom dock, tap on your scheduled meeting card, and choose "Reschedule Meeting". You can select from available open studio slots.',
    },
    {
      q: 'What should I do if my site geofence clock-in fails?',
      a: 'Ensure Location Services are enabled on your mobile device. If your site coordinates are just outside the boundary, punch your shift and submit a "Regularization Request" under Attendance for Admin approval.',
    },
  ];

  const guides: GuideArticle[] = [
    // 1. Get Started Flow (Figma: 353:17889)
    {
      id: 'g-1',
      category: 'Get Started',
      title: 'Find your way around the studio portal',
      excerpt: 'Learn about the 4 core navigation dock tabs and quick action cards.',
      steps: [
        'Home: Access quick stat chips, daily actions grid, and top bar notifications.',
        'Projects: Browse active architectural sites, phases, and drawing folder structures.',
        'Meetings: View your consultation calendar and open video conference links.',
        'More: Manage user permissions, activity logs, device security, and app preferences.',
      ],
    },
    {
      id: 'g-2',
      category: 'Get Started',
      title: 'Set up your studio profile & WhatsApp sync',
      excerpt: 'Configure your profile details and enable real-time messaging alerts.',
      steps: [
        'Open the More tab and tap on "Profile".',
        'Verify your mobile phone number for WhatsApp OTP and emergency site notifications.',
        'Select "Change Password" to set a strong custom password.',
      ],
    },
    // 2. Project Management Flow (Figma: 353:18736)
    {
      id: 'g-3',
      category: 'Project Management',
      title: 'Create and configure a new architectural project',
      excerpt: 'Step-by-step setup for project code, category, and client permissions.',
      steps: [
        'From the Projects tab, tap "+ Create Project" (Admin role required).',
        'Enter project name (e.g. Courtyard Villa), code (AF-VILLA), and site location.',
        'Configure client permissions: Toggle drawing downloads, pricing visibility, and meetings.',
        'Submit to generate automatic folder vault structure (Concept & Construction).',
      ],
    },
    {
      id: 'g-4',
      category: 'Project Management',
      title: 'Upload and revise drawing sheets in the vault',
      excerpt: 'Guidelines for submitting revisions with official studio seal stamping.',
      steps: [
        'Open the project detail view and select either Concept Design or Construction.',
        'Tap the appropriate drawing folder (e.g. Working Drawings or MEP Layouts).',
        'Tap "+ Upload Drawing Sheet" to select a PDF or CAD rendering.',
        'The sheet enters the Verification queue for Admin review and official seal stamping.',
      ],
    },
    // 3. Team Collaboration Flow (Figma: 353:18556)
    {
      id: 'g-5',
      category: 'Team Collaboration',
      title: 'Invite a teammate with a single-use secure link',
      excerpt: 'Safely onboard staff architects and client leaders without shared passwords.',
      steps: [
        'Navigate to More > User Management and tap "+ Add User".',
        'Enter full name, mobile number, and assign role (Staff or Client Leader).',
        'A single-use registration link is generated with 24-hour expiration.',
        'Share the link directly via WhatsApp or Email for self-onboarding.',
      ],
    },
    // 4. Meetings Flow (Figma: 353:18376)
    {
      id: 'g-6',
      category: 'Meetings',
      title: 'Schedule a consultation meeting with video conference',
      excerpt: 'Book verified 90-minute slots directly linked to project channels.',
      steps: [
        'Open Meetings tab and tap "+ Schedule".',
        'Select the related project and client participant.',
        'Choose an available fixed slot (12:00-13:30, 16:00-17:30, 18:00-19:30).',
        'Choose Google Meet or Studio In-Person and submit to notify attendees.',
      ],
    },
  ];

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsContactModalOpen(false);
    setContactSubject('');
    setContactMsg('');
    alert('Your support request has been dispatched to the studio administration team. Ticket #SUP-8921 opened.');
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsFeedbackModalOpen(false);
    setFeedbackMsg('');
    alert('Thank you! Your feedback has been submitted to A&F Design product engineering.');
  };

  const filteredGuides = guides.filter(
    (g) =>
      g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <div>
            <h2 className="figma-subpage-title">Help & Support</h2>
            <span style={{ fontSize: '11px', color: '#686869' }}>
              Guides, FAQs & Direct Studio Support
            </span>
          </div>
        </div>
      </div>

      <div className="figma-subpage-body">
        {/* Search */}
        <div className="figma-mobile-search-pill" style={{ marginBottom: '16px' }}>
          <Search size={18} color="#979798" />
          <input
            type="text"
            placeholder="Search guides, tutorials, or FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="figma-search-input"
          />
        </div>

        {/* Quick Contact & Feedback Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div
            className="figma-help-action-box"
            onClick={() => setIsContactModalOpen(true)}
          >
            <div className="figma-help-action-icon">
              <MessageSquare size={18} color="#BF935A" />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 2px 0', color: '#0C0C0D' }}>
              Contact Support
            </h4>
            <p style={{ fontSize: '11px', color: '#686869', margin: 0 }}>
              Direct studio desk
            </p>
          </div>

          <div
            className="figma-help-action-box"
            onClick={() => setIsFeedbackModalOpen(true)}
          >
            <div className="figma-help-action-icon" style={{ background: '#E8F8EE' }}>
              <Sparkles size={18} color="#12B76A" />
            </div>
            <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '8px 0 2px 0', color: '#0C0C0D' }}>
              Send Feedback
            </h4>
            <p style={{ fontSize: '11px', color: '#686869', margin: 0 }}>
              App suggestions
            </p>
          </div>
        </div>

        {/* Step-by-Step Onboarding Guides (Figma bottom sections) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#686869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Studio How-To Guides ({filteredGuides.length})
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredGuides.map((guide) => (
              <div
                key={guide.id}
                className="figma-guide-card"
                onClick={() => setSelectedGuide(guide)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <span className="figma-guide-category-tag">{guide.category}</span>
                  <ChevronRight size={16} color="#979798" />
                </div>
                <h4 className="figma-guide-title">{guide.title}</h4>
                <p className="figma-guide-excerpt">{guide.excerpt}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Asked Questions (Figma: 346:15574) */}
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#686869', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Frequently Asked Questions
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaqIndex === idx;
              return (
                <div key={idx} className="figma-faq-card">
                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                  >
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0C0C0D', margin: 0, paddingRight: '12px', lineHeight: 1.35 }}>
                      {faq.q}
                    </h4>
                    <ChevronDown
                      size={18}
                      color="#BF935A"
                      style={{
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                        flexShrink: 0,
                      }}
                    />
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F0F0F2', fontSize: '13px', color: '#4A4A4C', lineHeight: 1.5 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Guide Article Reader Drawer */}
      {selectedGuide && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedGuide(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="figma-guide-category-tag">{selectedGuide.category}</span>
              <button onClick={() => setSelectedGuide(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 8px 0', lineHeight: 1.3 }}>
              {selectedGuide.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#686869', margin: '0 0 16px 0' }}>
              {selectedGuide.excerpt}
            </p>

            <div className="figma-receipt-divider" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '14px 0 24px 0' }}>
              {selectedGuide.steps.map((st, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div className="figma-step-number">{i + 1}</div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#4A4A4C', lineHeight: 1.5 }}>{st}</p>
                </div>
              ))}
            </div>

            <button className="figma-btn-gold-full" onClick={() => setSelectedGuide(null)}>
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Contact Support Modal (Figma: 349:16196) */}
      {isContactModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsContactModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Contact Studio Support</h3>
              <button onClick={() => setIsContactModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Issue Category</label>
                <select className="figma-form-input">
                  <option>Vault & Drawing Access Issue</option>
                  <option>Payment Discrepancy Inquiry</option>
                  <option>Hardware Device Authorization</option>
                  <option>Consultation Calendar Scheduling</option>
                </select>
              </div>

              <div>
                <label className="figma-form-label">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of inquiry..."
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  className="figma-form-input"
                />
              </div>

              <div>
                <label className="figma-form-label">Detailed Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your request or site requirement..."
                  value={contactMsg}
                  onChange={(e) => setContactMsg(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsContactModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  <Send size={16} />
                  <span>Send Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Feedback Modal (Figma: 349:16293) */}
      {isFeedbackModalOpen && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setIsFeedbackModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>Send App Feedback</h3>
              <button onClick={() => setIsFeedbackModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-form-label">Feedback Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Feature Suggestion', 'Bug Report', 'UX Improvement'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`figma-choice-pill ${feedbackCategory === cat ? 'active' : ''}`}
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                      onClick={() => setFeedbackCategory(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="figma-form-label">Your Experience / Feedback</label>
                <textarea
                  required
                  rows={4}
                  placeholder="How can we improve the mobile workspace experience for your studio?"
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsFeedbackModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

