import { UserRole, AnnouncementAudience } from '@prisma/client';

/**
 * Checks if a user's role grants access to an announcement with the specified audience.
 * Admin accounts can read all announcements regardless of audience.
 */
export function canUserReadAnnouncement(userRole: UserRole, audience: AnnouncementAudience): boolean {
  if (userRole === UserRole.ADMIN) return true;
  if (audience === AnnouncementAudience.ALL) return true;
  if (audience === AnnouncementAudience.STAFF && userRole === UserRole.STAFF) return true;
  if (audience === AnnouncementAudience.CLIENT_LEADERS && userRole === UserRole.CLIENT_LEADER) return true;
  if (audience === AnnouncementAudience.CLIENT_VIEWERS && userRole === UserRole.CLIENT_VIEWER) return true;
  return false;
}

/**
 * Returns audience filters applicable for a given user role.
 */
export function getAudiencesForRole(role: UserRole): AnnouncementAudience[] {
  if (role === UserRole.ADMIN) {
    return [
      AnnouncementAudience.ALL,
      AnnouncementAudience.STAFF,
      AnnouncementAudience.CLIENT_LEADERS,
      AnnouncementAudience.CLIENT_VIEWERS,
    ];
  }
  if (role === UserRole.STAFF) {
    return [AnnouncementAudience.ALL, AnnouncementAudience.STAFF];
  }
  if (role === UserRole.CLIENT_LEADER) {
    return [AnnouncementAudience.ALL, AnnouncementAudience.CLIENT_LEADERS];
  }
  if (role === UserRole.CLIENT_VIEWER) {
    return [AnnouncementAudience.ALL, AnnouncementAudience.CLIENT_VIEWERS];
  }
  return [AnnouncementAudience.ALL];
}
