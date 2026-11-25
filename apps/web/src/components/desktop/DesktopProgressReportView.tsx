import React, { useState, useEffect, useCallback } from 'react';
import { UserRole } from '../../context/AuthContext';
import type { ProjectSummary } from '../../App';
import {
  Target,
  CheckCircle2,
  Hourglass,
  Layers,
  Folder,
  ArrowRight,
  Calendar,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { OFFICIAL_16_FOLDERS } from './DesktopProjectsView';
import './desktop.css';

export interface ProgressCategoryItem {
  id: string;
  categoryCode: string;
  folderName: string;
  phaseGroup: 'CONCEPT' | 'CONSTRUCTION' | 'OTHER' | string;
  fileCount: number;
  completed: boolean;
  lastUpdated?: string | null;
}

export interface ProgressReportData {
  projectCode: string;
  projectName: string;
  overallPercentage: number;
  completedCount: number;
  pendingCount: number;
  totalCategories: number;
  phases: {
    concept: { completed: number; total: number; percentage: number };
    construction: { completed: number; total: number; percentage: number };
    other: { completed: number; total: number; percentage: number };
  };
  categories: ProgressCategoryItem[];
  updatedAt?: string | null;
}

export interface DesktopProgressReportViewProps {
  userRole: UserRole;
  projects?: ProjectSummary[];
  selectedProjectCode?: string;
  onSelectProject?: (projectCode: string) => void;
  onOpenVault?: (projectCode: string, categoryCode?: string) => void;
  authHeaders?: Record<string, string> | (() => Record<string, string>);
}

export const DesktopProgressReportView: React.FC<DesktopProgressReportViewProps> = ({
  userRole,
  projects = [],
  selectedProjectCode,
  onSelectProject,
  onOpenVault,
  authHeaders,
}) => {
  // Strict RBAC: Staff cannot access Progress Report
  if (userRole === 'STAFF') {
    return (
      <div className="desk-restricted-card" data-testid="progress-staff-restricted">
        <div className="desk-restricted-icon-box">
          <ShieldAlert size={36} color="#D92D20" />
        </div>
        <h2 className="desk-restricted-title">Access Restricted</h2>
        <p className="desk-restricted-desc">
          Progress reports are reserved for Studio Administrators and Clients.
        </p>
      </div>
    );
  }

  const resolveHeaders = useCallback((): Record<string, string> => {
    if (typeof authHeaders === 'function') return authHeaders();
    if (authHeaders) return authHeaders;
    const token = typeof window !== 'undefined' ? localStorage.getItem('pronex_auth_token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, [authHeaders]);

  const [activeCode, setActiveCode] = useState<string>(
    selectedProjectCode || projects[0]?.projectCode || ''
  );
  const [report, setReport] = useState<ProgressReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProjectCode) {
      setActiveCode(selectedProjectCode);
    } else if (projects.length > 0 && !activeCode) {
      setActiveCode(projects[0].projectCode);
    }
  }, [selectedProjectCode, projects, activeCode]);

  const buildReportFromVaultFolders = useCallback(
    (code: string, folders: any[]): ProgressReportData => {
      const proj = projects.find((p) => p.projectCode === code);
      const mapped: ProgressCategoryItem[] = OFFICIAL_16_FOLDERS.map((def, idx) => {
        const match = folders.find(
          (f) => f.categoryCode === def.id || ((def as any).altCode && f.categoryCode === (def as any).altCode)
        );
        const count = match?.fileCount ?? match?.documents?.length ?? 0;
        const latestDoc = match?.documents?.[0];
        return {
          id: match?.id || def.id,
          categoryCode: def.id,
          folderName: match?.folderName || def.name,
          phaseGroup: def.phase,
          fileCount: count,
          completed: count > 0,
          lastUpdated: latestDoc?.createdAt || null,
        };
      });

      const completedCount = mapped.filter((c) => c.completed).length;
      const totalCategories = 16;
      const conceptItems = mapped.filter((c) => c.phaseGroup === 'CONCEPT');
      const constructionItems = mapped.filter((c) => c.phaseGroup === 'CONSTRUCTION');
      const otherItems = mapped.filter((c) => c.phaseGroup === 'OTHER');

      const cDone = conceptItems.filter((c) => c.completed).length;
      const conDone = constructionItems.filter((c) => c.completed).length;
      const oDone = otherItems.filter((c) => c.completed).length;

      return {
        projectCode: code,
        projectName: proj?.name || code,
        overallPercentage: Math.round((completedCount / totalCategories) * 100),
        completedCount,
        pendingCount: totalCategories - completedCount,
        totalCategories,
        phases: {
          concept: { completed: cDone, total: 6, percentage: Math.round((cDone / 6) * 100) },
          construction: { completed: conDone, total: 9, percentage: Math.round((conDone / 9) * 100) },
          other: { completed: oDone, total: 1, percentage: Math.round((oDone / 1) * 100) },
        },
        categories: mapped,
        updatedAt: new Date().toISOString(),
      };
    },
    [projects]
  );

  const fetchProgressReport = useCallback(async () => {
    if (!activeCode) {
      setReport(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(activeCode)}/progress-report`,
        { headers: resolveHeaders() }
      );
      if (res.ok) {
        const data = await res.json();
        // Support structured response directly or normalize folders array
        if (data && Array.isArray(data.categories)) {
          setReport(data);
        } else if (data && Array.isArray(data.folders)) {
          setReport(buildReportFromVaultFolders(activeCode, data.folders));
        } else {
          setReport(null);
        }
      } else if (res.status === 404) {
        // Fallback to real vault documents endpoint to compute live 16-folder progress
        const vaultRes = await fetch(
          `/api/vault/projects/${encodeURIComponent(activeCode)}/documents`,
          { headers: resolveHeaders() }
        );
        if (vaultRes.ok) {
          const vaultData = await vaultRes.json();
          setReport(buildReportFromVaultFolders(activeCode, vaultData.folders || []));
        } else {
          setError('Unable to load progress report for this project.');
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to load progress report.');
      }
    } catch {
      setError('Network error loading progress report.');
    } finally {
      setIsLoading(false);
    }
  }, [activeCode, resolveHeaders, buildReportFromVaultFolders]);

  useEffect(() => {
    fetchProgressReport();
  }, [fetchProgressReport]);

  const pct = report?.overallPercentage ?? 0;
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div data-testid="desktop-progress-report-view">
      {/* Header + Project Selector (Figma 929:43098) */}
      <div className="desk-page-header">
        <div>
          <h1 className="desk-page-title">Progress Report</h1>
          <p className="desk-page-subtitle">
            Monitor project completion and track drawing progress across all 16 standard folders.
          </p>
        </div>

        <div className="desk-header-actions">
          {projects.length > 0 && (
            <div
              className="desk-card"
              style={{
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                borderRadius: '12px',
              }}
            >
              <Folder size={18} color="#BF935A" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--desk-text-muted)', fontWeight: 600 }}>
                  Project
                </span>
                <select
                  value={activeCode}
                  onChange={(e) => {
                    setActiveCode(e.target.value);
                    onSelectProject?.(e.target.value);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    color: 'var(--desk-text-primary)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  data-testid="progress-project-selector"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.projectCode}>
                      {p.name} ({p.projectCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="button"
            className="desk-btn desk-btn-secondary"
            onClick={fetchProgressReport}
            disabled={isLoading}
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <div className="desk-banner error">{error}</div>}

      {!activeCode && projects.length === 0 ? (
        <div className="desk-empty-card">
          <Layers size={36} color="#979798" />
          <div style={{ fontSize: '15px', fontWeight: 700 }}>No Projects Available</div>
          <div style={{ fontSize: '13px', color: 'var(--desk-text-secondary)' }}>
            Assigned architectural projects will display 16-category progress here.
          </div>
        </div>
      ) : isLoading && !report ? (
        <div className="desk-empty-card">Loading 16-category progress telemetry...</div>
      ) : report ? (
        <>
          {/* 4 Summary Cards */}
          <div className="desk-metrics-row" data-testid="progress-summary-cards">
            <div className="desk-metric-tile">
              <div className="desk-metric-tile-icon">
                <Target size={22} />
              </div>
              <div>
                <div className="desk-metric-tile-label">Overall Progress</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="desk-metric-tile-value">{report.overallPercentage}%</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--desk-success)' }}>
                    {report.overallPercentage >= 50 ? 'On track' : 'In progress'}
                  </span>
                </div>
                <div className="desk-metric-tile-sub">
                  {report.completedCount} of {report.totalCategories} categories complete
                </div>
              </div>
            </div>

            <div className="desk-metric-tile">
              <div className="desk-metric-tile-icon">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <div className="desk-metric-tile-label">Completed</div>
                <div className="desk-metric-tile-value">{report.completedCount}</div>
                <div className="desk-metric-tile-sub">Categories populated</div>
              </div>
            </div>

            <div className="desk-metric-tile">
              <div className="desk-metric-tile-icon">
                <Hourglass size={22} />
              </div>
              <div>
                <div className="desk-metric-tile-label">Pending</div>
                <div className="desk-metric-tile-value">{report.pendingCount}</div>
                <div className="desk-metric-tile-sub">Categories awaiting files</div>
              </div>
            </div>

            <div className="desk-metric-tile">
              <div className="desk-metric-tile-icon">
                <Layers size={22} />
              </div>
              <div>
                <div className="desk-metric-tile-label">Total</div>
                <div className="desk-metric-tile-value">{report.totalCategories}</div>
                <div className="desk-metric-tile-sub">Standard Categories</div>
              </div>
            </div>
          </div>

          {/* Middle Split: Donut Chart + Phase Bars */}
          <div className="desk-progress-split">
            <div className="desk-panel" data-testid="progress-donut-card">
              <div className="desk-panel-header">
                <span className="desk-panel-title">Project Completion</span>
                <span className="desk-pill green">
                  <CheckCircle2 size={12} /> {report.overallPercentage >= 50 ? 'On track' : 'Active'}
                </span>
              </div>

              <div className="desk-donut-wrap">
                <div style={{ position: 'relative', width: '148px', height: '148px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="148" height="148" viewBox="0 0 148 148">
                    <circle
                      cx="74"
                      cy="74"
                      r={radius}
                      fill="none"
                      stroke="#EFEAE4"
                      strokeWidth="16"
                    />
                    <circle
                      cx="74"
                      cy="74"
                      r={radius}
                      fill="none"
                      stroke="#BF935A"
                      strokeWidth="16"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 74 74)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: '26px', fontWeight: 700, color: 'var(--desk-text-primary)', lineHeight: 1.1 }}>
                      {report.overallPercentage}%
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--desk-text-secondary)', marginTop: '3px' }}>
                      {report.completedCount} of {report.totalCategories}
                    </div>
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--desk-text-secondary)' }}>● Completed</span>
                    <strong>{report.completedCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--desk-text-secondary)' }}>○ Pending</span>
                    <strong>{report.pendingCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--desk-text-secondary)' }}>● Total categories</span>
                    <strong>{report.totalCategories}</strong>
                  </div>
                  {report.updatedAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--desk-text-muted)', paddingTop: '6px' }}>
                      <Calendar size={13} />
                      <span>Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="desk-panel" data-testid="progress-phase-bars">
              <div className="desk-panel-header">
                <span className="desk-panel-title">Progress by Category Phase</span>
                <span style={{ fontSize: '12px', color: 'var(--desk-text-muted)' }}>Completed / total</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', justifyContent: 'center', flex: 1 }}>
                {[
                  { label: 'Concept Design', data: report.phases.concept },
                  { label: 'Construction Design', data: report.phases.construction },
                  { label: '03_OTHER', data: report.phases.other },
                ].map((phase) => (
                  <div key={phase.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="desk-soft-icon-box" style={{ width: '34px', height: '34px', borderRadius: '8px' }}>
                          <Folder size={16} />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{phase.label}</span>
                      </div>
                      <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--desk-gold-dark)' }}>
                        {phase.data.completed}/{phase.data.total} • {phase.data.percentage}%
                      </span>
                    </div>
                    <div className="desk-progress-track" style={{ height: '8px' }}>
                      <div className="desk-progress-fill" style={{ width: `${phase.data.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 16-Category Breakdown Table */}
          <div className="desk-table-card" data-testid="progress-categories-table">
            <div style={{ padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--desk-border-subtle)' }}>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                  16-Category Folder Activity
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--desk-text-secondary)', margin: '3px 0 0 0' }}>
                  Canonical architectural folders and current completion status.
                </p>
              </div>
              {onOpenVault && (
                <button
                  type="button"
                  className="desk-btn desk-btn-sm desk-btn-soft-gold"
                  onClick={() => onOpenVault(report.projectCode)}
                >
                  <span>Open Project Vault</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>

            <div className="desk-table-scroll">
              <table className="desk-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Category</th>
                    <th>Phase</th>
                    <th>Files</th>
                    <th>Status</th>
                    <th>Last Updated</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {report.categories.map((cat, idx) => (
                    <tr key={cat.id || cat.categoryCode}>
                      <td style={{ color: 'var(--desk-text-muted)', fontWeight: 600 }}>
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{cat.folderName}</td>
                      <td>
                        <span className="desk-pill gold">
                          {cat.phaseGroup === 'CONCEPT'
                            ? 'Concept Design'
                            : cat.phaseGroup === 'CONSTRUCTION'
                            ? 'Construction Design'
                            : '03_OTHER'}
                        </span>
                      </td>
                      <td>{cat.fileCount}</td>
                      <td>
                        {cat.completed ? (
                          <span className="desk-pill green">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        ) : (
                          <span className="desk-pill amber">
                            <Hourglass size={12} /> Pending
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--desk-text-secondary)' }}>
                        {cat.lastUpdated ? new Date(cat.lastUpdated).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {onOpenVault && (
                          <button
                            type="button"
                            className="desk-btn desk-btn-sm desk-btn-secondary"
                            onClick={() => onOpenVault(report.projectCode, cat.categoryCode)}
                          >
                            Open Folder
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
