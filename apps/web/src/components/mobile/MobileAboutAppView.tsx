import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  ChevronLeft,
  Info,
  Shield,
  FileText,
  Building2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import './mobile.css';

export interface MobileAboutAppViewProps {
  onBack: () => void;
}

export const MobileAboutAppView: React.FC<MobileAboutAppViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'ABOUT' | 'TERMS' | 'PRIVACY'>('ABOUT');

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">About App & Legal</h2>
        </div>
      </div>

      <div className="figma-subpage-body">
        {/* Pill Tab Switcher */}
        <div className="figma-pill-tab-group" style={{ marginBottom: '16px' }}>
          <button
            className={`figma-pill-tab ${activeTab === 'ABOUT' ? 'active' : ''}`}
            onClick={() => setActiveTab('ABOUT')}
          >
            <Info size={15} />
            <span>About</span>
          </button>
          <button
            className={`figma-pill-tab ${activeTab === 'TERMS' ? 'active' : ''}`}
            onClick={() => setActiveTab('TERMS')}
          >
            <FileText size={15} />
            <span>Terms</span>
          </button>
          <button
            className={`figma-pill-tab ${activeTab === 'PRIVACY' ? 'active' : ''}`}
            onClick={() => setActiveTab('PRIVACY')}
          >
            <Shield size={15} />
            <span>Privacy</span>
          </button>
        </div>

        {/* Tab 1: About App (Figma: 359:19451) */}
        {activeTab === 'ABOUT' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="figma-about-brand-card">
              <img
                src="/assets/auth/asf_logo.svg"
                alt="A&F Design"
                style={{ height: '48px', margin: '0 auto 10px' }}
              />
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 2px 0', textAlign: 'center' }}>
                A&F Design
              </h3>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#BF935A', margin: 0, textAlign: 'center', letterSpacing: '0.08em' }}>
                ARCHITECTURE & INTERIORS STUDIO
              </p>
              <span className="figma-about-version-badge">
                Version 2.4.0 (Studio Enterprise Build 2408)
              </span>
            </div>

            <div className="figma-info-group-card">
              <div className="figma-info-row">
                <span style={{ fontSize: '13px', color: '#686869' }}>Platform Edition</span>
                <strong style={{ fontSize: '13px', color: '#0C0C0D' }}>Architectural Operations PWA</strong>
              </div>
              <div className="figma-info-row">
                <span style={{ fontSize: '13px', color: '#686869' }}>Drawing Engine</span>
                <strong style={{ fontSize: '13px', color: '#0C0C0D' }}>Zero-Trust Vault v2.4</strong>
              </div>
              <div className="figma-info-row">
                <span style={{ fontSize: '13px', color: '#686869' }}>Encryption Standard</span>
                <strong style={{ fontSize: '13px', color: '#087A48' }}>AES-256 GCM Rest / TLS 1.3</strong>
              </div>
              <div className="figma-info-row">
                <span style={{ fontSize: '13px', color: '#686869' }}>Studio HQ</span>
                <strong style={{ fontSize: '13px', color: '#0C0C0D' }}>Ahmedabad, Gujarat, India</strong>
              </div>
            </div>

            <p style={{ fontSize: '12px', color: '#979798', textAlign: 'center', lineHeight: 1.5, margin: '16px 0 0 0' }}>
              © 2026 A&F Design Architecture & Interiors. All rights reserved.<br />
              Drawings, specifications, and renderings remain the intellectual property of the studio.
            </p>
          </div>
        )}

        {/* Tab 2: Terms of Service (Figma: 359:19373) */}
        {activeTab === 'TERMS' && (
          <div className="figma-legal-doc-card">
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 8px 0' }}>
              Terms of Service
            </h3>
            <span style={{ fontSize: '12px', color: '#979798' }}>Last revised: October 2026</span>

            <div className="figma-receipt-divider" />

            <div style={{ fontSize: '13px', color: '#4A4A4C', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                <strong>1. Architectural Ownership & Drawing Licensing</strong><br />
                All technical CAD sheets, BIM models, elevations, 3D renderings, and specifications uploaded to the A&F Design portal remain the sole intellectual property of A&F Design Studio. Clients and site contractors receive a single-site execution license.
              </p>
              <p>
                <strong>2. Authorized Device Sessions & Security Binding</strong><br />
                Workspace access is granted strictly through device-binding authentication. Users may not share credentials or export unauthorized print batches without official studio seal stamps.
              </p>
              <p>
                <strong>3. Milestone Approvals & Financial Clearance</strong><br />
                Stage approvals granted through the digital portal constitute formal design sign-off for statutory submissions and contractor site mobilization.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Privacy Policy (Figma: 359:19412) */}
        {activeTab === 'PRIVACY' && (
          <div className="figma-legal-doc-card">
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 8px 0' }}>
              Privacy & Data Policy
            </h3>
            <span style={{ fontSize: '12px', color: '#979798' }}>Last revised: October 2026</span>

            <div className="figma-receipt-divider" />

            <div style={{ fontSize: '13px', color: '#4A4A4C', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p>
                <strong>1. Geofenced Site Attendance Telemetry</strong><br />
                GPS location coordinates captured during clock-in events are utilized solely for site-radius verification (geofence gate compliance). No continuous background tracking is performed.
              </p>
              <p>
                <strong>2. Confidential Project Documents</strong><br />
                Client drawings, financial ledgers, and consultation chat streams are encrypted in transit and at rest with role-isolated authorization matrices.
              </p>
              <p>
                <strong>3. Hardware Token Storage</strong><br />
                Device approval tokens are stored securely in local browser storage and validated against server-side session revocation registries.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

