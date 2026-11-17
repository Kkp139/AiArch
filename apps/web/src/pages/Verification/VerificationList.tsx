import React, { useState, useEffect } from 'react';
import { UserRole } from '../../context/AuthContext';
import {
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  Clock,
  FileCheck,
  Eye,
  Download,
  Plus,
  X,
  FileText,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Paperclip,
  Check,
  Send,
  ExternalLink,
  Printer,
  Maximize2,
  FileCode2,
} from 'lucide-react';

export type VerificationStatus = 'PENDING_APPROVAL' | 'PENDING_REVIEW' | 'APPROVED' | 'REVISION_REQUIRED' | 'REVISION_REQUESTED';

export interface VerificationItem {
  id: string;
  projectId?: string;
  projectCode?: string;
  projectName?: string;
  folderId?: string;
  category: string;
  drawingTitle: string;
  fileKey?: string;
  previewKey?: string | null;
  revisionNumber: number;
  revisionLabel?: string;
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string | null;
  adminNotes?: string;
  feedbackNote?: string | null;
  submittedBy?: string;
  reviewedBy?: string | null;
}

export interface VerificationListProps {
  userRole: UserRole;
  items: VerificationItem[];
  onApprove?: (id: string) => void;
  onRequestRevision?: (id: string, notes: string) => void;
  onSubmitVerification?: (data: {
    projectId: string;
    folderId: string;
    drawingTitle: string;
    fileKey: string;
    previewKey?: string;
    notes: string;
  }) => Promise<void>;
  projectCode?: string;
  getAuthHeaders?: () => Record<string, string>;
}

const STANDARD_16_CATEGORIES = [
  { id: '01_SITE_DRGS', name: '01 Site Drawings & Topographic Layout', group: 'CONCEPT' },
  { id: '02_ZONING_PLANNING', name: '02 Zoning & Space Planning', group: 'CONCEPT' },
  { id: '03_SPACE_OBJECT_DESIGN', name: '03 Space & Object Studies', group: 'CONCEPT' },
  { id: '04_COMPLETE_SET_DRGS', name: '04 Complete Architectural Schematic Package', group: 'CONCEPT' },
  { id: '05_MATERIAL_SELECTION', name: '05 Material Selection & Moodboards', group: 'CONCEPT' },
  { id: '06_3D_IMAGES', name: '06 3D Photorealistic CGI Renders', group: 'CONCEPT' },
  { id: '07_CIVIL_DRGS', name: '07 Civil Footing & Column Layouts', group: 'CONSTRUCTION' },
  { id: '08_PLUMBING_DRGS', name: '08 Plumbing & Drainage Schematics', group: 'CONSTRUCTION' },
  { id: '09_FIRE_DRGS', name: '09 Fire Hydrant & Life Safety Plans', group: 'CONSTRUCTION' },
  { id: '10_HVAC_DRGS', name: '10 HVAC Chilled Water & Ducting', group: 'CONSTRUCTION' },
  { id: '11_FLOORING_DRGS', name: '11 Marble & Tile Flooring Layouts', group: 'CONSTRUCTION' },
  { id: '12_CEILING_DRGS', name: '12 Reflected Ceiling & Lighting Drops', group: 'CONSTRUCTION' },
  { id: '13_ELECTRICAL_DRGS', name: '13 Electrical SLD & Power Conduit Routes', group: 'CONSTRUCTION' },
  { id: '14_WALL_ELEVATION', name: '14 Internal & External Wall Elevations', group: 'CONSTRUCTION' },
  { id: '15_ELEMENT_DRGS', name: '15 Architectural Joinery & Element Details', group: 'CONSTRUCTION' },
  { id: '03_OTHER', name: '03 Other / Miscellaneous Reference', group: 'OTHER' },
];

