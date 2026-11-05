import React, { useState } from 'react';
import { UserRole } from '../../context/AuthContext';
import { VerificationItem } from '../../pages/Verification/VerificationList';
import {
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Search,
  Filter,
  X,
  RotateCcw,
  Stamp,
  Layers,
  ZoomIn,
  Plus,
  UploadCloud,
} from 'lucide-react';
import './mobile.css';

export interface MobileDrawingVerificationViewProps {
  userRole: UserRole;
  items: VerificationItem[];
  onBack: () => void;
  onApprove?: (id: string) => void;
  onRequestRevision?: (id: string, notes: string) => void;
}

export const MobileDrawingVerificationView: React.FC<MobileDrawingVerificationViewProps> = ({
  userRole,
  items,
  onBack,
  onApprove,
  onRequestRevision,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<VerificationItem | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Staff Drawing Submission State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('01 Site Drawings & Topographic Layout');
  const [newStaffNotes, setNewStaffNotes] = useState('');
  const [customItems, setCustomItems] = useState<VerificationItem[]>([]);

  const defaultItems: VerificationItem[] = [
    {
      id: 'ver-1',
      drawingTitle: 'Ground Floor Setting Out Geometry & Column Centerlines',
      category: 'Architectural Working Drawing',
      revisionNumber: 2,
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
      submittedBy: 'Rajesh Patel (Architect)',
    },
    {
      id: 'ver-2',
      drawingTitle: 'Courtyard Swimming Pool Hydraulic Drainage & Sump Section',
      category: 'MEP & Plumbing',
      revisionNumber: 1,
      status: 'PENDING_REVIEW',
      submittedAt: new Date(Date.now() - 86400000).toISOString(),
      submittedBy: 'Karan Dave (Site Lead)',
    },
    {
      id: 'ver-3',
      drawingTitle: 'Perimeter Boundary Wall Foundation Details',
      category: 'Structural',
      revisionNumber: 3,
      status: 'APPROVED',
      submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      submittedBy: 'Sonu Sharma (BIM Lead)',
      adminNotes: 'Verified and signed with architectural seal.',
    },
  ];

  const baseItems = items && items.length > 0 ? items : defaultItems;
  const activeItems = [...customItems, ...baseItems];

  const filteredItems = activeItems.filter((item) =>
    item.drawingTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = (id: string) => {
    if (onApprove) onApprove(id);
    setSelectedItem(null);
    alert('Drawing approved and stamped with the Official Studio Seal.');
  };

  const handleRevisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !revisionNotes.trim()) return;
    if (onRequestRevision) onRequestRevision(selectedItem.id, revisionNotes);
    setIsRevisionModalOpen(false);
    setSelectedItem(null);
    setRevisionNotes('');
    alert('Revision request sent to the assigned architect.');
  };

  const handleStaffUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: VerificationItem = {
      id: `ver-${Date.now()}`,
      drawingTitle: newTitle.trim(),
      category: newCategory,
      revisionNumber: 1,
      status: 'PENDING_APPROVAL',
      submittedAt: new Date().toISOString(),
      submittedBy: 'Staff Architect',
    };

    setCustomItems([newItem, ...customItems]);
    setIsUploadModalOpen(false);
    setNewTitle('');
    setNewStaffNotes('');
    alert('Drawing sheet submitted to studio admin verification queue.');
  };

  // Client Isolation Gate (Chapter 14: Verification is an internal staff/admin workflow)
  if (userRole === 'CLIENT_LEADER' || userRole === 'CLIENT_VIEWER') {
    return (
      <div className="figma-mobile-subpage">
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
              <ChevronLeft size={20} color="#0C0C0D" />
            </button>
            <h2 className="figma-subpage-title">Design Verification</h2>
          </div>
        </div>
        <div className="figma-subpage-body" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '30px', background: '#FEE4E2', color: '#D92D20', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <FileCheck size={28} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 8px 0' }}>Access Restricted</h3>
          <p style={{ fontSize: '13px', color: '#686869', lineHeight: 1.5, margin: 0 }}>
            Design verification is an internal studio workflow for architects and administrators. Approved client blueprints can be downloaded directly from the project folders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="figma-mobile-subpage">
      {/* Top Header matching Figma 451:8625 */}
      <div className="figma-subpage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="figma-subpage-back" onClick={onBack} aria-label="Go Back">
            <ChevronLeft size={20} color="#0C0C0D" />
          </button>
          <h2 className="figma-subpage-title">Design Verification</h2>
        </div>
        {userRole === 'STAFF' && (
          <button
            className="figma-primary-btn-sm"
            onClick={() => setIsUploadModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Submit Drawing</span>
          </button>
        )}
      </div>

      <div className="figma-subpage-body">
        {/* Search */}
        <div className="figma-mobile-search-pill" style={{ marginBottom: '16px' }}>
          <Search size={18} color="#979798" />
          <input
            type="text"
            placeholder="Search drawing sheet, category, revision..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="figma-search-input"
          />
        </div>

        {/* Verification Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredItems.map((item) => {
            const isApproved = item.status === 'APPROVED';
            const isPending = item.status === 'PENDING_APPROVAL' || item.status === 'PENDING_REVIEW';

            return (
              <div
                key={item.id}
                className="figma-verification-card"
                onClick={() => setSelectedItem(item)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span className="figma-drawing-cat-tag">{item.category}</span>
                  <span className={`figma-status-badge ${isApproved ? 'cleared' : isPending ? 'pending' : 'revision'}`}>
                    {isApproved ? 'Approved' : isPending ? 'Pending Stamp' : 'Revision Required'}
                  </span>
                </div>

                <h3 className="figma-verification-title">{item.drawingTitle}</h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #F0F0F2', paddingTop: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="figma-rev-tag">Rev 0{item.revisionNumber}</span>
                    <span style={{ fontSize: '12px', color: '#686869' }}>
                      {item.submittedBy || 'Architect'}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#BF935A', fontWeight: 600 }}>Review Sheet</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawing Review Sheet Modal (Figma: 451:8774) */}
      {selectedItem && (
        <div className="figma-bottom-sheet-overlay" onClick={() => setSelectedItem(null)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <span className="figma-drawing-cat-tag">{selectedItem.category}</span>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0C0C0D', margin: '0 0 6px 0' }}>
              {selectedItem.drawingTitle}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#686869', marginBottom: '14px' }}>
              <span className="figma-rev-tag">Rev 0{selectedItem.revisionNumber}</span>
              <span>Submitted by {selectedItem.submittedBy}</span>
            </div>

            {/* Drawing Preview Blueprint Mock */}
            <div className="figma-drawing-mock-canvas">
              <div className="figma-blueprint-grid" />
              <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                <Layers size={36} color="#BF935A" style={{ marginBottom: '8px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>
                  A&F Studio Architectural Drawing
                </div>
                <div style={{ fontSize: '11px', color: '#686869', marginTop: '2px' }}>
                  Scale 1:50 @ A1 • Clean Layer Geometry
                </div>
              </div>
              {selectedItem.status === 'APPROVED' && (
                <div className="figma-studio-seal-stamp">
                  APPROVED & STAMPED
                </div>
              )}
            </div>

            {selectedItem.adminNotes && (
              <div style={{ background: '#E8F8EE', padding: '10px', borderRadius: '8px', margin: '14px 0', fontSize: '13px', color: '#087A48' }}>
                <strong>Studio Sign-Off Note:</strong> {selectedItem.adminNotes}
              </div>
            )}

            {/* Actions for Admin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {userRole === 'ADMIN' && selectedItem.status !== 'APPROVED' && (
                <button
                  className="figma-btn-gold-full"
                  onClick={() => handleApprove(selectedItem.id)}
                >
                  <Stamp size={18} />
                  <span>Approve & Apply Studio Seal</span>
                </button>
              )}

              {userRole === 'ADMIN' && (
                <button
                  className="figma-btn-secondary-full"
                  onClick={() => setIsRevisionModalOpen(true)}
                  style={{ color: '#D92D20', borderColor: '#FECDCA' }}
                >
                  <RotateCcw size={16} />
                  <span>Request Revision</span>
                </button>
              )}

              <button className="figma-btn-secondary-full" onClick={() => setSelectedItem(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Request Modal */}
      {isRevisionModalOpen && (
        <div className="figma-bottom-sheet-overlay" style={{ zIndex: 110 }} onClick={() => setIsRevisionModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px 0', color: '#D92D20' }}>
              Request Drawing Revision
            </h3>
            <p style={{ fontSize: '13px', color: '#686869', margin: '0 0 14px 0' }}>
              Specify drawing coordinates, elevation conflicts, or dimension revisions required.
            </p>
            <form onSubmit={handleRevisionSubmit}>
              <textarea
                required
                rows={4}
                placeholder="e.g. Verify column offset between Grid line 3 and corridor shaft..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="figma-modal-textarea"
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsRevisionModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-full figma-btn-danger">
                  Send Revision Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Drawing Submission Drawer (Chapter 6.1) */}
      {isUploadModalOpen && (
        <div className="figma-bottom-sheet-overlay" style={{ zIndex: 110 }} onClick={() => setIsUploadModalOpen(false)}>
          <div className="figma-bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="figma-sheet-handle" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
                Submit Drawing for Verification
              </h3>
              <button onClick={() => setIsUploadModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#686869" />
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#686869', margin: '0 0 16px 0' }}>
              Upload your architectural CAD/PDF sheet for studio administrator review and official stamping.
            </p>

            <form onSubmit={handleStaffUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="figma-modal-label">Drawing Sheet Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ground Floor Electrical Lighting Layout"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="figma-modal-input"
                />
              </div>

              <div>
                <label className="figma-modal-label">Intended Folder / Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="figma-modal-input"
                  style={{ background: '#FFFFFF' }}
                >
                  <option value="01 Site Drawings & Topographic Layout">01 Site Drawings & Topographic Layout</option>
                  <option value="02 Zoning & Space Planning">02 Zoning & Space Planning</option>
                  <option value="04 Complete Architectural Package">04 Complete Architectural Package</option>
                  <option value="07 Civil Footing & Column Layouts">07 Civil Footing & Column Layouts</option>
                  <option value="08 Plumbing & Drainage Schematics">08 Plumbing & Drainage Schematics</option>
                  <option value="10 HVAC Chilled Water & Ducting">10 HVAC Chilled Water & Ducting</option>
                  <option value="11 Marble & Tile Flooring Layouts">11 Marble & Tile Flooring Layouts</option>
                  <option value="13 Electrical SLD & Power Conduit">13 Electrical SLD & Power Conduit</option>
                  <option value="14 Wall Elevations & Section Details">14 Wall Elevations & Section Details</option>
                  <option value="15 Architectural Joinery & Elements">15 Architectural Joinery & Elements</option>
                </select>
              </div>

              <div>
                <label className="figma-modal-label">Drawing File (.dwg, .dxf, .pdf) *</label>
                <div style={{ border: '2px dashed #BF935A', borderRadius: '12px', padding: '18px', textAlign: 'center', background: '#FAF7F4', cursor: 'pointer' }}>
                  <UploadCloud size={28} color="#BF935A" style={{ margin: '0 auto 6px' }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>Tap to select drawing file</p>
                  <span style={{ fontSize: '11px', color: '#979798' }}>Standard CAD format (.dwg, .pdf up to 50MB)</span>
                </div>
              </div>

              <div>
                <label className="figma-modal-label">Revision Submission Notes (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Notes for lead architect (e.g. column coordinates verified with structural model)"
                  value={newStaffNotes}
                  onChange={(e) => setNewStaffNotes(e.target.value)}
                  className="figma-modal-textarea"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="figma-btn-secondary-full" onClick={() => setIsUploadModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="figma-btn-gold-full">
                  Submit to Verification Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

