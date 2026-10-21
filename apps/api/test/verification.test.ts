import { describe, it, expect } from 'vitest';
import {
  createSubmission,
  requestRevision,
  approveDrawing,
  canRoleAccessVerification,
  serializeVerificationItem,
} from '../src/modules/verification/verification.service';

describe('Design Verification Workflow & Dual Revision Counter', () => {
  it('allows Staff to submit a drawing with initial revisionNumber = 1', () => {
    const item = createSubmission({
      projectId: 'proj-1',
      folderId: 'folder-civil',
      drawingTitle: 'RCC Raft Footing Details',
      fileKey: 'uploads/raft_footing_v1.dwg',
      submittedBy: 'staff-user-1',
    });

    expect(item.revisionNumber).toBe(1);
    expect(item.status).toBe('PENDING_REVIEW');
    expect(item.drawingTitle).toBe('RCC Raft Footing Details');
  });

  it('increments revisionNumber and records feedback note on revision request', () => {
    const item = createSubmission({
      projectId: 'proj-1',
      folderId: 'folder-civil',
      drawingTitle: 'RCC Raft Footing Details',
      fileKey: 'uploads/raft_footing_v1.dwg',
      submittedBy: 'staff-user-1',
    });

    const revisedItem = requestRevision(
      item,
      'Increase rebar diameter from 16mm to 20mm in column C4',
      'admin-user-1'
    );

    expect(revisedItem.status).toBe('REVISION_REQUIRED');
    expect(revisedItem.revisionNumber).toBe(2);
    expect(revisedItem.feedbackNote).toContain('Increase rebar diameter');
    expect(revisedItem.reviewedBy).toBe('admin-user-1');
  });

  it('locks item into APPROVED state and flags it for project folder placement', () => {
    const item = createSubmission({
      projectId: 'proj-1',
      folderId: 'folder-civil',
      drawingTitle: 'RCC Raft Footing Details',
      fileKey: 'uploads/raft_footing_v2.dwg',
      submittedBy: 'staff-user-1',
    });

    const approved = approveDrawing(item, 'admin-user-1');
    expect(approved.status).toBe('APPROVED');
    expect(approved.isLocked).toBe(true);
    expect(approved.isCurrentApprovedDrawing).toBe(true);
  });

  it('SERIALIZATION RULE: Revision Counter is explicitly visible to BOTH Admin and Staff', () => {
    const item = {
      id: 'verif-123',
      drawingTitle: 'RCC Column Schedule',
      revisionNumber: 3,
      status: 'REVISION_REQUIRED' as const,
      feedbackNote: 'Align with grid line B',
    };

    const adminView = serializeVerificationItem(item, 'ADMIN');
    expect(adminView.revisionNumber).toBe(3);
    expect(adminView.revisionLabel).toBe('Rev 3');

    const staffView = serializeVerificationItem(item, 'STAFF');
    // Staff MUST see the revision counter per explicit user override
    expect(staffView.revisionNumber).toBe(3);
    expect(staffView.revisionLabel).toBe('Rev 3');
  });

  it('strictly forbids client roles from accessing design verification', () => {
    expect(canRoleAccessVerification('ADMIN')).toBe(true);
    expect(canRoleAccessVerification('STAFF')).toBe(true);
    expect(canRoleAccessVerification('CLIENT_LEADER')).toBe(false);
    expect(canRoleAccessVerification('CLIENT_VIEWER')).toBe(false);
  });
});
