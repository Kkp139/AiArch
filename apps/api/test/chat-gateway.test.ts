import { describe, it, expect } from 'vitest';
import { canUserAccessProjectChat, validateChatAttachment, ChatService } from '../src/modules/chat/chat.service';
import { buildApp } from '../src/server';

describe('Project Chat Access Control & Gateway', () => {
  it('allows Admin and assigned Client Leader to access chat', () => {
    expect(canUserAccessProjectChat('ADMIN', ['proj-1'], 'proj-1')).toBe(true);
    expect(canUserAccessProjectChat('ADMIN', [], 'proj-1')).toBe(true); // Universal access
    expect(canUserAccessProjectChat('CLIENT_LEADER', ['proj-1', 'proj-2'], 'proj-1')).toBe(true);
  });

  it('rejects Staff and Client Viewer from chat', () => {
    expect(canUserAccessProjectChat('STAFF', ['proj-1'], 'proj-1')).toBe(false);
    expect(canUserAccessProjectChat('CLIENT_VIEWER', ['proj-1'], 'proj-1')).toBe(false);
  });

  it('rejects Client Leader not assigned to the project', () => {
    expect(canUserAccessProjectChat('CLIENT_LEADER', ['proj-2'], 'proj-1')).toBe(false);
  });

  it('validates image attachments (<= 10MB limit and valid image mime type)', () => {
    const valid = validateChatAttachment({
      fileName: 'elevation.png',
      fileSize: 5 * 1024 * 1024, // 5MB
      mimeType: 'image/png',
    });
    expect(valid.isValid).toBe(true);

    const tooLarge = validateChatAttachment({
      fileName: 'huge.jpg',
      fileSize: 15 * 1024 * 1024, // 15MB
      mimeType: 'image/jpeg',
    });
    expect(tooLarge.isValid).toBe(false);
    expect(tooLarge.error).toContain('10MB');

    const invalidType = validateChatAttachment({
      fileName: 'script.sh',
      fileSize: 1024,
      mimeType: 'application/x-sh',
    });
    expect(invalidType.isValid).toBe(false);
    expect(invalidType.error).toContain('image');
  });

  it('enforces RBAC via API: blocks Staff and Client Viewer with 403', async () => {
    const app = await buildApp();

    const staffRes = await app.inject({
      method: 'GET',
      url: '/api/chat/projects/proj-1/messages',
      headers: { authorization: 'Bearer mock-staff-token' },
    });
    expect(staffRes.statusCode).toBe(403);

    const viewerRes = await app.inject({
      method: 'GET',
      url: '/api/chat/projects/proj-1/messages',
      headers: { authorization: 'Bearer mock-viewer-token' },
    });
    expect(viewerRes.statusCode).toBe(403);
  });
});
