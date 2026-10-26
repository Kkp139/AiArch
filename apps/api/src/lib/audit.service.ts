import { prisma } from './prisma';
import { UserRole } from '@prisma/client';

export interface AuditLogParams {
  actorId?: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  ipAddress?: string;
  tx?: any; // Optional Prisma transaction client (prisma.$transaction)
  throwOnError?: boolean; // When true, rethrows error to abort surrounding transaction
}

const REDACTED_KEYS = /password|hash|token|secret|otp|credential|auth|key|session|cookie/i;

/**
 * Sanitizes audit payload to guarantee that passwords, hashes, tokens,
 * API keys, session secrets, and OTP credentials NEVER get saved to the audit log.
 */
export function sanitizeAuditData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(item => sanitizeAuditData(item));
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (REDACTED_KEYS.test(key)) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeAuditData(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Enterprise Audit Trail Logger (Section 15.2 of Master Spec)
 * Records tamper-evident audit logs into PostgreSQL for all critical studio actions:
 * - Project creation, permission settings, and lifecycle status changes
 * - Design verification approvals and revision requests
 * - Payment registrations and discrepancy disputes
 * - Consultation slot bookings, reschedules, and cancellations
 * - User onboarding, project assignments, and security credential updates
 */
export async function recordAuditLog(params: AuditLogParams): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const cleanOldData = params.oldData ? sanitizeAuditData(params.oldData) : undefined;
    const cleanNewData = params.newData ? sanitizeAuditData(params.newData) : undefined;

    const dbClient = params.tx?.auditLog ? params.tx.auditLog : prisma.auditLog;

    const log = await dbClient.create({
      data: {
        actorId: params.actorId || undefined,
        actorName: params.actorName,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldData: cleanOldData,
        newData: cleanNewData,
        ipAddress: params.ipAddress || undefined,
      },
    });
    return { success: true, logId: log.id };
  } catch (err: any) {
    console.error('[AuditLog] Failed to persist audit log entry:', err);
    if (params.throwOnError) {
      throw err;
    }
    return { success: false, error: err?.message || 'Failed to record audit log' };
  }
}
