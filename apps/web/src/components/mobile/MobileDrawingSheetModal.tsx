import React from 'react';
import { DrawingItem } from './MobileDrawingFolderView';
import { ChevronLeft, Download, Eye, MoreVertical, X } from 'lucide-react';

export interface MobileDrawingSheetModalProps {
  drawing: DrawingItem | null;
  onClose: () => void;
}

export const MobileDrawingSheetModal: React.FC<MobileDrawingSheetModalProps> = ({
  drawing,
  onClose,
}) => {
  if (!drawing) return null;

  const isApproved = drawing.status === 'Approved';
  const dotColor = isApproved ? '#12B76A' : drawing.status === 'Pending' ? '#F79009' : '#175CD3';

  return (
    <div className="figma-sheet-backdrop" onClick={onClose}>
      <div
        className="figma-sheet-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '20px 20px 32px 20px', borderRadius: '28px 28px 0 0' }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#F5F5F7',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={20} color="#0C0C0D" />
            </button>
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              {drawing.title}
            </h3>
          </div>

          <button
            onClick={() => alert('Drawing options: Export as DWG, View Revision History, Pin to Quick Access')}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#F5F5F7',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <MoreVertical size={18} color="#0C0C0D" />
          </button>
        </div>

        {/* Blueprint Preview Visual Canvas (Figma: 29:1376) */}
        <div
          style={{
            width: '100%',
            height: '240px',
            borderRadius: '16px',
            backgroundColor: '#FAFAFA',
            border: '1.5px solid #E8E8E9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            marginBottom: '20px',
            boxShadow: 'inset 0 0 16px rgba(0,0,0,0.02)',
          }}
        >
          {/* Architectural Drawing SVG Blueprint */}
          <svg width="100%" height="100%" viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Grid Pattern */}
            <defs>
              <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#EAEAEB" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="320" height="220" fill="url(#cadGrid)" />
            {/* Outer Site Boundary */}
            <rect x="25" y="15" width="270" height="190" stroke="#4A4A4C" strokeWidth="1.5" strokeDasharray="6 3" />
            <text x="35" y="28" fill="#979798" fontSize="8" fontFamily="monospace">BOUNDARY 32.50m</text>
            <text x="35" y="198" fill="#979798" fontSize="8" fontFamily="monospace">ROAD SETBACK 6.00m</text>
            {/* Main Residence Walls */}
            <rect x="75" y="45" width="170" height="130" stroke="#0C0C0D" strokeWidth="2.5" fill="#FFFFFF" />
            {/* Internal Rooms */}
            <line x1="160" y1="45" x2="160" y2="175" stroke="#0C0C0D" strokeWidth="2" />
            <line x1="75" y1="110" x2="245" y2="110" stroke="#0C0C0D" strokeWidth="2" />
            {/* Central Courtyard */}
            <rect x="135" y="85" width="50" height="50" stroke="#BF935A" strokeWidth="1.8" fill="#F8EFE4" strokeDasharray="3 2" />
            <text x="142" y="112" fill="#BF935A" fontSize="7" fontWeight="bold">COURTYARD</text>
            <text x="92" y="78" fill="#4A4A4C" fontSize="8">MASTER SUITE</text>
            <text x="180" y="78" fill="#4A4A4C" fontSize="8">LIVING LOUNGE</text>
            <text x="92" y="145" fill="#4A4A4C" fontSize="8">STUDIO LAB</text>
            <text x="180" y="145" fill="#4A4A4C" fontSize="8">DINING & KITCHEN</text>
            {/* Dimension Lines */}
            <line x1="75" y1="40" x2="245" y2="40" stroke="#175CD3" strokeWidth="1" />
            <text x="148" y="38" fill="#175CD3" fontSize="8" textAnchor="middle">17.00m</text>
          </svg>

          {/* Watermark badge */}
          <div
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '12px',
              background: 'rgba(255,255,255,0.9)',
              padding: '2px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 700,
              color: '#BF935A',
              border: '1px solid #E8E8E9',
            }}
          >
            A&F STUDIO CAD
          </div>
        </div>

        {/* Metadata Information Sheet (Figma: 29:1376) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h4 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              {drawing.title}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700 }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }} />
              <span style={{ color: dotColor }}>{drawing.status}</span>
            </div>
          </div>

          <div style={{ fontSize: '14px', color: '#686869', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span>{drawing.code}</span>
            <span>•</span>
            <span style={{ fontWeight: 700, color: '#BF935A' }}>{drawing.version} (Revision Counter)</span>
          </div>

          <div style={{ height: '1px', background: '#E8E8E9', marginBottom: '14px' }} />

          {/* Key-Value Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#686869' }}>Discipline</span>
              <strong style={{ color: '#0C0C0D' }}>Site Drawings</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#686869' }}>Uploaded by</span>
              <strong style={{ color: '#0C0C0D' }}>{drawing.uploadedBy}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#686869' }}>Date & Time</span>
              <strong style={{ color: '#0C0C0D' }}>{drawing.date}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#686869' }}>File Size</span>
              <strong style={{ color: '#0C0C0D' }}>{drawing.fileSize}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#686869' }}>File Format</span>
              <strong style={{ color: '#0C0C0D' }}>PDF</strong>
            </div>
          </div>
        </div>

        {/* Action Buttons: View & Download (Figma: 29:1376) */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => alert(`Opening high-res architectural canvas for ${drawing.title} (${drawing.code})`)}
            style={{
              flex: 1,
              height: '50px',
              borderRadius: '14px',
              background: '#ECECEE',
              color: '#0C0C0D',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <Eye size={18} />
            <span>View</span>
          </button>

          <button
            onClick={() => alert(`Downloading verified drawing ${drawing.title} (${drawing.code}-${drawing.version}.pdf)`)}
            style={{
              flex: 1.3,
              height: '50px',
              borderRadius: '14px',
              background: '#BF935A',
              color: '#FFFFFF',
              fontSize: '15px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(191, 147, 90, 0.35)',
            }}
          >
            <Download size={18} />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};
