// Pure business-logic helpers for Announcements & Studio Policies.
// Parameter types use `string` so this module works regardless of which
// @prisma/client version (or mock) supplies the enum values to callers.

const UR = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CLIENT_LEADER: 'CLIENT_LEADER',
  CLIENT_VIEWER: 'CLIENT_VIEWER',
} as const;

const AA = {
  ALL: 'ALL',
  STAFF: 'STAFF',
  CLIENT_LEADERS: 'CLIENT_LEADERS',
  CLIENT_VIEWERS: 'CLIENT_VIEWERS',
} as const;

/**
 * Checks if a user's role grants access to an announcement with the specified audience.
 * Admin accounts can read all announcements regardless of audience.
 */
export function canUserReadAnnouncement(userRole: string, audience: string): boolean {
  if (userRole === UR.ADMIN) return true;
  if (audience === AA.ALL) return true;
  if (audience === AA.STAFF && userRole === UR.STAFF) return true;
  if (audience === AA.CLIENT_LEADERS && userRole === UR.CLIENT_LEADER) return true;
  if (audience === AA.CLIENT_VIEWERS && userRole === UR.CLIENT_VIEWER) return true;
  return false;
}

/**
 * Returns audience filters applicable for a given user role.
 */
export function getAudiencesForRole(role: string): string[] {
  if (role === UR.ADMIN) {
    return [AA.ALL, AA.STAFF, AA.CLIENT_LEADERS, AA.CLIENT_VIEWERS];
  }
  if (role === UR.STAFF) {
    return [AA.ALL, AA.STAFF];
  }
  if (role === UR.CLIENT_LEADER) {
    return [AA.ALL, AA.CLIENT_LEADERS];
  }
  if (role === UR.CLIENT_VIEWER) {
    return [AA.ALL, AA.CLIENT_VIEWERS];
  }
  return [AA.ALL];
}
