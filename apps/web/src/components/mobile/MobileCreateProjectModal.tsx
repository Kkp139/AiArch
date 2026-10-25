import React, { useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';

export interface MobileCreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
  authHeaders: Record<string, string>;
}

export const MobileCreateProjectModal: React.FC<MobileCreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
  authHeaders,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State (matching Figma: 188:4155)
  const [formData, setFormData] = useState({
    projectName: '',
    projectCode: '',
    category: 'Architecture & Interior',
    siteLocation: '',
    email: '',
    description: '',
    totalAgreedFee: 500000,
    advancePaymentReceived: 100000,
    allowClientDownloads: 'ALL_APPROVED',
    showPricingClientLeader: true,
    showPricingClientViewer: false,
    allowClientMeetings: true,
  });

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.projectName.trim() || !formData.projectCode.trim() || !formData.siteLocation.trim()) {
        setError('Please fill in Project Name, Code, and Site Location.');
        return;
      }
    }
    setError(null);
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as any);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: formData.projectName,
          projectCode: formData.projectCode.toUpperCase(),
          category: formData.category,
          siteLocation: formData.siteLocation,
          totalAgreedFee: Number(formData.totalAgreedFee),
          advancePaymentReceived: Number(formData.advancePaymentReceived),
          allowClientDownloads: formData.allowClientDownloads,
          showPricingClientLeader: formData.showPricingClientLeader,
          showPricingClientViewer: formData.showPricingClientViewer,
          allowClientMeetings: formData.allowClientMeetings,
        }),
      });

      if (res.ok) {
        alert(`Project "${formData.projectName}" created with 16 Appendix A folders!`);
        onProjectCreated();
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create project');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="figma-sheet-backdrop" onClick={onClose}>
      <div
        className="figma-sheet-content"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: '20px 20px 32px 20px', borderRadius: '28px 28px 0 0' }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleBack}
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
              Create project
            </h3>
          </div>

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
            <X size={18} color="#0C0C0D" />
          </button>
        </div>

        {/* 3-Step Wizard Stepper (Figma: 188:4155) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '0 20px' }}>
            <div style={{ position: 'absolute', top: '7px', left: '30px', right: '30px', height: '2px', background: '#E8E8E9', zIndex: 1 }} />

            {/* Step 1 */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: currentStep >= 1 ? '#352618' : '#D0D0D2',
                  border: currentStep === 1 ? '2px solid #BF935A' : 'none',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: currentStep === 1 ? 700 : 500, color: currentStep === 1 ? '#BF935A' : '#686869' }}>
                Basic Info
              </span>
            </div>

            {/* Step 2 */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: currentStep >= 2 ? '#352618' : '#D0D0D2',
                  border: currentStep === 2 ? '2px solid #BF935A' : 'none',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: currentStep === 2 ? 700 : 500, color: currentStep === 2 ? '#BF935A' : '#686869' }}>
                Finance & Client
              </span>
            </div>

            {/* Step 3 */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: currentStep >= 3 ? '#352618' : '#D0D0D2',
                  border: currentStep === 3 ? '2px solid #BF935A' : 'none',
                }}
              />
              <span style={{ fontSize: '11px', fontWeight: currentStep === 3 ? 700 : 500, color: currentStep === 3 ? '#BF935A' : '#686869' }}>
                Setting
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#FEE4E2', color: '#D92D20', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* STEP 1: BASIC INFO */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Project Name *
              </label>
              <input
                type="text"
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                placeholder="E.g. The Courtyard House"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Project Code *
              </label>
              <input
                type="text"
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                placeholder="E.g. LAP, ART, CRF, AF-VILLA"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Category
              </label>
              <select
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Architecture & Interior">Architecture & Interior</option>
                <option value="Residential Villa">Residential Villa</option>
                <option value="Commercial Complex">Commercial Complex</option>
                <option value="Landscape Architecture">Landscape Architecture</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Site Location *
              </label>
              <input
                type="text"
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                placeholder="E.g. Bodakdev, Ahmedabad, Gujarat"
                value={formData.siteLocation}
                onChange={(e) => setFormData({ ...formData, siteLocation: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Email (Optional)
              </label>
              <input
                type="email"
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                placeholder="Enter client email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Description (Optional)
              </label>
              <textarea
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  border: '1px solid #E8E8E9',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
                placeholder="Add a short description of the architectural project..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* STEP 2: FINANCE & CLIENT */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Total Agreed Fee (₹)
              </label>
              <input
                type="number"
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                value={formData.totalAgreedFee}
                onChange={(e) => setFormData({ ...formData, totalAgreedFee: Number(e.target.value) })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Advance Payment Received (₹)
              </label>
              <input
                type="number"
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                value={formData.advancePaymentReceived}
                onChange={(e) => setFormData({ ...formData, advancePaymentReceived: Number(e.target.value) })}
              />
            </div>

            <div style={{ padding: '14px', background: '#F8F6F3', borderRadius: '14px', border: '1px solid #EBDDCF' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#9E743F', marginBottom: '4px' }}>
                Client Leader Access
              </div>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                The Client Leader will receive a single-use setup link via WhatsApp / Email to manage approvals and consultations.
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SETTINGS & PERMISSIONS */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#4A4A4C', marginBottom: '6px' }}>
                Client Download Permissions
              </label>
              <select
                className="figma-search-input"
                style={{ padding: '0 16px' }}
                value={formData.allowClientDownloads}
                onChange={(e) => setFormData({ ...formData, allowClientDownloads: e.target.value })}
              >
                <option value="ALL_APPROVED">All Approved Drawings (Default)</option>
                <option value="WATERMARKED_ONLY">Watermarked Drawings Only</option>
                <option value="NONE">View Only (No Downloads)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F5F5F7', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0C0C0D' }}>Show Pricing to Client Leader</div>
                <div style={{ fontSize: '12px', color: '#686869' }}>Toggle fee breakdown and payment ledger visibility</div>
              </div>
              <input
                type="checkbox"
                checked={formData.showPricingClientLeader}
                onChange={(e) => setFormData({ ...formData, showPricingClientLeader: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#BF935A' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F5F5F7', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0C0C0D' }}>Show Pricing to Client Viewer</div>
                <div style={{ fontSize: '12px', color: '#686869' }}>Allow secondary family/team viewers to see financials</div>
              </div>
              <input
                type="checkbox"
                checked={formData.showPricingClientViewer}
                onChange={(e) => setFormData({ ...formData, showPricingClientViewer: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#BF935A' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#F5F5F7', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0C0C0D' }}>Allow Consultation Meetings</div>
                <div style={{ fontSize: '12px', color: '#686869' }}>Dynamic Meetings module configuration (Decision #3)</div>
              </div>
              <input
                type="checkbox"
                checked={formData.allowClientMeetings}
                onChange={(e) => setFormData({ ...formData, allowClientMeetings: e.target.checked })}
                style={{ width: '20px', height: '20px', accentColor: '#BF935A' }}
              />
            </div>
          </div>
        )}

        {/* Action Button (Figma: 188:4155) */}
        <div style={{ marginTop: '28px' }}>
          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                background: '#BF935A',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(191, 147, 90, 0.35)',
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{
                width: '100%',
                height: '52px',
                borderRadius: '14px',
                background: '#BF935A',
                color: '#FFFFFF',
                fontSize: '16px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(191, 147, 90, 0.35)',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            >
              {isSubmitting ? 'Creating Project & Folders...' : 'Create Project'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
