export type AuthHeadersInput = Record<string, string> | (() => Record<string, string>);

/**
 * Resolves Authorization headers from an explicit headers object, getter callback,
 * or persisted session token in localStorage.
 */
export function resolveAuthHeaders(
  headersOrGetter?: AuthHeadersInput,
  includeJsonContentType = false
): Record<string, string> {
  const base: Record<string, string> = {};

  if (typeof headersOrGetter === 'function') {
    Object.assign(base, headersOrGetter());
  } else if (headersOrGetter) {
    Object.assign(base, headersOrGetter);
  }

  if (!base.Authorization && !base.authorization && typeof window !== 'undefined') {
    const token = window.localStorage.getItem('pronex_auth_token');
    if (token) {
      base.Authorization = `Bearer ${token}`;
    }
  }

  if (includeJsonContentType && !base['Content-Type']) {
    base['Content-Type'] = 'application/json';
  }

  return base;
}

/**
 * Formats an integer/number INR amount cleanly using Indian numbering system.
 */
export function formatInrAmount(amount?: number | null): string {
  const safe = Number(amount ?? 0);
  if (!Number.isFinite(safe)) return '₹ 0';
  return `₹ ${safe.toLocaleString('en-IN')}`;
}

/**
 * Formats an INR amount concisely (Cr / L / full) for dashboard summary cards.
 */
export function formatInrCompact(amount?: number | null): string {
  const safe = Number(amount ?? 0);
  if (!Number.isFinite(safe) || safe === 0) return '₹ 0';
  if (Math.abs(safe) >= 10000000) {
    return `₹ ${(safe / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(safe) >= 100000) {
    return `₹ ${(safe / 100000).toFixed(2)} L`;
  }
  return `₹ ${safe.toLocaleString('en-IN')}`;
}

/**
 * Normalizes backend date strings safely for display.
 */
export function formatShortDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatShortDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function isMobileClientRole(role?: string): boolean {
  return role === 'CLIENT_LEADER' || role === 'CLIENT_VIEWER';
}
