import { describe, it, expect, vi } from 'vitest';
import { sanitizeAuditData, recordAuditLog } from '../src/lib/audit.service';
import { prisma } from '../src/lib/prisma';

describe('Audit Logging System (Section 15.2 & PO Remediation Directive)', () => {
  it('strictly redacts passwords, passwordHash, setupToken, and OTP from audit payloads', () => {
    const rawPayload = {
      username: 'samir_architect',
      role: 'STAFF',
      password: 'superSecretPassword123!',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
      setupToken: 'token_xyz_48h',
      otp: '482910',
      nested: {
        adminSecret: 'sensitive_key_val',
        publicNote: 'Approved for client submission',
      },
      list: [
        { credentialId: 'cred_1', action: 'ALLOW' },
      ],
    };

    const sanitized = sanitizeAuditData(rawPayload);

    expect(sanitized.username).toBe('samir_architect');
    expect(sanitized.role).toBe('STAFF');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.passwordHash).toBe('[REDACTED]');
    expect(sanitized.setupToken).toBe('[REDACTED]');
    expect(sanitized.otp).toBe('[REDACTED]');
    expect(sanitized.nested.adminSecret).toBe('[REDACTED]');
    expect(sanitized.nested.publicNote).toBe('Approved for client submission');
    expect(sanitized.list[0].credentialId).toBe('[REDACTED]');
    expect(sanitized.list[0].action).toBe('ALLOW');
  });

  it('safely handles null and undefined audit payloads', () => {
    expect(sanitizeAuditData(null)).toBe(null);
    expect(sanitizeAuditData(undefined)).toBe(undefined);
  });

  it('records audit log with sanitized data and returns success', async () => {
    const createSpy = vi.spyOn(prisma.auditLog, 'create').mockResolvedValueOnce({
      id: 'audit-log-uuid-1',
      actorId: 'admin-uuid',
      actorName: 'Admin User',
      actorRole: 'ADMIN',
      action: 'APPROVE_DRAWING',
      entityType: 'DESIGN_VERIFICATION',
      entityId: 'verif-123',
      oldData: null,
      newData: { status: 'APPROVED' },
      ipAddress: '127.0.0.1',
      createdAt: new Date(),
    } as any);

    const result = await recordAuditLog({
      actorId: 'admin-uuid',
      actorName: 'Admin User',
      actorRole: 'ADMIN',
      action: 'APPROVE_DRAWING',
      entityType: 'DESIGN_VERIFICATION',
      entityId: 'verif-123',
      newData: { status: 'APPROVED', password: 'secret' },
    });

    expect(result.success).toBe(true);
    expect(result.logId).toBe('audit-log-uuid-1');
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'APPROVE_DRAWING',
          newData: { status: 'APPROVED', password: '[REDACTED]' },
        }),
      })
    );
    createSpy.mockRestore();
  });

  it('gracefully handles database failure without throwing unhandled exceptions when throwOnError is false', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const createSpy = vi.spyOn(prisma.auditLog, 'create').mockRejectedValueOnce(new Error('DB Connection Timeout'));

    const result = await recordAuditLog({
      actorName: 'Admin User',
      actorRole: 'ADMIN',
      action: 'RECORD_PAYMENT',
      entityType: 'PAYMENT',
      entityId: 'pay-999',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('DB Connection Timeout');
    expect(consoleSpy).toHaveBeenCalled();

    createSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('strictly redacts standalone apiKey, privateKey, sessionToken, and cookie keys', () => {
    const sensitive = {
      apiKey: 'ak_live_998877',
      privateKey: '-----BEGIN PRIVATE KEY-----',
      sessionCookie: 'sess_abc123',
      sessionId: 'sess_id_999',
      normalField: 'Project A',
    };
    const sanitized = sanitizeAuditData(sensitive);
    expect(sanitized.apiKey).toBe('[REDACTED]');
    expect(sanitized.privateKey).toBe('[REDACTED]');
    expect(sanitized.sessionCookie).toBe('[REDACTED]');
    expect(sanitized.sessionId).toBe('[REDACTED]');
    expect(sanitized.normalField).toBe('Project A');
  });

  it('supports transactional client and rethrows error when throwOnError is true', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockTx = {
      auditLog: {
        create: vi.fn().mockRejectedValueOnce(new Error('Transaction Aborted')),
      },
    };

    await expect(
      recordAuditLog({
        actorName: 'Admin User',
        actorRole: 'ADMIN',
        action: 'UPDATE_PROJECT_STATUS',
        entityType: 'PROJECT',
        entityId: 'proj-123',
        tx: mockTx,
        throwOnError: true,
      })
    ).rejects.toThrow('Transaction Aborted');

    expect(mockTx.auditLog.create).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
