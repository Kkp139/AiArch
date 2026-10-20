import React from 'react';

export const EditorialPanel: React.FC = () => {
  return (
    <div className="auth-editorial-col">
      <img
        src="/assets/auth/editorial_courtyard.png"
        alt="A&F Design Architectural Courtyard"
        className="editorial-bg"
      />
      <div className="editorial-overlay">
        <div className="editorial-masthead-row">
          <span>ARCHITECTURE & INTERIORS</span>
          <span>THE STUDIO PORTAL AHMEDABAD, INDIA</span>
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
