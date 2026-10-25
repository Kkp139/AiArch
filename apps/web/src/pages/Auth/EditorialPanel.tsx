import React from 'react';

export const EditorialPanel: React.FC = () => {
  return (
    <div className="auth-editorial-col" aria-label="A&F Design Architectural Courtyard - Great spaces. Built together.">
      <img
        src="/assets/auth/editorial_courtyard_clean.png"
        alt="A&F Design Architectural Courtyard"
        className="editorial-bg"
      />
      <div className="editorial-overlay">
        <div className="editorial-masthead-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
          <img src="/assets/auth/asf_logo.svg" alt="asf design" style={{ height: '36px', width: 'auto' }} />
          <span style={{ fontSize: '11px', letterSpacing: '0.14em', color: 'rgba(255, 255, 255, 0.75)', fontWeight: 600 }}>
            ARCHITECTURE & INTERIORS
          </span>
        </div>


        <div className="editorial-bottom-content">
          <span className="editorial-eyebrow">SPACES FOR SHARED AMBITION</span>
          <h1 className="editorial-headline">
            Great spaces.<br />Built together.
          </h1>
          <p className="editorial-supporting">
            A considered place for every drawing, decision and conversation.
          </p>
          <div className="editorial-divider" />
          <div className="editorial-caption-row">
            <span>FIELD NOTES / THE COURTYARD HOUSE</span>
            <span>2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};
