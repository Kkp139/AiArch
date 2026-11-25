import React, { useState } from 'react';
import {
  ChevronLeft,
  FolderPlus,
  Building2,
  MapPin,
  IndianRupee,
  Download,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileCreateProjectModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onBack?: () => void;
  onSuccess?: () => void;
  onProjectCreated?: () => void;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
}

export const MobileCreateProjectModal: React.FC<MobileCreateProjectModalProps> = ({
  isOpen,
  onClose,
  onBack,
  onSuccess,
  onProjectCreated,
  authHeaders,
  getAuthHeaders,
}) => {
  const closeHandler = onClose || onBack || (() => {});
  const successHandler = onProjectCreated || onSuccess;

  const [formData, setFormData] = useState({
    projectCode: '',
    projectName: '',
    category: 'Residential Villa',
    siteLocation: '',
    totalAgreedFee: '',
    advancePaymentReceived: '',
    allowClientDownloads: 'VIEW_AND_DOWNLOAD',
    showPricingClientLeader: true,
    showPricingClientViewer: false,
    allowClientMeetings: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (isOpen === false) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectCode.trim() || !formData.projectName.trim()) {
      setErrorMsg('Project Code and Project Name are required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders, true);
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          projectCode: formData.projectCode.trim().toUpperCase(),
          name: formData.projectName.trim(),
          category: formData.category,
          siteLocation: formData.siteLocation.trim(),
          totalAgreedFee: Number(formData.totalAgreedFee) || 0,
          advancePaymentReceived: Number(formData.advancePaymentReceived) || 0,
          allowClientDownloads: formData.allowClientDownloads,
          showPricingClientLeader: formData.showPricingClientLeader,
          showPricingClientViewer: formData.showPricingClientViewer,
          allowClientMeetings: formData.allowClientMeetings,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccessMsg(
          `Project "${formData.projectName.trim()}" created with 16 standard architectural folders.`
        );
        if (successHandler) successHandler();
        setTimeout(() => {
          closeHandler();
        }, 650);
      } else {
        setErrorMsg(data.error || 'Failed to initialize project workspace.');
      }
    } catch {
      setErrorMsg('Network error creating project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div style={{ flex: 1, paddingBottom: '28px', backgroundColor: '#F5F4F2', color: '#1D1D1F' }}>
      <div
        className="figma-subpage-header"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '8px',
          padding: '18px 20px 14px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #ECECEF',
        }}
      >
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={closeHandler}>
            Projects
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Create Project</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={closeHandler}>
              <ChevronLeft size={22} />
            </button>
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
                Create New Project
              </h2>
              <div style={{ fontSize: '12px', color: '#686869' }}>
                Auto-Provisions 16 Standard Architecture Folders
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={closeHandler}
            aria-label="Close"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: '#F5F5F7',
              color: '#1D1D1F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {errorMsg && (
          <div
            style={{
              background: '#FEF3F2',
              color: '#B42318',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #FECDCA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#ECFDF3',
              color: '#027A48',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              border: '1px solid #ABEFC6',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Section 1: Core Project Identity */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Building2 size={18} color="#352618" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
              Project Identity
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Project Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. AF-RES-04"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
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
                Project Name *
              </label>
              <input
                type="text"
                required
                placeholder="Enter project title"
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
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
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Residential Villa">Residential Villa</option>
                <option value="Luxury Interior">Luxury Interior</option>
                <option value="Commercial Tower">Commercial Tower</option>
                <option value="Hospitality / Resort">Hospitality / Resort</option>
                <option value="Institutional">Institutional</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Site Location
              </label>
              <div style={{ position: 'relative' }}>
                <MapPin size={16} color="#686869" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input
                  type="text"
                  placeholder="City / Locality"
                  value={formData.siteLocation}
                  onChange={(e) => setFormData({ ...formData, siteLocation: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 36px',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Financial Baseline */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <IndianRupee size={18} color="#352618" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
              Financial Baseline
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'block', marginBottom: '4px' }}>
                Total Agreed Fee (₹ INR)
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.totalAgreedFee}
                onChange={(e) => setFormData({ ...formData, totalAgreedFee: e.target.value })}
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
                Advance Payment Received (₹ INR)
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.advancePaymentReceived}
                onChange={(e) => setFormData({ ...formData, advancePaymentReceived: e.target.value })}
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
          </div>
        </div>

        {/* Section 3: Client Access & Privacy Matrix */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px',
            border: '1px solid rgba(0,0,0,0.04)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Users size={18} color="#352618" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0C0C0D' }}>
              Client Governance Permissions
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Download size={14} /> Client Drawing Download Policy
              </label>
              <select
                value={formData.allowClientDownloads}
                onChange={(e) => setFormData({ ...formData, allowClientDownloads: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                  background: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              >
                <option value="VIEW_AND_DOWNLOAD">Clients can View &amp; Download Sheets</option>
                <option value="VIEW_ONLY">View Only — No Downloads</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>
                Show Pricing to Client Leader
              </span>
              <input
                type="checkbox"
                checked={formData.showPricingClientLeader}
                onChange={(e) => setFormData({ ...formData, showPricingClientLeader: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#352618' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>
                Show Pricing to Client Viewer
              </span>
              <input
                type="checkbox"
                checked={formData.showPricingClientViewer}
                onChange={(e) => setFormData({ ...formData, showPricingClientViewer: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#352618' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0C0C0D' }}>
                Allow Client Meeting Requests
              </span>
              <input
                type="checkbox"
                checked={formData.allowClientMeetings}
                onChange={(e) => setFormData({ ...formData, allowClientMeetings: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: '#352618' }}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            background: '#352618',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '14px',
            padding: '16px',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(53, 38, 24, 0.25)',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <span>Initializing Project Workspace...</span>
          ) : (
            <>
              <FolderPlus size={18} />
              <span>Create Project &amp; Provision 16 Folders</span>
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#686869', fontSize: '11px' }}>
          <CheckCircle2 size={14} color="#12B76A" />
          <span>6 Concept + 9 Construction + 03_OTHER Vault Ready</span>
        </div>
      </form>
    </div>
  );

  if (isOpen) {
    return (
      <div
        onClick={closeHandler}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 4500,
          backgroundColor: 'rgba(15, 15, 18, 0.55)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: '#F5F4F2',
            borderRadius: '24px',
            boxShadow: '0 24px 64px rgba(0, 0, 0, 0.28)',
            border: '1px solid #ECECEF',
          }}
        >
          {content}
        </div>
      </div>
    );
  }

  return content;
};
