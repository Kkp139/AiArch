/**
 * Standalone enum definitions that mirror the Prisma schema.
 * Importing from here instead of @prisma/client means pure-logic tests
 * can run without `prisma generate` having been executed first.
 * These values MUST stay in sync with apps/api/prisma/schema.prisma.
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CLIENT_LEADER = 'CLIENT_LEADER',
  CLIENT_VIEWER = 'CLIENT_VIEWER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
}

export enum ProjectStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum DownloadPermission {
  VIEW_ONLY = 'VIEW_ONLY',
  VIEW_AND_DOWNLOAD = 'VIEW_AND_DOWNLOAD',
}

export enum VerificationStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
}

export enum MeetingType {
  OFFICE_MEETING = 'OFFICE_MEETING',
  SITE_VISIT = 'SITE_VISIT',
}

export enum MeetingStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  RESCHEDULE_PENDING = 'RESCHEDULE_PENDING',
  CANCELLED = 'CANCELLED',
}

export enum TimeSlot {
  SLOT_12_00_13_30 = 'SLOT_12_00_13_30',
  SLOT_16_00_17_30 = 'SLOT_16_00_17_30',
  SLOT_18_00_19_30 = 'SLOT_18_00_19_30',
}

export enum PaymentMode {
  CHEQUE = 'CHEQUE',
  UPI = 'UPI',
  NEFT_RTGS = 'NEFT_RTGS',
  CASH = 'CASH',
}

export enum PaymentStatus {
  PENDING_CLEARANCE = 'PENDING_CLEARANCE',
  CONFIRMED = 'CONFIRMED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
}

export enum AnnouncementAudience {
  ALL = 'ALL',
  STAFF = 'STAFF',
  CLIENT_LEADERS = 'CLIENT_LEADERS',
  CLIENT_VIEWERS = 'CLIENT_VIEWERS',
}

export enum TargetStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export enum ReminderPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  NORMAL = 'NORMAL',
}

export enum RegularizationType {
  REGULARIZATION = 'REGULARIZATION',
  LEAVE = 'LEAVE',
}

export enum ReviewStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DeviceApprovalStatus {
  PENDING = 'PENDING',
  TRUSTED = 'TRUSTED',
  REVOKED = 'REVOKED',
}
