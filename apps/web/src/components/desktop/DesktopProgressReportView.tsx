import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
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

type PhaseFilter = 'ALL' | 'CONCEPT' | 'CONSTRUCTION' | 'OTHER';
type StatusFilter = 'ALL' | 'COMPLETED' | 'PENDING';

const PAGE_SIZE = 8;

function normalizePhaseGroup(phase: string | undefined): 'CONCEPT' | 'CONSTRUCTION' | 'OTHER' {
  const upper = (phase || '').toUpperCase();
  if (upper.startsWith('CONCEPT')) return 'CONCEPT';
  if (upper.startsWith('CONSTRUCTION')) return 'CONSTRUCTION';
  return 'OTHER';
}

function formatUpdatedTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export const DesktopProgressReportView: React.FC<DesktopProgressReportViewProps> = ({
  userRole,
  projects = [],
  selectedProjectCode,
  onSelectProject,
  onOpenVault,
  authHeaders,
}) => {
  const isStaff = userRole === 'STAFF';

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

  // Table filter, search, and pagination state
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (selectedProjectCode) {
      setActiveCode(selectedProjectCode);
    } else if (projects.length > 0 && !activeCode) {
      setActiveCode(projects[0].projectCode);
    }
  }, [selectedProjectCode, projects, activeCode]);

  // Reset pagination when filters or project change
  useEffect(() => {
    setCurrentPage(1);
  }, [phaseFilter, statusFilter, searchQuery, activeCode]);

  const buildReportFromVaultFolders = useCallback(
    (code: string, folders: any[]): ProgressReportData => {
      const proj = projects.find((p) => p.projectCode === code);
      const mapped: ProgressCategoryItem[] = OFFICIAL_16_FOLDERS.map((def) => {
        const match = folders.find(
          (f) => f.categoryCode === def.id || ((def as any).altCode && f.categoryCode === (def as any).altCode)
        );
        const count = match?.fileCount ?? match?.documentCount ?? match?.documents?.length ?? 0;
        const latestDoc = match?.documents?.[0];
        return {
          id: match?.id || match?.folderId || def.id,
          categoryCode: def.id,
          folderName: match?.folderName || def.name,
          phaseGroup: def.phase,
          fileCount: count,
          completed: count > 0,
          lastUpdated: match?.lastUpdatedAt || latestDoc?.createdAt || null,
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

  const normalizeApiReport = useCallback(
    (raw: any, code: string): ProgressReportData => {
      const proj = projects.find((p) => p.projectCode === code);
      const rawCategories: any[] = Array.isArray(raw.categories) ? raw.categories : [];
      const categories: ProgressCategoryItem[] = rawCategories.map((cat) => {
        const fileCount = Number(cat.documentCount ?? cat.fileCount ?? 0);
        const completed =
          typeof cat.isPopulated === 'boolean'
            ? cat.isPopulated
            : typeof cat.completed === 'boolean'
            ? cat.completed
            : fileCount > 0;
        return {
          id: cat.folderId || cat.id || cat.categoryCode,
          categoryCode: cat.categoryCode,
          folderName: cat.folderName,
          phaseGroup: normalizePhaseGroup(cat.phaseGroup),
          fileCount,
          completed,
          lastUpdated: cat.lastUpdatedAt ?? cat.lastUpdated ?? null,
        };
      });

      const totalCategories = Number(raw.totalCategories ?? (categories.length || 16));
      const completedCount = Number(
        raw.populatedCategories ?? raw.completedCount ?? categories.filter((c) => c.completed).length
      );
      const pendingCount = Number(
        raw.pendingCategories ?? raw.pendingCount ?? Math.max(0, totalCategories - completedCount)
      );
      const overallPercentage = Number(
        raw.completionPercentage ??
          raw.overallPercentage ??
          (totalCategories > 0 ? Math.round((completedCount / totalCategories) * 100) : 0)
      );

      const pb = raw.phaseBreakdown || raw.phases || {};
      const mapPhase = (
        p: any,
        groupKey: 'CONCEPT' | 'CONSTRUCTION' | 'OTHER',
        defaultTotal: number
      ) => {
        if (p && typeof p === 'object') {
          const total = Number(p.total ?? defaultTotal);
          const completed = Number(p.populated ?? p.completed ?? 0);
          const percentage = Number(
            p.percentage ?? (total > 0 ? Math.round((completed / total) * 100) : 0)
          );
          return { completed, total, percentage };
        }
        const items = categories.filter((c) => c.phaseGroup === groupKey);
        const total = items.length || defaultTotal;
        const completed = items.filter((c) => c.completed).length;
        return {
          completed,
          total,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      };

      return {
        projectCode: raw.projectCode || code,
        projectName: raw.projectName || proj?.name || code,
        overallPercentage,
        completedCount,
        pendingCount,
        totalCategories,
        phases: {
          concept: mapPhase(pb.concept, 'CONCEPT', 6),
          construction: mapPhase(pb.construction, 'CONSTRUCTION', 9),
          other: mapPhase(pb.other, 'OTHER', 1),
        },
        categories,
        updatedAt: raw.lastUpdatedAt ?? raw.updatedAt ?? null,
      };
    },
    [projects]
  );

  const fetchProgressReport = useCallback(async () => {
    if (isStaff || !activeCode) {
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
        if (data && Array.isArray(data.categories)) {
          setReport(normalizeApiReport(data, activeCode));
        } else if (data && Array.isArray(data.folders)) {
          setReport(buildReportFromVaultFolders(activeCode, data.folders));
        } else {
          setReport(null);
        }
      } else if (res.status === 404) {
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
  }, [isStaff, activeCode, resolveHeaders, normalizeApiReport, buildReportFromVaultFolders]);

  useEffect(() => {
    fetchProgressReport();
  }, [fetchProgressReport]);

  const phaseCounts = useMemo(() => {
    const cats = report?.categories ?? [];
    return {
      ALL: cats.length,
      CONCEPT: cats.filter((c) => normalizePhaseGroup(c.phaseGroup) === 'CONCEPT').length,
      CONSTRUCTION: cats.filter((c) => normalizePhaseGroup(c.phaseGroup) === 'CONSTRUCTION').length,
      OTHER: cats.filter((c) => normalizePhaseGroup(c.phaseGroup) === 'OTHER').length,
    };
  }, [report]);

  const totalFilesCount = useMemo(() => {
    return (report?.categories ?? []).reduce((sum, c) => sum + (c.fileCount || 0), 0);
  }, [report]);

  const filteredCategories = useMemo(() => {
    const cats = report?.categories ?? [];
    const q = searchQuery.trim().toLowerCase();
    return cats.filter((cat) => {
      const normalizedPhase = normalizePhaseGroup(cat.phaseGroup);
      if (phaseFilter !== 'ALL' && normalizedPhase !== phaseFilter) return false;
      if (statusFilter === 'COMPLETED' && !cat.completed) return false;
      if (statusFilter === 'PENDING' && cat.completed) return false;
      if (
        q &&
        !cat.folderName.toLowerCase().includes(q) &&
        !cat.categoryCode.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report, phaseFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedCategories = filteredCategories.slice(
    pageStartIndex,
    pageStartIndex + PAGE_SIZE
  );

  // Strict RBAC: Staff cannot access Progress Report
  if (isStaff) {
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
          {/* 4 Summary Metric Cards (Figma 929:43198) */}
          <div className="desk-metrics-row" data-testid="progress-summary-cards">
            <div className="desk-metric-tile">
              <div className="desk-metric-tile-icon">
                <Target size={22} />
              </div>
              <div>
                <div className="desk-metric-tile-label">Overall Progress</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span className="desk-metric-tile-value">{report.overallPercentage}%</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: report.overallPercentage >= 50 ? 'var(--desk-success)' : 'var(--desk-gold-dark)',
                    }}
                  >
                    {report.overallPercentage >= 50 ? 'On track' : 'In progress'}
                  </span>
                </div>
                <div className="desk-metric-tile-sub">
                  {report.completedCount} of {report.totalCategories} categories complete
                </div>
              </div>
            </div>

            <div className="desk-metric-tile">
              <div className="desk-metric-tile-icon green">
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
                <div className="desk-metric-tile-sub">
                  {totalFilesCount} {totalFilesCount === 1 ? 'file' : 'files'} across folders
                </div>
              </div>
            </div>
          </div>

          {/* Middle Split: Donut Chart + Phase Breakdown Cards (Figma 929:43236) */}
          <div className="desk-progress-split">
            <div className="desk-panel" data-testid="progress-donut-card">
              <div className="desk-panel-header">
                <span className="desk-panel-title">Project Completion</span>
                <span className={`desk-pill ${report.overallPercentage >= 50 ? 'green' : 'amber'}`}>
                  {report.overallPercentage >= 50 ? <CheckCircle2 size={12} /> : <Clock size={12} />}{' '}
                  {report.overallPercentage >= 50 ? 'On track' : 'In progress'}
                </span>
              </div>

              <div className="desk-donut-wrap">
                <div
                  style={{
                    position: 'relative',
                    width: '156px',
                    height: '156px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="156" height="156" viewBox="0 0 148 148">
                    <circle
                      cx="74"
                      cy="74"
                      r={radius}
                      fill="none"
                      stroke="#EFEAE4"
                      strokeWidth="15"
                    />
                    <circle
                      cx="74"
                      cy="74"
                      r={radius}
                      fill="none"
                      stroke="#BF935A"
                      strokeWidth="15"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 74 74)"
                    />
                  </svg>
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: '26px',
                        fontWeight: 700,
                        color: 'var(--desk-text-primary)',
                        lineHeight: 1.1,
                      }}
                    >
                      {report.overallPercentage}%
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--desk-text-secondary)',
                        marginTop: '3px',
                      }}
                    >
                      {report.completedCount} of {report.totalCategories}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: '180px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    fontSize: '13.5px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--desk-text-secondary)' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#BF935A', display: 'inline-block' }} />
                      Completed
                    </span>
                    <strong>{report.completedCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--desk-text-secondary)' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#EFEAE4', display: 'inline-block' }} />
                      Pending
                    </span>
                    <strong>{report.pendingCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--desk-text-secondary)' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#686869', display: 'inline-block' }} />
                      Total categories
                    </span>
                    <strong>{report.totalCategories}</strong>
                  </div>
                  {report.updatedAt && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--desk-text-muted)',
                        paddingTop: '6px',
                      }}
                    >
                      <Calendar size={13} />
                      <span>Updated {formatUpdatedTimestamp(report.updatedAt)}</span>
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

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  justifyContent: 'center',
                  flex: 1,
                }}
              >
                {[
                  { key: 'CONCEPT' as PhaseFilter, label: 'Concept Design', data: report.phases.concept, icon: Folder },
                  { key: 'CONSTRUCTION' as PhaseFilter, label: 'Construction Design', data: report.phases.construction, icon: Layers },
                  { key: 'OTHER' as PhaseFilter, label: '03_OTHER', data: report.phases.other, icon: Layers },
                ].map((phase) => {
                  const IconComp = phase.icon;
                  const isActivePhase = phaseFilter === phase.key;
                  return (
                    <div
                      key={phase.key}
                      role="button"
                      tabIndex={0}
                      onClick={() => setPhaseFilter(isActivePhase ? 'ALL' : phase.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setPhaseFilter(isActivePhase ? 'ALL' : phase.key);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '6px 8px',
                        margin: '-6px -8px',
                        borderRadius: '10px',
                        background: isActivePhase ? 'rgba(191, 147, 90, 0.08)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      title={`Filter table by ${phase.label}`}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            className="desk-soft-icon-box"
                            style={{ width: '36px', height: '36px', borderRadius: '8px' }}
                          >
                            <IconComp size={17} />
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{phase.label}</span>
                        </div>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--desk-gold-dark)' }}>
                          {phase.data.completed}/{phase.data.total} · {phase.data.percentage}%
                        </span>
                      </div>
                      <div className="desk-progress-track" style={{ height: '7px' }}>
                        <div
                          className="desk-progress-fill"
                          style={{ width: `${phase.data.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category-wise Progress Table (Figma 929:43304 + 931:44332) */}
          <div className="desk-table-card" data-testid="progress-categories-table">
            <div
              style={{
                padding: '18px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid var(--desk-border-subtle)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                  Category-wise Progress
                </h2>
                <p style={{ fontSize: '12.5px', color: 'var(--desk-text-secondary)', margin: '3px 0 0 0' }}>
                  Canonical 16 architectural folders. Click any category to open its vault folder.
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

            {/* Filter Tabs + Search + Status Filter */}
            <div
              style={{
                padding: '14px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid var(--desk-border-subtle)',
              }}
            >
              <div className="desk-pill-tabs" data-testid="progress-phase-tabs">
                {(
                  [
                    { key: 'ALL', label: `All (${phaseCounts.ALL})` },
                    { key: 'CONCEPT', label: `Concept (${phaseCounts.CONCEPT})` },
                    { key: 'CONSTRUCTION', label: `Construction (${phaseCounts.CONSTRUCTION})` },
                    { key: 'OTHER', label: `Other (${phaseCounts.OTHER})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`desk-pill-tab ${phaseFilter === tab.key ? 'active' : ''}`}
                    onClick={() => setPhaseFilter(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <div className="desk-filter-search" style={{ minWidth: '220px', padding: '7px 12px' }}>
                  <Search size={15} color="#686869" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search categories..."
                    aria-label="Search categories"
                    data-testid="progress-category-search"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  aria-label="Filter by status"
                  data-testid="progress-status-filter"
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--desk-border-strong)',
                    background: 'var(--desk-white)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--desk-text-primary)',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="ALL">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
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
                  {paginatedCategories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: 'center',
                          padding: '28px 16px',
                          color: 'var(--desk-text-secondary)',
                        }}
                      >
                        No categories match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedCategories.map((cat) => {
                      const originalIndex = report.categories.findIndex(
                        (c) => (c.id || c.categoryCode) === (cat.id || cat.categoryCode)
                      );
                      const rowNum = originalIndex >= 0 ? originalIndex + 1 : 1;
                      const normalizedPhase = normalizePhaseGroup(cat.phaseGroup);
                      return (
                        <tr
                          key={cat.id || cat.categoryCode}
                          onClick={() => onOpenVault?.(report.projectCode, cat.categoryCode)}
                          style={{ cursor: onOpenVault ? 'pointer' : 'default' }}
                        >
                          <td style={{ color: 'var(--desk-text-muted)', fontWeight: 600 }}>
                            {String(rowNum).padStart(2, '0')}
                          </td>
                          <td style={{ fontWeight: 600 }}>{cat.folderName}</td>
                          <td>
                            <span className="desk-pill gold">
                              {normalizedPhase === 'CONCEPT'
                                ? 'Concept Design'
                                : normalizedPhase === 'CONSTRUCTION'
                                ? 'Construction Design'
                                : '03_OTHER'}
                            </span>
                          </td>
                          <td>
                            {cat.fileCount} {cat.fileCount === 1 ? 'file' : 'files'}
                          </td>
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
                            {formatUpdatedTimestamp(cat.lastUpdated)}
                          </td>
                          <td>
                            {onOpenVault && (
                              <button
                                type="button"
                                className="desk-btn desk-btn-sm desk-btn-secondary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenVault(report.projectCode, cat.categoryCode);
                                }}
                              >
                                Open Folder
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar (Figma 929:43385) */}
            {filteredCategories.length > 0 && (
              <div
                className="desk-table-pagination"
                style={{ justifyContent: 'space-between' }}
                data-testid="progress-pagination"
              >
                <span style={{ fontSize: '13px', color: 'var(--desk-text-secondary)' }}>
                  Showing {pageStartIndex + 1}–
                  {Math.min(pageStartIndex + PAGE_SIZE, filteredCategories.length)} of{' '}
                  {filteredCategories.length} categories
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid var(--desk-border-subtle)',
                      background: 'var(--desk-white)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: safePage <= 1 ? 'not-allowed' : 'pointer',
                      opacity: safePage <= 1 ? 0.45 : 1,
                    }}
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border:
                          pageNum === safePage
                            ? '1px solid var(--desk-gold-border)'
                            : '1px solid transparent',
                        background: pageNum === safePage ? '#F9F4EF' : 'transparent',
                        color: pageNum === safePage ? '#695132' : '#686869',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid var(--desk-border-subtle)',
                      background: 'var(--desk-white)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: safePage >= totalPages ? 'not-allowed' : 'pointer',
                      opacity: safePage >= totalPages ? 0.45 : 1,
                    }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
