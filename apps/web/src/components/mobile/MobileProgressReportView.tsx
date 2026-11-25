import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  TrendingUp,
  CheckCircle2,
  FolderKanban,
  ShieldX,
  Loader2,
  Compass,
  HardHat,
  FolderArchive,
} from 'lucide-react';
import { UserRole } from '../../context/AuthContext';
import { ProjectSummary } from '../../App';
import { AuthHeadersInput, resolveAuthHeaders } from './mobileAuth';

export interface MobileProgressReportViewProps {
  userRole: UserRole;
  projects: ProjectSummary[];
  selectedProjectCode?: string;
  onSelectProjectCode?: (code: string) => void;
  authHeaders?: Record<string, string>;
  getAuthHeaders?: AuthHeadersInput;
  onBack: () => void;
}

interface ProgressCategoryItem {
  categoryCode: string;
  folderName: string;
  phaseGroup: 'CONCEPT' | 'CONSTRUCTION' | 'OTHER';
  fileCount: number;
  approvedCount?: number;
  isPopulated: boolean;
}

interface ProgressReportData {
  projectCode: string;
  projectName: string;
  completionPercentage: number;
  populatedFolders: number;
  totalFolders: number;
  phases: {
    concept: { populated: number; total: number; percentage: number };
    construction: { populated: number; total: number; percentage: number };
    other: { populated: number; total: number; percentage: number };
  };
  categories: ProgressCategoryItem[];
}

