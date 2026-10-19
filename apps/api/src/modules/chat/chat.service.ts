export type UserRole = 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';

export interface ChatAttachment {
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  messageText: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  createdAt: Date;
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

/**
 * Access Control Rule:
 * Real-Time Project Chat is strictly between Admin and assigned Client Leaders.
 * Staff and Client Viewers are strictly prohibited.
 */
export function canUserAccessProjectChat(
  userRole: UserRole | string,
  userProjectIds: string[] = [],
  targetProjectId: string
): boolean {
  if (userRole === 'ADMIN') {
    return true; // Universal access for Admin
  }
  if (userRole === 'CLIENT_LEADER') {
    return userProjectIds.includes(targetProjectId);
  }
  // STAFF and CLIENT_VIEWER are strictly blocked
  return false;
}

/**
 * Validates chat image attachment size and MIME type.
 * Limit: <= 10MB, must be an image.
 */
export function validateChatAttachment(attachment: ChatAttachment): { isValid: boolean; error?: string } {
  if (attachment.fileSize > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Attachment size exceeds maximum limit of 10MB (file size: ${(attachment.fileSize / (1024 * 1024)).toFixed(2)}MB)`,
    };
  }

  if (!ALLOWED_IMAGE_MIMES.has(attachment.mimeType.toLowerCase())) {
    return {
      isValid: false,
      error: `Invalid file type '${attachment.mimeType}'. Only image files (PNG, JPEG, WebP, GIF, SVG) are permitted.`,
    };
  }

  return { isValid: true };
}

export class ChatService {
  private messages: ChatMessage[] = [];

  public sendMessage(params: {
    projectId: string;
    senderId: string;
    senderRole: UserRole;
    senderName: string;
    userProjectIds?: string[];
    text: string;
    attachment?: ChatAttachment & { url: string };
  }): ChatMessage {
    const { projectId, senderId, senderRole, senderName, userProjectIds = [], text, attachment } = params;

    if (!canUserAccessProjectChat(senderRole, userProjectIds, projectId)) {
      throw new Error(`Unauthorized: Role '${senderRole}' is not permitted to participate in project chat.`);
    }

    if (attachment) {
      const check = validateChatAttachment(attachment);
      if (!check.isValid) {
        throw new Error(check.error);
      }
    }

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId,
      senderId,
      senderRole,
      senderName,
      messageText: text,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.fileName,
      attachmentSize: attachment?.fileSize,
      createdAt: new Date(),
    };

    this.messages.push(message);
    return message;
  }

  public getMessages(projectId: string, userRole: UserRole, userProjectIds: string[] = []): ChatMessage[] {
    if (!canUserAccessProjectChat(userRole, userProjectIds, projectId)) {
      throw new Error(`Unauthorized: Role '${userRole}' is not permitted to read project chat.`);
    }

    return this.messages.filter((m) => m.projectId === projectId);
  }
}

export const chatService = new ChatService();
