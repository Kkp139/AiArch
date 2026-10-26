import { TargetStatus, UserRole } from '@prisma/client';

/**
 * Dynamically computes target status, ensuring that overdue targets
 * are accurately represented when due date passes before completion.
 */
export function computeEffectiveTargetStatus(status: TargetStatus, dueDate: Date): TargetStatus {
  if (status === TargetStatus.COMPLETED) {
    return TargetStatus.COMPLETED;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  if (due.getTime() < today.getTime()) {
    return TargetStatus.OVERDUE;
  }

  return status;
}

/**
 * Validates target status transition based on actor role.
 * Rule (Master Spec Section 10.2): Staff marks work complete and submits it for Admin review.
 * It becomes Completed ONLY after Admin approval. Staff cannot approve their own targets.
 */
export function validateTargetStatusTransition(
  userRole: UserRole,
  currentStatus: TargetStatus,
  targetStatus: TargetStatus
): { allowed: boolean; error?: string } {
  // Clients are never permitted to touch targets
  if (userRole === UserRole.CLIENT_LEADER || userRole === UserRole.CLIENT_VIEWER) {
    return { allowed: false, error: 'Access denied: Clients cannot access staff productivity targets.' };
  }

  // Admin can perform all valid status transitions
  if (userRole === UserRole.ADMIN) {
    return { allowed: true };
  }

  // Staff transitions
  if (userRole === UserRole.STAFF) {
    // Staff CANNOT approve their own target to COMPLETED
    if (targetStatus === TargetStatus.COMPLETED) {
      return {
        allowed: false,
        error: 'Access denied: Staff members cannot approve their own completed targets. Submission for Admin review is required.',
      };
    }

    // Staff can start a target (PENDING -> IN_PROGRESS)
    if (currentStatus === TargetStatus.PENDING && targetStatus === TargetStatus.IN_PROGRESS) {
      return { allowed: true };
    }

    // Staff can submit for review (IN_PROGRESS or OVERDUE -> SUBMITTED)
    if ((currentStatus === TargetStatus.IN_PROGRESS || currentStatus === TargetStatus.OVERDUE) && targetStatus === TargetStatus.SUBMITTED) {
      return { allowed: true };
    }

    return {
      allowed: false,
      error: `Invalid status transition from ${currentStatus} to ${targetStatus} for Staff role.`,
    };
  }

  return { allowed: false, error: 'Unauthorized role.' };
}
