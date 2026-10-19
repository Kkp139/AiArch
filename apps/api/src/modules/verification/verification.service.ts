export type VerificationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REVISION_REQUIRED';

export interface VerificationItem {
  id: string;
  projectId: string;
  folderId: string;
  drawingTitle: string;
  fileKey: string;
  previewKey?: string;
  submittedBy: string;
  revisionNumber: number;
  status: VerificationStatus;
  feedbackNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  isLocked?: boolean;
  isCurrentApprovedDrawing?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubmissionDto {
  projectId: string;
  folderId: string;
  drawingTitle: string;
  fileKey: string;
  previewKey?: string;
  submittedBy: string;
}

export function canRoleAccessVerification(role: 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER'): boolean {
  return role === 'ADMIN' || role === 'STAFF';
}

export function createSubmission(dto: CreateSubmissionDto): VerificationItem {
  const now = new Date();
  return {
    id: `verif-${Date.now()}`,
    projectId: dto.projectId,
    folderId: dto.folderId,
    drawingTitle: dto.drawingTitle,
    fileKey: dto.fileKey,
    previewKey: dto.previewKey,
    submittedBy: dto.submittedBy,
    revisionNumber: 1,
    status: 'PENDING_REVIEW',
    isLocked: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function requestRevision(
  item: VerificationItem,
  feedbackNote: string,
  reviewedBy: string
): VerificationItem {
  const now = new Date();
  return {
    ...item,
    revisionNumber: item.revisionNumber + 1,
    status: 'REVISION_REQUIRED',
    feedbackNote,
    reviewedBy,
    reviewedAt: now,
    updatedAt: now,
  };
}

export function approveDrawing(item: VerificationItem, reviewedBy: string): VerificationItem {
  const now = new Date();
  return {
    ...item,
    status: 'APPROVED',
    isLocked: true,
    isCurrentApprovedDrawing: true,
    reviewedBy,
    reviewedAt: now,
    updatedAt: now,
  };
}

/**
 * Serializes verification item for UI responses:
 * Crucial rule: Revision Counter (e.g. Rev 3) is visible to BOTH Admin and Staff
 */
export function serializeVerificationItem(
  item: {
    id: string;
    drawingTitle: string;
    revisionNumber: number;
    status: VerificationStatus;
    feedbackNote?: string;
  },
  role: 'ADMIN' | 'STAFF'
) {
  return {
    id: item.id,
    drawingTitle: item.drawingTitle,
    revisionNumber: item.revisionNumber,
    revisionLabel: `Rev ${item.revisionNumber}`,
    status: item.status,
    feedbackNote: item.feedbackNote,
  };
}