export const MobileProgressReportView: React.FC<MobileProgressReportViewProps> = ({
  userRole,
  projects,
  selectedProjectCode,
  onSelectProjectCode,
  authHeaders,
  getAuthHeaders,
  onBack,
}) => {
  const [activeCode, setActiveCode] = useState(
    selectedProjectCode || projects[0]?.projectCode || ''
  );
  const [report, setReport] = useState<ProgressReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<'ALL' | 'CONCEPT' | 'CONSTRUCTION' | 'OTHER'>('ALL');

  useEffect(() => {
    if (selectedProjectCode && selectedProjectCode !== 'ALL') {
      setActiveCode(selectedProjectCode);
    } else if (!activeCode && projects[0]?.projectCode) {
      setActiveCode(projects[0].projectCode);
    }
  }, [selectedProjectCode, projects, activeCode]);

  const loadReport = useCallback(async () => {
    if (!activeCode || userRole === 'STAFF') return;
    setLoading(true);
    try {
      const headers = resolveAuthHeaders(authHeaders ?? getAuthHeaders);
      let res = await fetch(
        `/api/projects/${encodeURIComponent(activeCode)}/progress-report`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setReport(data.report || data);
        setLoading(false);
        return;
      }

      // Fallback: compute live from /api/vault/projects/:code/documents if /progress-report is not available
      res = await fetch(
        `/api/vault/projects/${encodeURIComponent(activeCode)}/documents`,
        { headers }
      );
      if (res.ok) {
        const vault = await res.json();
        const folders: any[] = vault.folders || [];
        const categories: ProgressCategoryItem[] = folders.map((f: any) => {
          const fileCount =
            typeof f.fileCount === 'number'
              ? f.fileCount
              : Array.isArray(f.documents)
              ? f.documents.length
              : 0;
          const approvedCount = Array.isArray(f.documents)
            ? f.documents.filter((d: any) => d.isApprovedDrawing).length
            : 0;
          const rawGroup = String(f.phaseGroup || '').toUpperCase();
          const phaseGroup: 'CONCEPT' | 'CONSTRUCTION' | 'OTHER' =
            rawGroup === 'CONCEPT'
              ? 'CONCEPT'
              : rawGroup === 'CONSTRUCTION'
              ? 'CONSTRUCTION'
              : 'OTHER';

          return {
            categoryCode: f.categoryCode,
            folderName: f.folderName,
            phaseGroup,
            fileCount,
            approvedCount,
            isPopulated: fileCount > 0,
          };
        });

        const conceptCats = categories.filter((c) => c.phaseGroup === 'CONCEPT');
        const constructionCats = categories.filter((c) => c.phaseGroup === 'CONSTRUCTION');
        const otherCats = categories.filter((c) => c.phaseGroup === 'OTHER');

        const conceptPop = conceptCats.filter((c) => c.isPopulated).length;
        const constructionPop = constructionCats.filter((c) => c.isPopulated).length;
        const otherPop = otherCats.filter((c) => c.isPopulated).length;

        const totalFolders = categories.length || 16;
        const populatedFolders = conceptPop + constructionPop + otherPop;
        const projMeta = projects.find((p) => p.projectCode === activeCode);

        setReport({
          projectCode: activeCode,
          projectName: projMeta?.name || activeCode,
          completionPercentage: Math.round((populatedFolders / 16) * 100),
          populatedFolders,
          totalFolders,
          phases: {
            concept: {
              populated: conceptPop,
              total: conceptCats.length || 6,
              percentage: Math.round((conceptPop / (conceptCats.length || 6)) * 100),
            },
            construction: {
              populated: constructionPop,
              total: constructionCats.length || 9,
              percentage: Math.round((constructionPop / (constructionCats.length || 9)) * 100),
            },
            other: {
              populated: otherPop,
              total: otherCats.length || 1,
              percentage: Math.round((otherPop / (otherCats.length || 1)) * 100),
            },
          },
          categories,
        });
      } else {
        setReport(null);
      }
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [activeCode, userRole, authHeaders, getAuthHeaders, projects]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Strict RBAC: Staff blocked from Progress Reports
  if (userRole === 'STAFF') {
    return (
      <div style={{ flex: 1, paddingBottom: '120px' }}>
        <div className="figma-subpage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="figma-back-btn" onClick={onBack}>
              <ChevronLeft size={24} />
            </button>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Progress Report</h2>
          </div>
        </div>
        <div style={{ padding: '44px 20px', textAlign: 'center' }}>
          <ShieldX size={48} color="#D92D20" style={{ margin: '0 auto 14px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>
            Progress Report Restricted
          </h3>
          <p style={{ fontSize: '13px', color: '#686869', margin: 0 }}>
            Executive milestone progress reports are restricted to Studio Admins and Client
            accounts.
          </p>
        </div>
      </div>
    );
  }

  const pct = report?.completionPercentage ?? 0;
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (pct / 100) * ringCircumference;

  const categories = (report?.categories || []).filter((c) =>
    phaseFilter === 'ALL' ? true : c.phaseGroup === phaseFilter
  );

  return (
    <div style={{ flex: 1, paddingBottom: '120px' }}>
      <div className="figma-subpage-header">
        <div className="figma-breadcrumbs">
          <span className="figma-breadcrumb-link" onClick={onBack}>
            Home
          </span>
          <span className="figma-breadcrumb-sep">&gt;</span>
          <span className="active">Progress Report</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <button type="button" className="figma-back-btn" onClick={onBack}>
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0C0C0D' }}>
              Project Progress
            </h2>
            <div style={{ fontSize: '12px', color: '#686869' }}>
              16-Folder Deliverable Tracking
            </div>
          </div>
        </div>

        {projects.length > 0 && (
          <select
            value={activeCode}
            onChange={(e) => {
              setActiveCode(e.target.value);
              onSelectProjectCode?.(e.target.value);
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              fontSize: '13px',
              fontWeight: 600,
              background: '#F9F9FB',
              color: '#0C0C0D',
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.projectCode}>
                {p.projectCode} — {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: '#686869' }}>
            <Loader2 size={28} color="#352618" className="animate-spin" style={{ margin: '0 auto 10px' }} />
            <div style={{ fontSize: '13px' }}>Calculating folder completion...</div>
          </div>
        ) : !report ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '18px',
              padding: '44px 20px',
              textAlign: 'center',
            }}
          >
            <TrendingUp size={36} color="#BF935A" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700 }}>
              No progress data available
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#686869' }}>
              Select an active project to inspect its 16-folder progress report.
            </p>
          </div>
        ) : (
          <>
            {/* Figma 756:10763 Overview Ring & Phase Cards */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                gap: '18px',
              }}
            >
              <svg width="104" height="104" viewBox="0 0 104 104" style={{ flexShrink: 0 }}>
                <circle
                  cx="52"
                  cy="52"
                  r={ringRadius}
                  fill="none"
                  stroke="#F2EDE6"
                  strokeWidth="10"
                />
                <circle
                  cx="52"
                  cy="52"
                  r={ringRadius}
                  fill="none"
                  stroke="#352618"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 52 52)"
                />
                <text
                  x="52"
                  y="56"
                  textAnchor="middle"
                  fontSize="20"
                  fontWeight="800"
                  fill="#0C0C0D"
                >
                  {pct}%
                </text>
              </svg>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#BF935A' }}>
                  {report.projectCode}
                </div>
                <h3 style={{ margin: '2px 0 6px', fontSize: '17px', fontWeight: 800, color: '#0C0C0D' }}>
                  {report.projectName}
                </h3>
                <div style={{ fontSize: '13px', color: '#4A4A4C' }}>
                  <strong>{report.populatedFolders}</strong> of <strong>16</strong> standard folders
                  populated
                </div>
              </div>
            </div>

            {/* 3-Phase Progress Bars */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '18px',
                border: '1px solid rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              {[
                {
                  label: 'Concept Phase',
                  icon: Compass,
                  data: report.phases.concept,
                  color: '#BF935A',
                },
                {
                  label: 'Construction Phase',
                  icon: HardHat,
                  data: report.phases.construction,
                  color: '#352618',
                },
                {
                  label: '03_OTHER',
                  icon: FolderArchive,
                  data: report.phases.other,
                  color: '#027A48',
                },
              ].map((phase) => {
                const Icon = phase.icon;
                return (
                  <div key={phase.label}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0C0C0D',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                        }}
                      >
                        <Icon size={15} color={phase.color} /> {phase.label}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#4A4A4C' }}>
                        {phase.data.populated}/{phase.data.total} ({phase.data.percentage}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        borderRadius: '99px',
                        background: '#F2F2F5',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${phase.data.percentage}%`,
                          height: '100%',
                          borderRadius: '99px',
                          background: phase.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Figma 756:10580 Category-Wise Breakdown */}
            <div style={{ display: 'flex', gap: '6px', background: '#F5F5F7', padding: '4px', borderRadius: '12px' }}>
              {[
                { id: 'ALL', label: 'All (16)' },
                { id: 'CONCEPT', label: 'Concept' },
                { id: 'CONSTRUCTION', label: 'Construction' },
                { id: 'OTHER', label: 'Other' },
              ].map((tab) => {
                const active = phaseFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPhaseFilter(tab.id as any)}
                    style={{
                      flex: 1,
                      padding: '7px 4px',
                      borderRadius: '9px',
                      border: 'none',
                      background: active ? '#352618' : 'transparent',
                      color: active ? '#FFFFFF' : '#4A4A4C',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categories.map((cat) => (
                <div
                  key={cat.categoryCode}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '9px',
                        background: cat.isPopulated ? '#ECFDF3' : '#F2F4F7',
                        color: cat.isPopulated ? '#027A48' : '#979798',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {cat.isPopulated ? <CheckCircle2 size={16} /> : <FolderKanban size={16} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#0C0C0D',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat.folderName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#686869' }}>{cat.phaseGroup}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: cat.isPopulated ? '#027A48' : '#686869',
                      flexShrink: 0,
                    }}
                  >
                    {cat.fileCount} {cat.fileCount === 1 ? 'file' : 'files'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
