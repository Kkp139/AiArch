import React from 'react';
import {
  ChevronLeft,
  Info,
  ShieldCheck,
  Award,
  Sparkles,
  CheckCircle2,
  Building2,
} from 'lucide-react';

export interface MobileAboutAppViewProps {
  onBack: () => void;
}

export const MobileAboutAppView: React.FC<MobileAboutAppViewProps> = ({ onBack }) => {
  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            More
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">About App</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              About App &amp; Legal
            </h2>
            <div style={{ fontSize: '12px', color: '#686869' }}>
              Architecture &amp; Interior Studio Workspace
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #352618 0%, #523A24 100%)',
            borderRadius: '22px',
            padding: '28px 20px',
            color: '#FFFFFF',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(53,38,24,0.2)',
          }}
        >
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '18px',
              background: '#FFFFFF',
              margin: '0 auto 14px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#352618',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <Building2 size={32} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#FFFFFF' }}>
            A&amp;F Design Portal
          </h3>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '12px' }}>
            Architecture &amp; Interior Project Management
          </div>
          <span
            style={{
              background: 'rgba(255,255,255,0.18)',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Version 2.1 • Studio Workspace
          </span>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', color: '#0C0C0D', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#BF935A" /> Studio Capabilities
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#4A4A4C' }}>
              <CheckCircle2 size={16} color="#12B76A" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>16-folder architectural vault covering Concept, Construction &amp; Other sheets</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#4A4A4C' }}>
              <CheckCircle2 size={16} color="#12B76A" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>Admin verification workflow, stamp approvals &amp; client revision loops</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#4A4A4C' }}>
              <CheckCircle2 size={16} color="#12B76A" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>GPS-backed staff attendance, milestone payments &amp; client meeting calendar</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#352618" /> Role-Based Access Control
            </span>
            <span style={{ fontWeight: 700, color: '#027A48' }}>Enforced</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} color="#BF935A" /> Studio Brand
            </span>
            <span style={{ fontWeight: 600, color: '#0C0C0D' }}>A&amp;F Design</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ color: '#686869', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} color="#4A4A4C" /> Portal
            </span>
            <span style={{ fontWeight: 600, color: '#0C0C0D' }}>Responsive Mobile &amp; Desktop</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '13px', color: '#686869', paddingTop: '10px' }}>
          <button type="button" style={{ background: 'none', border: 'none', color: '#352618', fontWeight: 600, cursor: 'pointer' }}>Terms</button>
          <span>•</span>
          <button type="button" style={{ background: 'none', border: 'none', color: '#352618', fontWeight: 600, cursor: 'pointer' }}>Privacy</button>
        </div>
      </div>
    </div>
  );
};
