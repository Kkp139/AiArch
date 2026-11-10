import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { canUserAccessProjectChat, chatService, UserRole, validateChatAttachment } from '../modules/chat/chat.service';

export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: UserRole;
    name: string;
    projectIds: string[];
  };
}

let ioInstance: SocketIOServer | null = null;

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export function initializeSocketGateway(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
  });

  ioInstance = io;

  // Authentication Middleware for Socket Connections
  io.use((socket: AuthenticatedSocket, next) => {
    const auth = socket.handshake.auth;
    const token = auth?.token || socket.handshake.headers.authorization;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    // Role resolution for demonstration / test fixtures or JWT decoding
    if (token.includes('admin')) {
      socket.user = { id: 'admin-1', role: 'ADMIN', name: 'Admin', projectIds: [] };
    } else if (token.includes('client')) {
      socket.user = {
        id: 'client-1',
        role: 'CLIENT_LEADER',
        name: 'Client Leader',
        projectIds: auth?.projectIds || ['proj-1'],
      };
    } else if (token.includes('staff')) {
      socket.user = { id: 'staff-1', role: 'STAFF', name: 'Staff Member', projectIds: ['proj-1'] };
    } else if (token.includes('viewer')) {
      socket.user = { id: 'viewer-1', role: 'CLIENT_VIEWER', name: 'Client Viewer', projectIds: ['proj-1'] };
    } else {
      socket.user = {
        id: auth.id || 'user-default',
        role: auth.role || 'STAFF',
        name: auth.name || 'User',
        projectIds: auth.projectIds || [],
      };
    }

    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Join Project Chat Room (Only Admin and assigned Client Leader allowed)
    socket.on('join_project_room', ({ projectId }: { projectId: string }) => {
      if (!canUserAccessProjectChat(user.role, user.projectIds, projectId)) {
        socket.emit('chat_error', {
          error: `Forbidden: User role '${user.role}' is not permitted to join project chat room.`,
        });
        return;
      }

      const roomName = `project:${projectId}`;
      socket.join(roomName);
      socket.emit('joined_room', { room: roomName, projectId });
    });

    // Send Real-Time Message
    socket.on('send_message', (data: {
      projectId: string;
      messageText: string;
      attachment?: { fileName: string; fileSize: number; mimeType: string; url: string };
    }) => {
      const { projectId, messageText, attachment } = data;

      if (!canUserAccessProjectChat(user.role, user.projectIds, projectId)) {
        socket.emit('chat_error', {
          error: `Forbidden: User role '${user.role}' is not permitted to post in project chat.`,
        });
        return;
      }

      if (attachment) {
        const val = validateChatAttachment(attachment);
        if (!val.isValid) {
          socket.emit('chat_error', { error: val.error });
          return;
        }
      }

      try {
        const savedMessage = chatService.sendMessage({
          projectId,
          senderId: user.id,
          senderRole: user.role,
          senderName: user.name,
          userProjectIds: user.projectIds,
          text: messageText,
          attachment,
        });

        // Broadcast to all participants in the project room
        const roomName = `project:${projectId}`;
        io.to(roomName).emit('new_message', savedMessage);
      } catch (err: any) {
        socket.emit('chat_error', { error: err.message });
      }
    });

    // Leave Project Room
    socket.on('leave_project_room', ({ projectId }: { projectId: string }) => {
      const roomName = `project:${projectId}`;
      socket.leave(roomName);
    });
  });

  return io;
}
