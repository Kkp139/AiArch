// Pure business-logic helpers for Staff Targets.
// Parameter types use `string` so this module works regardless of which
// @prisma/client version (or mock) supplies the enum values to callers.

const TS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED',
  COMPLETED: 'COMPLETED',
  OVERDUE: 'OVERDUE',
} as const;

const UR = {
  ADMIN: 'ADMIN',
  STAFF: 'STAFF',
  CLIENT_LEADER: 'CLIENT_LEADER',
  CLIENT_VIEWER: 'CLIENT_VIEWER',
} as const;

/**
 * Dynamically computes target status, ensuring that overdue targets
 * are accurately represented when due date passes before completion.
 */
export function computeEffectiveTargetStatus(status: string, dueDate: Date): string {
  if (status === TS.COMPLETED) {
    return TS.COMPLETED;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) {
    return TS.OVERDUE;
  }

  return status;
}

/**
 * Validates target status transition based on actor role.
 * Rule (Master Spec Section 10.2): Staff marks work complete and submits it for Admin review.
 * It becomes Completed ONLY after Admin approval. Staff cannot approve their own targets.
 */
export function validateTargetStatusTransition(
  userRole: string,
  currentStatus: string,
  targetStatus: string
): { allowed: boolean; error?: string } {
  // Clients are never permitted to touch targets
  if (userRole === UR.CLIENT_LEADER || userRole === UR.CLIENT_VIEWER) {
    return { allowed: false, error: 'Access denied: Clients cannot access staff productivity targets.' };
  }

  // Admin can perform all valid status transitions
  if (userRole === UR.ADMIN) {
    return { allowed: true };
  }

  // Staff transitions
  if (userRole === UR.STAFF) {
    // Staff CANNOT approve their own target to COMPLETED
    if (targetStatus === TS.COMPLETED) {
      return {
        allowed: false,
        error: 'Access denied: Staff members cannot approve their own completed targets. Submission for Admin review is required.',
      };
    }

    // Staff can start a target (PENDING -> IN_PROGRESS)
    if (currentStatus === TS.PENDING && targetStatus === TS.IN_PROGRESS) {
      return { allowed: true };
    }

    // Staff can submit for review (IN_PROGRESS or OVERDUE -> SUBMITTED)
    if ((currentStatus === TS.IN_PROGRESS || currentStatus === TS.OVERDUE) && targetStatus === TS.SUBMITTED) {
      return { allowed: true };
    }

    return {
      allowed: false,
      error: `Invalid status transition from ${currentStatus} to ${targetStatus} for Staff role.`,
    };
  }

  return { allowed: false, error: 'Unauthorized role.' };
}
