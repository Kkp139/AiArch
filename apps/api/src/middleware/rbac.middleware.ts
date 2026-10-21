import { FastifyRequest, FastifyReply } from 'fastify';

export type UserRole = 'ADMIN' | 'STAFF' | 'CLIENT_LEADER' | 'CLIENT_VIEWER';

export function checkRoleAccess(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  // Admin has universal system-wide access to every module and endpoint
  if (userRole === 'ADMIN') {
    return true;
  }
  return allowedRoles.includes(userRole);
}

export function requireRole(allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as { role: UserRole } | undefined;
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized: Authentication required' });
    }

    if (!checkRoleAccess(user.role, allowedRoles)) {
      return reply.status(403).send({ error: 'Forbidden: Insufficient role permissions' });
    }
  };
}