export function VerificationList({
  userRole,
  items,
  onApprove,
  onRequestRevision,
  onSubmitVerification,
  projectCode = 'AF-VILLA',
  getAuthHeaders,
}: VerificationListProps) {
  const isAdmin = userRole === 'ADMIN';
  const isStaff = userRole === 'STAFF';

  // Filter State
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REVISION'>('ALL');

  // Inspection Drawer State (Admin & Staff opening document)
  const [inspectingItem, setInspectingItem] = useState<VerificationItem | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [sheetViewMode, setSheetViewMode] = useState<'PAPER_PDF' | 'BLUEPRINT'>('PAPER_PDF');

  // Revision Request State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionTargetItem, setRevisionTargetItem] = useState<VerificationItem | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionError, setRevisionError] = useState<string | null>(null);

  // New Verification Submission State (Staff side)
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState(STANDARD_16_CATEGORIES[3].name);
  const [newNotes, setNewNotes] = useState('');
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableFolders, setAvailableFolders] = useState<Array<{ id: string; folderName: string; categoryCode: string }>>([]);

  // Fetch real project folders for submission dropdown
  useEffect(() => {
    const fetchProjectFolders = async () => {
      try {
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
          return;
        }
        if (typeof window !== 'undefined' && (!window.location?.origin || window.location.origin === 'null' || window.location.href.startsWith('about:blank'))) {
          return;
        }
        const headers = getAuthHeaders ? getAuthHeaders() : {};
        const res = await fetch(`/api/vault/projects/${encodeURIComponent(projectCode)}/documents`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.folders && Array.isArray(data.folders)) {
            setAvailableFolders(data.folders);
          }
        }
      } catch (err) {
        console.error('Failed to load project folders', err);
      }
    };
    fetchProjectFolders();
  }, [projectCode, getAuthHeaders]);

  // Status Badge Helper
  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: 'var(--accent-emerald)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            <CheckCircle2 size={13} /> Approved
          </span>
        );
      case 'REVISION_REQUIRED':
      case 'REVISION_REQUESTED':
        return (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              color: 'var(--accent-rose)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              border: '1px solid rgba(244, 63, 94, 0.25)',
            }}
          >
            <RotateCcw size={13} /> Revision Required
          </span>
        );
      case 'PENDING_APPROVAL':
      case 'PENDING_REVIEW':
      default:
        return (
          <span
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: 'var(--accent-amber)',
              fontSize: '11px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <Clock size={13} /> Under Review
          </span>
        );
    }
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    if (activeFilter === 'PENDING') {
      return item.status === 'PENDING_REVIEW' || item.status === 'PENDING_APPROVAL';
    }
    if (activeFilter === 'APPROVED') {
      return item.status === 'APPROVED';
    }
    if (activeFilter === 'REVISION') {
      return item.status === 'REVISION_REQUIRED' || item.status === 'REVISION_REQUESTED';
    }
    return true;
  });

  // Handle Staff Verification Submission
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // STRICT VALIDATION REQUIREMENTS:
    // 1. Drawing title cannot be empty
    if (!newTitle.trim()) {
      setSubmitError('Drawing Title cannot be empty. Please enter a valid drawing or sheet title.');
      return;
    }

    // 2. Written notes explaining what to verify cannot be empty
    if (!newNotes.trim() || newNotes.trim().length < 5) {
      setSubmitError('Written notes explaining what needs verification are mandatory (minimum 5 characters). Empty text submissions are not permitted.');
      return;
    }

    // 3. Must have an attached file
    if (!attachedFileName) {
      setSubmitError('A CAD (.dwg) or PDF drawing file must be attached for verification.');
      return;
    }

    setIsSubmitting(true);
    try {
      const matchedFolder = availableFolders.find(
        (f) => f.folderName.toLowerCase() === newCategory.toLowerCase() || f.categoryCode === newCategory
      ) || availableFolders[0];

      const folderId = matchedFolder ? matchedFolder.id : 'ef5db4fa-fdeb-4a7d-9d9e-a1acdf6a82b1';
      const cleanFileName = attachedFileName.replace(/\s+/g, '_');
      const fileKey = `projects/${projectCode}/submissions/${cleanFileName}`;

      const payload = {
        projectId: projectCode,
        folderId,
        drawingTitle: newTitle.trim(),
        fileKey,
        previewKey: `previews/${cleanFileName.replace(/\.[^/.]+$/, '')}.pdf`,
        notes: newNotes.trim(),
        feedbackNote: newNotes.trim(),
      };

      if (onSubmitVerification) {
        await onSubmitVerification(payload);
      } else {
        const headers = getAuthHeaders ? getAuthHeaders() : { 'Content-Type': 'application/json' };
        const res = await fetch('/api/verification/submit', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to submit verification');
        }
      }

      setNewTitle('');
      setNewNotes('');
      setAttachedFileName('');
      setAttachedFileSize('');
      setIsSubmitModalOpen(false);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle File Input Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFileName(file.name);
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setAttachedFileSize(`${sizeMb} MB`);
      setSubmitError(null);
    }
  };

  // OPEN IN NEW TAB / BROWSER NATIVE ACCESSIBLE PDF PRINT SHEET
  const handleOpenAccessiblePdfInNewTab = (item: VerificationItem) => {
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
      alert('Popup blocked. Please allow popups to open the PDF drawing sheet in a new tab.');
      return;
    }

    const sheetNo = `A-10${item.revisionNumber}`;
    const dateStr = new Date(item.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    newWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${item.drawingTitle} - Sheet ${sheetNo} (Rev ${item.revisionNumber})</title>
  <style>
    @page { size: A3 landscape; margin: 8mm; }
    body {
      margin: 0;
      padding: 24px;
      background: #323639;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #111;
    }
    .toolbar {
      width: 1040px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #202124;
      color: #fff;
      padding: 10px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-sizing: border-box;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    .toolbar button {
      background: #c5a059;
      color: #0d0f12;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .sheet {
      width: 1040px;
      min-height: 720px;
      background: #ffffff;
      padding: 24px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border: 2px solid #222;
      box-sizing: border-box;
      position: relative;
    }
    .border-inner {
      border: 1px solid #333;
      height: 100%;
      min-height: 668px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px;
      box-sizing: border-box;
      position: relative;
    }
    .title-block {
      border: 2px solid #111;
      display: grid;
      grid-template-columns: 2fr 3fr 1.5fr 1.5fr;
      margin-top: 16px;
      background: #fafafa;
    }
    .block-cell {
      padding: 8px 12px;
      border-right: 1px solid #333;
    }
    .block-cell:last-child { border-right: none; }
    .label { font-size: 9px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 3px; }
    .val { font-size: 13px; font-weight: 800; color: #111; }
    @media print {
      body { background: none; padding: 0; }
      .toolbar { display: none; }
      .sheet { box-shadow: none; width: 100%; height: 100%; border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>ARCHITECTURAL PDF DRAWING SHEET</strong> &bull; ${item.drawingTitle} (Rev ${item.revisionNumber})
    </div>
    <div style="display:flex; gap:10px;">
      <button onclick="window.print()">Print / Save as PDF</button>
    </div>
  </div>

  <div class="sheet">
    <div class="border-inner">
      <!-- Drawing Header Grid -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #ccc; padding-bottom:10px;">
        <div>
          <span style="font-size:16px; font-weight:800; color:#111;">A&F DESIGN STUDIO &bull; ARCHITECTURAL COLLABORATION PORTAL</span>
          <div style="font-size:11px; color:#555;">Studio Sovereignty Baseline &bull; Single-Tenant CAD Registry</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:14px; font-weight:700; color:#c5a059;">PROJECT: ${projectCode}</span>
          <div style="font-size:11px; color:#555;">Category: ${item.category}</div>
        </div>
      </div>

      <!-- Architectural Vector Floor Plan Layout -->
      <div style="flex:1; display:flex; align-items:center; justify-content:center; margin:16px 0;">
        <svg width="960" height="480" viewBox="0 0 960 480" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Background Cad Grid -->
          <defs>
            <pattern id="printGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#f0f0f0" stroke-width="0.8"/>
            </pattern>
          </defs>
          <rect width="960" height="480" fill="url(#printGrid)" />

          <!-- Outer Site Boundary -->
          <rect x="60" y="30" width="840" height="420" stroke="#444" stroke-width="1.5" stroke-dasharray="8 4" />
          <text x="75" y="48" fill="#666" font-size="11" font-family="monospace">NORTH SITE BOUNDARY 42.50m</text>
          <text x="75" y="440" fill="#666" font-size="11" font-family="monospace">SOUTH ROAD FRONTAGE &bull; 9.00m SETBACK</text>

          <!-- Main Building Envelope -->
          <rect x="180" y="80" width="600" height="320" stroke="#111" stroke-width="3" fill="#ffffff" />

          <!-- Internal Partition Walls -->
          <line x1="480" y1="80" x2="480" y2="400" stroke="#111" stroke-width="2.5" />
          <line x1="180" y1="240" x2="780" y2="240" stroke="#111" stroke-width="2.5" />

          <!-- Central Courtyard -->
          <rect x="420" y="180" width="120" height="120" stroke="#c5a059" stroke-width="2" fill="#fffdfa" stroke-dasharray="4 2" />
          <text x="444" y="246" fill="#c5a059" font-size="12" font-weight="bold">COURTYARD</text>
          <text x="438" y="262" fill="#888" font-size="9">(OPEN TO SKY)</text>

          <!-- Room Names & Area Schedules -->
          <text x="210" y="140" fill="#111" font-size="14" font-weight="700">01 MASTER SUITE</text>
          <text x="210" y="160" fill="#666" font-size="11">5400 x 4800 mm &bull; Teakwood Parquet</text>

          <text x="520" y="140" fill="#111" font-size="14" font-weight="700">02 LIVING SALON &amp; LOUNGE</text>
          <text x="520" y="160" fill="#666" font-size="11">6800 x 5200 mm &bull; Italian Statuario</text>

          <text x="210" y="300" fill="#111" font-size="14" font-weight="700">03 ARCHITECTURAL STUDIO LAB</text>
          <text x="210" y="320" fill="#666" font-size="11">4800 x 4200 mm &bull; Polished Concrete</text>

          <text x="520" y="300" fill="#111" font-size="14" font-weight="700">04 DINING &amp; DRY KITCHEN</text>
          <text x="520" y="320" fill="#666" font-size="11">5200 x 4800 mm &bull; Fluted Oak Millwork</text>

          <!-- North Arrow -->
          <g transform="translate(840, 100)">
            <circle cx="20" cy="20" r="18" stroke="#111" stroke-width="1.5" fill="#fff" />
            <polygon points="20,6 26,24 20,20 14,24" fill="#111" />
            <text x="16" y="34" font-size="9" font-weight="bold" fill="#111">N</text>
          </g>

          <!-- Dimension Strings -->
          <line x1="180" y1="70" x2="780" y2="70" stroke="#3b82f6" stroke-width="1.2" />
          <circle cx="180" cy="70" r="2.5" fill="#3b82f6" />
          <circle cx="780" cy="70" r="2.5" fill="#3b82f6" />
          <text x="480" y="65" fill="#3b82f6" font-size="11" font-weight="bold" text-anchor="middle">24.00 METERS SPAN</text>
        </svg>
      </div>

      <!-- Professional Title Block -->
      <div class="title-block">
        <div class="block-cell">
          <div class="label">Architecture Studio</div>
          <div class="val">A&amp;F Design Studio</div>
          <div style="font-size:10px; color:#555; margin-top:2px;">Ahmedabad HQ &bull; Portal Monolith</div>
        </div>
        <div class="block-cell">
          <div class="label">Drawing Title &amp; Category</div>
          <div class="val">${item.drawingTitle}</div>
          <div style="font-size:10px; color:#555; margin-top:2px;">${item.category}</div>
        </div>
        <div class="block-cell">
          <div class="label">Sheet Ref / Scale</div>
          <div class="val">${sheetNo} &bull; 1:100</div>
          <div style="font-size:10px; color:#555; margin-top:2px;">Date: ${dateStr}</div>
        </div>
        <div class="block-cell">
          <div class="label">Revision &amp; Sign-off</div>
          <div class="val" style="color:${item.status === 'APPROVED' ? '#10b981' : '#f59e0b'};">
            ${item.revisionLabel || `Rev ${item.revisionNumber}`} &bull; ${item.status}
          </div>
          <div style="font-size:10px; color:#555; margin-top:2px;">By: ${item.submittedBy || 'Ar. Ronak Shah'}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
    newWindow.document.close();
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: '24px',
        color: 'var(--text-primary)',
      }}
    >
      {/* Top Header & Action Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Design Verification &amp; Approvals
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                color: 'var(--accent-gold)',
                border: '1px solid var(--border-strong)',
              }}
            >
              PROJECT: {projectCode}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Inspect architectural drawing sheets, review staff specification notes, and verify CAD revisions.
          </p>
        </div>

        {/* Staff & Admin Action: Request Verification */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {(isStaff || isAdmin) && (
            <button
              onClick={() => {
                setSubmitError(null);
                setIsSubmitModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0f12',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <Plus size={16} strokeWidth={2.5} /> Request Verification
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { key: 'ALL', label: `All Submissions (${items.length})` },
          { key: 'PENDING', label: `Under Review (${items.filter(i => i.status === 'PENDING_REVIEW' || i.status === 'PENDING_APPROVAL').length})` },
          { key: 'APPROVED', label: `Approved (${items.filter(i => i.status === 'APPROVED').length})` },
          { key: 'REVISION', label: `Revision Required (${items.filter(i => i.status === 'REVISION_REQUIRED' || i.status === 'REVISION_REQUESTED').length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key as any)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              border: activeFilter === tab.key ? '1px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
              backgroundColor: activeFilter === tab.key ? 'rgba(197, 160, 89, 0.15)' : 'var(--bg-tertiary)',
              color: activeFilter === tab.key ? 'var(--accent-gold)' : 'var(--text-secondary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Verification Cards Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredItems.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-strong)',
            }}
          >
            <FileCheck size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              No verification submissions in this view
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Staff can submit drawings for verification using the &quot;Request Verification&quot; button above.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const fileName = item.fileKey ? item.fileKey.split('/').pop() : `${item.drawingTitle.replace(/\s+/g, '_')}.dwg`;

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  transition: 'border-color 0.2s',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  {/* Left: Title, Revision badge, and Category */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-gold)',
                        flexShrink: 0,
                      }}
                    >
                      <FileCheck size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                          {item.drawingTitle}
                        </h4>

                        {/* REVISION COUNTER: Visible to BOTH Admin and Staff */}
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: 'var(--accent-gold)',
                            color: '#0d0f12',
                            fontWeight: 800,
                            letterSpacing: '0.3px',
                          }}
                        >
                          Rev {item.revisionNumber}
                        </span>
                      </div>

                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{item.category}</span>
                        <span>•</span>
                        <span>Submitted by <strong style={{ color: 'var(--text-primary)' }}>{item.submittedBy || 'Ar. Ronak Shah'}</strong></span>
                        <span>•</span>
                        <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status badge */}
                  <div>{getStatusBadge(item.status)}</div>
                </div>

                {/* Attached Document & Staff Request Note Callout */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    border: '1px solid var(--border-subtle)',
                    marginBottom: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  {/* Attached File Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Paperclip size={14} color="var(--accent-gold)" />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Attached Sheet:</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--accent-gold)',
                        fontFamily: 'var(--font-mono)',
                        background: 'rgba(197, 160, 89, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(197, 160, 89, 0.25)',
                      }}
                    >
                      {fileName}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Architectural PDF Sheet / CAD Vector)</span>
                  </div>

                  {/* Staff Written Context Note */}
                  {(item.feedbackNote || item.adminNotes) && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '2px' }}>
                      <FileText size={14} color="var(--text-secondary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Verification Request Notes: </strong>
                        <span>&quot;{item.feedbackNote || item.adminNotes}&quot;</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons: OPEN DRAWING AS PDF for Admin & Staff */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* PRIMARY ACTION: Open Drawing as PDF Sheet */}
                    <button
                      onClick={() => {
                        setInspectingItem(item);
                        setZoomLevel(100);
                        setSheetViewMode('PAPER_PDF');
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <Eye size={15} color="var(--accent-gold)" /> Open Drawing as PDF Sheet
                    </button>

                    {/* QUICK ACCESSIBILITY: Open standalone in new tab */}
                    <button
                      onClick={() => handleOpenAccessiblePdfInNewTab(item)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Open full drawing sheet in a new accessible tab with browser PDF tools"
                    >
                      <ExternalLink size={14} /> Fullscreen Tab
                    </button>
                  </div>

                  {/* Admin Approval & Revision Actions */}
                  {isAdmin && (item.status === 'PENDING_APPROVAL' || item.status === 'PENDING_REVIEW') && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => onApprove && onApprove(item.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: 'var(--accent-emerald)',
                          color: '#ffffff',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Check size={14} /> Approve Drawing
                      </button>
                      <button
                        onClick={() => {
                          setRevisionTargetItem(item);
                          setRevisionNotes('');
                          setRevisionError(null);
                          setIsRevisionModalOpen(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: 'rgba(244, 63, 94, 0.12)',
                          border: '1px solid rgba(244, 63, 94, 0.3)',
                          color: 'var(--accent-rose)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <RotateCcw size={14} /> Request Revision
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ARCHITECTURAL PDF DRAWING SHEET VIEWER MODAL                            */}
      {/* ========================================================================= */}
      {inspectingItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setInspectingItem(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-strong)',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '94vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                padding: '18px 24px',
                borderBottom: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-secondary)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    {inspectingItem.drawingTitle}
                  </h3>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#0d0f12',
                      fontWeight: 800,
                    }}
                  >
                    Rev {inspectingItem.revisionNumber}
                  </span>
                  {getStatusBadge(inspectingItem.status)}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>{inspectingItem.category}</span>
                  <span style={{ margin: '0 6px' }}>•</span>
                  <span>Project: {projectCode}</span>
                  <span style={{ margin: '0 6px' }}>•</span>
                  <span>Submitted by <strong>{inspectingItem.submittedBy || 'Ar. Ronak Shah'}</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleOpenAccessiblePdfInNewTab(inspectingItem)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Open full accessible drawing in a new tab"
                >
                  <ExternalLink size={14} /> Fullscreen PDF
                </button>

                <button
                  onClick={() => setInspectingItem(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Staff's Written Verification Request Notes */}
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FileText size={15} color="var(--accent-gold)" />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Staff Verification Notes &amp; Scope:
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    margin: 0,
                    lineHeight: '1.5',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  &quot;{inspectingItem.feedbackNote || inspectingItem.adminNotes || 'Drawing submitted for architectural compliance, layout verification, and structural sign-off.'}&quot;
                </p>
              </div>

              {/* Accessible PDF Sheet Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {/* View Mode Toggle: Clean PDF Paper vs Blueprint */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setSheetViewMode('PAPER_PDF')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: sheetViewMode === 'PAPER_PDF' ? 'var(--accent-gold)' : 'transparent',
                      color: sheetViewMode === 'PAPER_PDF' ? '#0d0f12' : 'var(--text-secondary)',
                      border: sheetViewMode === 'PAPER_PDF' ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    📄 PDF Sheet (Print Mode)
                  </button>
                  <button
                    onClick={() => setSheetViewMode('BLUEPRINT')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: sheetViewMode === 'BLUEPRINT' ? 'var(--accent-gold)' : 'transparent',
                      color: sheetViewMode === 'BLUEPRINT' ? '#0d0f12' : 'var(--text-secondary)',
                      border: sheetViewMode === 'BLUEPRINT' ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    📐 CAD Blueprint Mode
                  </button>
                </div>

                {/* PDF Zoom & Accessibility Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(prev - 20, 60))}
                    style={{
                      padding: '5px 8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                    title="Zoom Out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', minWidth: '40px', textAlign: 'center' }}>
                    {zoomLevel}%
                  </span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(prev + 20, 180))}
                    style={{
                      padding: '5px 8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                    title="Zoom In"
                  >
                    <ZoomIn size={14} />
                  </button>
                  <button
                    onClick={() => setZoomLevel(100)}
                    style={{
                      padding: '5px 8px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                    title="Reset Zoom"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Realistic Architectural Drawing PDF Sheet Canvas */}
              <div
                style={{
                  width: '100%',
                  height: '380px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: sheetViewMode === 'PAPER_PDF' ? '#e5e7eb' : '#0d1117',
                  border: '1px solid var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'auto',
                  padding: '20px',
                }}
              >
                {/* Scaled Sheet Paper */}
                <div
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.15s ease',
                    width: '820px',
                    height: '520px',
                    backgroundColor: sheetViewMode === 'PAPER_PDF' ? '#ffffff' : '#090d16',
                    color: sheetViewMode === 'PAPER_PDF' ? '#111827' : '#e6edf3',
                    border: sheetViewMode === 'PAPER_PDF' ? '2px solid #1f2937' : '2px solid #388bfd',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '16px',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {/* Sheet Top Coordinate Bar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: sheetViewMode === 'PAPER_PDF' ? '1px solid #e5e7eb' : '1px solid #21262d',
                      paddingBottom: '8px',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ color: sheetViewMode === 'PAPER_PDF' ? '#111827' : '#58a6ff' }}>
                      A&amp;F ARCHITECTURAL DESIGN STUDIO &bull; PERMIT DRAWING SHEET
                    </span>
                    <span style={{ color: '#c5a059' }}>
                      PROJ: {projectCode} &bull; SHEET REF: A-10{inspectingItem.revisionNumber}
                    </span>
                  </div>

                  {/* CAD Vector Floor Plan Layout */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="780" height="380" viewBox="0 0 780 380" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="sheetGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                          <path
                            d="M 20 0 L 0 0 0 20"
                            fill="none"
                            stroke={sheetViewMode === 'PAPER_PDF' ? '#f3f4f6' : '#161b22'}
                            strokeWidth="0.8"
                          />
                        </pattern>
                      </defs>
                      <rect width="780" height="380" fill="url(#sheetGrid)" />

                      {/* Boundary lines */}
                      <rect
                        x="40"
                        y="20"
                        width="700"
                        height="340"
                        stroke={sheetViewMode === 'PAPER_PDF' ? '#6b7280' : '#484f58'}
                        strokeWidth="1.2"
                        strokeDasharray="6 3"
                      />
                      <text x="50" y="34" fill={sheetViewMode === 'PAPER_PDF' ? '#9ca3af' : '#8b949e'} fontSize="9" fontFamily="monospace">
                        BOUNDARY 38.50m
                      </text>
                      <text x="50" y="352" fill={sheetViewMode === 'PAPER_PDF' ? '#9ca3af' : '#8b949e'} fontSize="9" fontFamily="monospace">
                        ROAD SETBACK 7.50m
                      </text>

                      {/* Wall Enclosures */}
                      <rect
                        x="120"
                        y="50"
                        width="540"
                        height="270"
                        stroke={sheetViewMode === 'PAPER_PDF' ? '#111827' : '#58a6ff'}
                        strokeWidth="2.5"
                        fill={sheetViewMode === 'PAPER_PDF' ? '#ffffff' : '#0d1117'}
                      />

                      {/* Partitions */}
                      <line
                        x1="390"
                        y1="50"
                        x2="390"
                        y2="320"
                        stroke={sheetViewMode === 'PAPER_PDF' ? '#1f2937' : '#79c0ff'}
                        strokeWidth="2"
                      />
                      <line
                        x1="120"
                        y1="185"
                        x2="660"
                        y2="185"
                        stroke={sheetViewMode === 'PAPER_PDF' ? '#1f2937' : '#79c0ff'}
                        strokeWidth="2"
                      />

                      {/* Central Courtyard */}
                      <rect
                        x="340"
                        y="135"
                        width="100"
                        height="100"
                        stroke="#c5a059"
                        strokeWidth="1.8"
                        fill={sheetViewMode === 'PAPER_PDF' ? '#fefce8' : 'rgba(197, 160, 89, 0.1)'}
                        strokeDasharray="4 2"
                      />
                      <text x="355" y="190" fill="#c5a059" fontSize="10" fontWeight="bold">
                        COURTYARD
                      </text>

                      {/* Room Designations */}
                      <text x="145" y="105" fill={sheetViewMode === 'PAPER_PDF' ? '#111827' : '#e6edf3'} fontSize="11" fontWeight="700">
                        01 MASTER SUITE
                      </text>
                      <text x="145" y="122" fill={sheetViewMode === 'PAPER_PDF' ? '#6b7280' : '#8b949e'} fontSize="9">
                        5400 x 4800 mm
                      </text>

                      <text x="420" y="105" fill={sheetViewMode === 'PAPER_PDF' ? '#111827' : '#e6edf3'} fontSize="11" fontWeight="700">
                        02 LIVING SALON
                      </text>
                      <text x="420" y="122" fill={sheetViewMode === 'PAPER_PDF' ? '#6b7280' : '#8b949e'} fontSize="9">
                        6800 x 5200 mm
                      </text>

                      <text x="145" y="240" fill={sheetViewMode === 'PAPER_PDF' ? '#111827' : '#e6edf3'} fontSize="11" fontWeight="700">
                        03 ARCHITECT LAB
                      </text>
                      <text x="145" y="257" fill={sheetViewMode === 'PAPER_PDF' ? '#6b7280' : '#8b949e'} fontSize="9">
                        4800 x 4200 mm
                      </text>

                      <text x="420" y="240" fill={sheetViewMode === 'PAPER_PDF' ? '#111827' : '#e6edf3'} fontSize="11" fontWeight="700">
                        04 DINING &amp; KITCHEN
                      </text>
                      <text x="420" y="257" fill={sheetViewMode === 'PAPER_PDF' ? '#6b7280' : '#8b949e'} fontSize="9">
                        5200 x 4800 mm
                      </text>

                      {/* Dimension lines */}
                      <line x1="120" y1="42" x2="660" y2="42" stroke="#3b82f6" strokeWidth="1" />
                      <circle cx="120" cy="42" r="2" fill="#3b82f6" />
                      <circle cx="660" cy="42" r="2" fill="#3b82f6" />
                      <text x="390" y="38" fill="#3b82f6" fontSize="9" fontWeight="bold" textAnchor="middle">
                        24.00m ENVELOPE
                      </text>
                    </svg>
                  </div>

                  {/* Standard Professional Architectural Title Block */}
                  <div
                    style={{
                      border: sheetViewMode === 'PAPER_PDF' ? '1px solid #111827' : '1px solid #30363d',
                      backgroundColor: sheetViewMode === 'PAPER_PDF' ? '#f9fafb' : '#161b22',
                      display: 'grid',
                      gridTemplateColumns: '2fr 3fr 1.5fr 1.5fr',
                      padding: '8px 12px',
                      fontSize: '11px',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#6b7280' }}>STUDIO</div>
                      <div style={{ fontWeight: 800 }}>A&amp;F Design Studio</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#6b7280' }}>SHEET TITLE</div>
                      <div style={{ fontWeight: 800 }}>{inspectingItem.drawingTitle}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#6b7280' }}>SHEET / SCALE</div>
                      <div style={{ fontWeight: 800 }}>A-10{inspectingItem.revisionNumber} &bull; 1:100</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#6b7280' }}>STATUS</div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: inspectingItem.status === 'APPROVED' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                        }}
                      >
                        {inspectingItem.revisionLabel || `Rev ${inspectingItem.revisionNumber}`} &bull; {inspectingItem.status}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document File Metadata & Accessible Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-tertiary)',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Paperclip size={15} color="var(--accent-gold)" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {inspectingItem.fileKey ? inspectingItem.fileKey.split('/').pop() : `${inspectingItem.drawingTitle.replace(/\s+/g, '_')}_v${inspectingItem.revisionNumber}.dwg`}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Architectural Vector Sheet &bull; PDF Printable)</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenAccessiblePdfInNewTab(inspectingItem)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <ExternalLink size={14} color="var(--accent-gold)" /> Open in Browser PDF Tab
                  </button>
                  <button
                    onClick={() => {
                      alert(`Exporting official drawing sheet package: ${inspectingItem.drawingTitle}\nIncludes vector PDF sheet and DWG CAD drawing.`);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: 'var(--accent-gold)',
                      border: 'none',
                      borderRadius: 'var(--radius-md)',
                      color: '#0d0f12',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Download size={14} /> Download PDF
                  </button>
                </div>
              </div>

              {/* Admin Review Decision Actions inside Modal */}
              {isAdmin && (inspectingItem.status === 'PENDING_REVIEW' || inspectingItem.status === 'PENDING_APPROVAL') && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <button
                    onClick={() => {
                      if (onApprove) {
                        onApprove(inspectingItem.id);
                        setInspectingItem(null);
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      backgroundColor: 'var(--accent-emerald)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={16} /> Approve &amp; Publish to Project Vault
                  </button>

                  <button
                    onClick={() => {
                      setRevisionTargetItem(inspectingItem);
                      setRevisionNotes('');
                      setRevisionError(null);
                      setInspectingItem(null);
                      setIsRevisionModalOpen(true);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      backgroundColor: 'rgba(244, 63, 94, 0.15)',
                      border: '1px solid rgba(244, 63, 94, 0.35)',
                      color: 'var(--accent-rose)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <RotateCcw size={16} /> Request Revisions with Notes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STAFF & ADMIN: REQUEST DESIGN VERIFICATION MODAL                       */}
      {/* ========================================================================= */}
      {isSubmitModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-strong)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Request Design Verification
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  Submit architectural sheet for Admin review. Both document attachment and explanation notes are mandatory.
                </p>
              </div>

              <button
                onClick={() => setIsSubmitModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} style={{ padding: '24px' }}>
              {/* Error Callout */}
              {submitError && (
                <div
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.12)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    color: 'var(--accent-rose)',
                    fontSize: '13px',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '2px' }}>Validation Alert</strong>
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              {/* 1. Category / Folder Selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Architectural Category / Sheet Folder <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                >
                  {STANDARD_16_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.name} style={{ backgroundColor: '#14181d', color: '#f3f4f6' }}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Drawing Title (Mandatory) */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Drawing / Sheet Title <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Second Floor Reflected Ceiling & Lighting Drops"
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* 3. Written Context Notes for Admin (Mandatory) */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    Verification Request Notes <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <span style={{ fontSize: '11px', color: newNotes.trim().length >= 5 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                    {newNotes.trim().length} chars {newNotes.trim().length >= 5 ? '✓ Valid' : '(Min 5 required)'}
                  </span>
                </div>
                <textarea
                  placeholder="Detail the revisions made, structural considerations, client feedback incorporated, or key points for Admin to verify..."
                  value={newNotes}
                  onChange={(e) => {
                    setNewNotes(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* 4. Attached File / Drawing Picker (Mandatory) */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Attach CAD Drawing (.dwg, .dxf) or PDF Sheet <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>

                {attachedFileName ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'var(--bg-tertiary)',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--accent-gold)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={18} color="var(--accent-emerald)" />
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                          {attachedFileName}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {attachedFileSize} • Ready for upload
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachedFileName('');
                        setAttachedFileSize('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent-rose)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '24px 16px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1.5px dashed var(--border-strong)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <Paperclip size={24} color="var(--accent-gold)" style={{ marginBottom: '8px' }} />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Click to Browse CAD / PDF File
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supports .dwg, .dxf, .pdf, .png up to 50MB
                    </span>
                    <input
                      type="file"
                      accept=".dwg,.dxf,.pdf,.png,.jpg,.jpeg"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || newNotes.trim().length < 5 || !attachedFileName}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    backgroundColor: (!newTitle.trim() || newNotes.trim().length < 5 || !attachedFileName) ? 'var(--bg-surface)' : 'var(--accent-gold)',
                    color: (!newTitle.trim() || newNotes.trim().length < 5 || !attachedFileName) ? 'var(--text-muted)' : '#0d0f12',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '13px',
                    fontWeight: 800,
                    border: 'none',
                    cursor: (!newTitle.trim() || newNotes.trim().length < 5 || !attachedFileName) ? 'not-allowed' : 'pointer',
                    boxShadow: (!newTitle.trim() || newNotes.trim().length < 5 || !attachedFileName) ? 'none' : 'var(--shadow-sm)',
                  }}
                >
                  <Send size={15} /> {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ADMIN: REQUEST REVISION MODAL                                          */}
      {/* ========================================================================= */}
      {isRevisionModalOpen && revisionTargetItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1250,
            padding: '20px',
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setIsRevisionModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              padding: '24px',
              borderRadius: 'var(--radius-lg)',
              width: '100%',
              maxWidth: '480px',
              border: '1px solid var(--border-strong)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} color="var(--accent-rose)" />
                <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Request Revision (Rev {revisionTargetItem.revisionNumber})
                </h3>
              </div>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px 0' }}>
              Specify the modifications, structural alterations, or CAD revisions required from staff for{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{revisionTargetItem.drawingTitle}</strong>:
            </p>

            {revisionError && (
              <div style={{ color: 'var(--accent-rose)', fontSize: '12px', marginBottom: '10px' }}>
                {revisionError}
              </div>
            )}

            <textarea
              placeholder="e.g. Wall thickness at grid line B must be increased to 230mm for load-bearing verification. Recalculate plumbing drop..."
              value={revisionNotes}
              onChange={(e) => {
                setRevisionNotes(e.target.value);
                if (revisionError) setRevisionError(null);
              }}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '18px',
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!revisionNotes.trim()) {
                    setRevisionError('Please provide revision feedback notes.');
                    return;
                  }
                  if (onRequestRevision) {
                    onRequestRevision(revisionTargetItem.id, revisionNotes.trim());
                  }
                  setIsRevisionModalOpen(false);
                  setRevisionNotes('');
                }}
                style={{
                  padding: '8px 18px',
                  backgroundColor: 'var(--accent-rose)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Submit Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
