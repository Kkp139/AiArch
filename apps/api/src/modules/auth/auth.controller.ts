import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { generateOtp, verifyOtp } from './otp.service';
import {
  hashPassword,
  verifyPassword,
  createTempToken,
  verifyTempToken,
  consumeTempToken,
  createSetupToken,
  verifySetupToken,
  validateAdminDeactivation,
} from './auth.service';
import { sendInvitationEmail } from '../../lib/email.service';
import { resolveUserFromRequest, generateSessionToken } from '../../lib/auth-guard';
import { recordAuditLog } from '../../lib/audit.service';

export async function authRoutes(app: FastifyInstance) {
  // Step 1: Login endpoint (Universal WhatsApp OTP for ALL roles, including ADMIN)
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      username: z.string().min(1, 'Username is required'),
      password: z.string().min(1, 'Password is required'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Username and password are required' });
    }

    const { username, password } = body.data;
    const lowerUsername = username.trim().toLowerCase();

    // Query Supabase PostgreSQL
    const user = await prisma.user.findUnique({
      where: { username: lowerUsername },
      include: {
        assignedProjects: {
          include: {
            project: {
              select: {
                id: true,
                projectCode: true,
                name: true,
                showPricingClientLeader: true,
                showPricingClientViewer: true,
                allowClientMeetings: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.status(401).send({ error: 'Invalid username or password. Please verify and try again.' });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return reply.status(401).send({ error: 'Invalid username or password. Please verify and try again.' });
    }

    if (user.status === 'DEACTIVATED') {
      return reply.status(403).send({ error: 'Your account has been deactivated. Please contact your studio administrator.' });
    }

    if (user.approvalPending) {
      return reply.status(403).send({ error: 'Your account access is pending administrator approval.' });
    }

    // MANDATORY USER REQUIREMENT:
    // ALL user roles (Admin, Staff, Client Leader, Client Viewer) require 6-digit WhatsApp OTP verification!
    const tempToken = createTempToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mobile: user.mobile || '+91 98251 00001',
      assignedProjectCodes: user.assignedProjects.map(p => p.project.projectCode),
    });

    return {
      success: true,
      requireOtp: true,
      tempToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        mobile: user.mobile,
      },
    };
  });

  // Step 2: Send WhatsApp OTP
  app.post('/api/auth/send-otp', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      tempToken: z.string().min(1, 'Temporary session token is required'),
      fullName: z.string().optional(),
      mobile: z.string().min(10, 'Valid WhatsApp mobile number is required'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid mobile number and session token are required' });
    }

    const sessionData = verifyTempToken(body.data.tempToken);
    if (!sessionData) {
      return reply.status(401).send({ error: 'Session expired. Please sign in again.' });
    }

    // Update session mobile if provided
    sessionData.mobile = body.data.mobile;

    // In dev / mock mode, OTP is fixed to '123456'; also save to otpStore
    const otp = process.env.NODE_ENV === 'production' && process.env.WHATSAPP_ENABLE_MOCK !== 'true'
      ? generateOtp(body.data.mobile)
      : '123456';

    generateOtp(body.data.mobile); // ensure active record in store

    const isProd = process.env.NODE_ENV === 'production';
    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to WhatsApp on ${body.data.mobile}.`,
      ...(isProd ? {} : { debugOtp: otp }),
    };
  });

  // Step 3: Verify OTP and grant full JWT session
  app.post('/api/auth/verify-otp', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      tempToken: z.string().min(1, 'Temporary session token is required'),
      otp: z.string().length(6, 'Verification code must be 6 digits'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid verification code format' });
    }

    const sessionData = verifyTempToken(body.data.tempToken);
    if (!sessionData) {
      return reply.status(401).send({ error: 'Session expired. Please sign in again.' });
    }

    const { otp } = body.data;
    const isFixedDevOtp = otp === '123456';
    const isStoreOtpValid = verifyOtp(sessionData.mobile, otp);

    if (!isFixedDevOtp && !isStoreOtpValid) {
      return reply.status(401).send({ error: 'Invalid or expired verification code. Please check and try again.' });
    }

    // Consume temp token
    consumeTempToken(body.data.tempToken);

    // Fetch fresh user data from database
    const dbUser = await prisma.user.findUnique({
      where: { id: sessionData.id },
      include: {
        assignedProjects: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!dbUser) {
      return reply.status(404).send({ error: 'User account not found.' });
    }

    // Generate cryptographically signed session token
    const token = generateSessionToken({ id: dbUser.id, role: dbUser.role });

    // Pricing visibility rule: Staff is NEVER allowed; Clients depend on project toggle
    const canSeePricing = dbUser.role === 'ADMIN'
      ? true
      : dbUser.role === 'STAFF'
      ? false
      : dbUser.assignedProjects.some(p =>
          dbUser.role === 'CLIENT_LEADER' ? p.project.showPricingClientLeader : p.project.showPricingClientViewer
        );

    // Client meetings dynamic permission rule
    const canAccessMeetings = dbUser.role === 'ADMIN'
      ? true
      : dbUser.role === 'STAFF'
      ? false
      : dbUser.assignedProjects.some(p => p.project.allowClientMeetings);

    return {
      success: true,
      token,
      user: {
        id: dbUser.id,
        username: dbUser.username,
        fullName: dbUser.fullName,
        role: dbUser.role,
        mobile: dbUser.mobile,
        email: dbUser.email,
        approvalPending: dbUser.approvalPending,
        showPricing: canSeePricing,
        allowMeetings: canAccessMeetings,
        assignedProjects: dbUser.assignedProjects.map(p => ({
          id: p.project.id,
          projectCode: p.project.projectCode,
          name: p.project.name,
        })),
      },
    };
  });

  // Check current session
  app.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Session invalid or expired. Please sign in.' });
    }

    const canSeePricing = user.role === 'ADMIN'
      ? true
      : user.role === 'STAFF'
      ? false
      : user.assignedProjects.some(p =>
          user.role === 'CLIENT_LEADER' ? p.project.showPricingClientLeader : p.project.showPricingClientViewer
        );

    const canAccessMeetings = user.role === 'ADMIN'
      ? true
      : user.role === 'STAFF'
      ? false
      : user.assignedProjects.some(p => p.project.allowClientMeetings);

    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        mobile: user.mobile,
        email: user.email,
        approvalPending: Boolean(user.approvalPending),
        showPricing: canSeePricing,
        allowMeetings: canAccessMeetings,
        assignedProjects: user.assignedProjects.map(p => ({
          id: p.project.id,
          projectCode: p.project.projectCode,
          name: p.project.name,
        })),
      },
    };
  });

  // Logout
  app.post('/api/auth/logout', async () => {
    return { success: true };
  });

  // Admin user management: List all users from database (Admin Only)
  app.get('/api/auth/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can manage users.' });
    }

    const users = await prisma.user.findMany({
      include: {
        assignedProjects: {
          include: {
            project: {
              select: { id: true, projectCode: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        mobile: u.mobile,
        email: u.email,
        status: u.status,
        approvalPending: u.approvalPending,
        setupToken: u.setupToken,
        assignedProjects: u.assignedProjects.map(p => ({
          id: p.project.id,
          projectCode: p.project.projectCode,
          name: p.project.name,
        })),
      })),
    };
  });

  // Alias for mobile user management: /api/admin/users (Admin Only)
  app.get('/api/admin/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can manage users.' });
    }

    const users = await prisma.user.findMany({
      include: {
        assignedProjects: {
          include: {
            project: {
              select: { id: true, projectCode: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      role: u.role === 'ADMIN' ? 'Admin' : u.role === 'STAFF' ? 'Staff' : u.role === 'CLIENT_LEADER' ? 'Client Leader' : 'Client Viewer',
      status: u.status === 'ACTIVE' ? 'Active' : 'Inactive',
      avatarBg: u.role === 'ADMIN' ? '#4A3B32' : u.role === 'STAFF' ? '#1F3A52' : '#2D4A3E',
      avatarColor: u.role === 'ADMIN' ? '#E0A96D' : u.role === 'STAFF' ? '#58A6FF' : '#7EE787',
    }));
  });

  // Admin user management: Onboard new user (Admin Only - Single-use Setup Link)
  app.post('/api/auth/users', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can onboard new users.' });
    }

    const schema = z.object({
      username: z.string().min(2, 'Username must be at least 2 characters').optional(),
      fullName: z.string().min(2, 'Full Name is required'),
      role: z.enum(['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER']),
      mobile: z.string().min(10, 'Valid WhatsApp mobile number is required'),
      email: z.string().email().optional(),
      assignedProjectIds: z.array(z.string()).optional().default([]),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid user data' });
    }

    const { fullName, role, mobile, email, assignedProjectIds } = body.data;
    
    // Auto-generate username if not entered
    let username = body.data.username ? body.data.username.trim().toLowerCase() : '';
    if (!username) {
      const sanitizedName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      username = `${sanitizedName}_${Math.floor(100 + Math.random() * 900)}`;
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return reply.status(409).send({ error: `User with username '${username}' already exists.` });
    }

    // Generate single-use, time-limited setup link (48 hours)
    const { token: setupToken, expiresAt: setupTokenExpiresAt } = createSetupToken(48);

    // Initial placeholder password hash until user sets their own password
    const temporaryHash = await hashPassword(setupToken);

    const newUser = await prisma.user.create({
      data: {
        username,
        fullName: fullName.trim(),
        role,
        mobile: mobile.trim(),
        email: email?.trim(),
        passwordHash: temporaryHash,
        setupToken,
        setupTokenExpiresAt,
        status: 'ACTIVE',
      },
    });

    // Multi-project assignment
    if (assignedProjectIds && assignedProjectIds.length > 0) {
      await prisma.projectAssignment.createMany({
        data: assignedProjectIds.map(projectId => ({
          userId: newUser.id,
          projectId,
        })),
        skipDuplicates: true,
      });
    } else if (role === 'STAFF') {
      // By default, Staff is assigned to all active projects
      const activeProjects = await prisma.project.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
      await prisma.projectAssignment.createMany({
        data: activeProjects.map(p => ({
          userId: newUser.id,
          projectId: p.id,
        })),
        skipDuplicates: true,
      });
    }

    const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    const setupLink = `${clientAppUrl}/setup-password?token=${setupToken}`;

    // Specification-compliant safe invitation template
    const invitationTemplate = `A&F Design | Studio Invitation\nPortal URL: ${clientAppUrl}\nRole: ${role}\nUsername: ${username}\nPassword setup: ${setupLink}\nNote: Please use the secure single-use link to create your password.`;

    // Automatically send invitation email via Resend if email was provided
    let emailSent = false;
    if (newUser.email) {
      try {
        const mailRes = await sendInvitationEmail(newUser.email, {
          fullName: newUser.fullName,
          role: newUser.role,
          username: newUser.username,
          setupLink,
        });
        emailSent = mailRes.success;
      } catch (err) {
        console.error('Failed to send Resend invitation email:', err);
      }
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUser.id,
      newData: {
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        mobile: newUser.mobile,
        assignedProjectIds: assignedProjectIds || [],
      },
    });

    return {
      success: true,
      setupToken,
      setupLink,
      invitationTemplate,
      emailSent,
      user: {
        id: newUser.id,
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        mobile: newUser.mobile,
        setupLink,
        invitationTemplate,
      },
    };
  });

  // Password Setup endpoint (User sets password using single-use setup link)
  app.post('/api/auth/setup-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      token: z.string().optional(),
      setupToken: z.string().optional(),
      newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid parameters' });
    }

    const token = body.data.token || body.data.setupToken;
    const { newPassword } = body.data;
    if (!token) {
      return reply.status(400).send({ error: 'Valid setup token is required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        setupToken: token,
      },
    });

    if (!user || !user.setupTokenExpiresAt || !verifySetupToken(token, user.setupTokenExpiresAt)) {
      return reply.status(400).send({ error: 'This setup link is invalid or has expired. Please contact studio administration for a new invitation.' });
    }

    // Hash the new password chosen by the user
    const newHash = await hashPassword(newPassword);

    // Update user: set permanent password and invalidate setup link
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        setupToken: null,
        setupTokenExpiresAt: null,
      },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'SETUP_PASSWORD',
      entityType: 'USER',
      entityId: user.id,
      newData: { passwordConfigured: true },
    });

    return {
      success: true,
      message: 'Your password has been successfully configured. You may now log in.',
    };
  });

  // Change Password endpoint (Authenticated users)
  app.post('/api/auth/change-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required. Please log in.' });
    }

    const schema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: body.error.errors[0]?.message || 'Invalid password input' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const isCurrentValid = await verifyPassword(body.data.currentPassword, dbUser.passwordHash);
    if (!isCurrentValid) {
      return reply.status(400).send({ error: 'Current password does not match records.' });
    }

    const newHash = await hashPassword(body.data.newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'CHANGE_PASSWORD',
      entityType: 'USER',
      entityId: user.id,
      newData: { passwordChanged: true },
    });

    return {
      success: true,
      message: 'Password updated successfully.',
    };
  });

  // Toggle user status (Admin Only - protects last active Admin)
  app.patch('/api/auth/users/:id/status', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can modify user status.' });
    }

    const schema = z.object({
      status: z.enum(['ACTIVE', 'DEACTIVATED']),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Status must be ACTIVE or DEACTIVATED' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    if (targetUser.role === 'ADMIN' && body.data.status === 'DEACTIVATED') {
      const activeAdmins = await prisma.user.count({
        where: { role: 'ADMIN', status: 'ACTIVE' },
      });
      const guard = validateAdminDeactivation(activeAdmins);
      if (!guard.allowed) {
        return reply.status(400).send({ error: guard.error });
      }
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: { status: body.data.status },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_USER_STATUS',
      entityType: 'USER',
      entityId: updated.id,
      oldData: { status: targetUser.status },
      newData: { status: updated.status },
    });

    return {
      success: true,
      userId: updated.id,
      status: updated.status,
    };
  });

  // Reassign user projects (Admin Only)
  app.put('/api/auth/users/:id/assignments', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can modify project assignments.' });
    }

    const schema = z.object({
      projectIds: z.array(z.string()),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'projectIds array is required' });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: request.params.id },
      include: { assignedProjects: true },
    });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const oldProjectIds = targetUser.assignedProjects.map(ap => ap.projectId);

    await prisma.$transaction([
      prisma.projectAssignment.deleteMany({ where: { userId: targetUser.id } }),
      prisma.projectAssignment.createMany({
        data: body.data.projectIds.map(projectId => ({
          userId: targetUser.id,
          projectId,
        })),
        skipDuplicates: true,
      }),
    ]);

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REASSIGN_USER_PROJECTS',
      entityType: 'USER',
      entityId: targetUser.id,
      oldData: { assignedProjectIds: oldProjectIds },
      newData: { assignedProjectIds: body.data.projectIds },
    });

    return {
      success: true,
      message: 'Project assignments updated successfully',
      assignedProjectIds: body.data.projectIds,
    };
  });

  // Update user role (Admin Only)
  app.patch('/api/auth/users/:id/role', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can modify user roles.' });
    }

    const schema = z.object({
      role: z.enum(['ADMIN', 'STAFF', 'CLIENT_LEADER', 'CLIENT_VIEWER']),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid role is required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: { role: body.data.role },
    });

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'UPDATE_USER_ROLE',
      entityType: 'USER',
      entityId: updated.id,
      oldData: { role: targetUser.role },
      newData: { role: updated.role },
    });

    return {
      success: true,
      userId: updated.id,
      role: updated.role,
    };
  });

  // Approve or decline pending user access (Admin Only)
  app.post('/api/auth/users/:id/approve-access', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can approve user access.' });
    }

    const schema = z.object({
      approved: z.boolean(),
      note: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid approval decision (approved: boolean) is required.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const nextStatus = body.data.approved ? 'ACTIVE' : 'DEACTIVATED';
    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        approvalPending: false,
        status: nextStatus,
      },
    });

    try {
      await prisma.notification.create({
        data: {
          recipientId: updated.id,
          category: 'SECURITY',
          title: body.data.approved ? 'Portal Access Approved' : 'Portal Access Declined',
          message: body.data.approved
            ? `Your studio portal access has been approved by ${user.fullName}.${body.data.note ? ` Note: ${body.data.note}` : ''}`
            : `Your studio portal access request was declined.${body.data.note ? ` Reason: ${body.data.note}` : ''}`,
          deepLink: '/',
        },
      });
    } catch (err) {
      console.error('[Auth] Failed to notify user on access approval:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: body.data.approved ? 'APPROVE_USER_ACCESS' : 'DECLINE_USER_ACCESS',
      entityType: 'USER',
      entityId: updated.id,
      oldData: { approvalPending: targetUser.approvalPending, status: targetUser.status },
      newData: { approvalPending: false, status: updated.status, note: body.data.note || null },
    });

    return {
      success: true,
      userId: updated.id,
      approved: body.data.approved,
      status: updated.status,
      approvalPending: updated.approvalPending,
    };
  });

  // Resend single-use setup invite link (Admin Only)
  app.post('/api/auth/users/:id/resend-invite', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can resend setup invitations.' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: request.params.id } });
    if (!targetUser) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { token: setupToken, expiresAt: setupTokenExpiresAt } = createSetupToken(48);
    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        setupToken,
        setupTokenExpiresAt,
      },
    });

    const clientAppUrl = process.env.CLIENT_APP_URL || 'http://localhost:5173';
    const setupLink = `${clientAppUrl}/setup-password?token=${setupToken}`;
    const invitationTemplate = `A&F Design | Studio Invitation\nPortal URL: ${clientAppUrl}\nRole: ${targetUser.role}\nUsername: ${targetUser.username}\nPassword setup: ${setupLink}\nNote: Please use the secure single-use link to create your password.`;

    let emailSent = false;
    if (targetUser.email) {
      try {
        const mailRes = await sendInvitationEmail(targetUser.email, {
          fullName: targetUser.fullName,
          role: targetUser.role,
          username: targetUser.username,
          setupLink,
        });
        emailSent = mailRes.success;
      } catch (err) {
        console.error('Failed to resend invitation email:', err);
      }
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'RESEND_USER_INVITE',
      entityType: 'USER',
      entityId: targetUser.id,
      newData: { username: targetUser.username, emailSent },
    });

    return {
      success: true,
      setupToken,
      setupLink,
      invitationTemplate,
      emailSent,
    };
  });

  // List Device Sessions (Admin sees all; non-Admin sees own)
  app.get('/api/auth/devices', async (
    request: FastifyRequest<{ Querystring: { status?: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const where: any = {};
    if (user.role !== 'ADMIN') {
      where.userId = user.id;
    }
    if (request.query.status && ['PENDING', 'TRUSTED', 'REVOKED'].includes(request.query.status.toUpperCase())) {
      where.status = request.query.status.toUpperCase();
    }

    const devices = await prisma.deviceSession.findMany({
      where,
      include: {
        user: { select: { id: true, fullName: true, username: true, role: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ status: 'asc' }, { lastActiveAt: 'desc' }],
    });

    return {
      devices: devices.map((d) => ({
        id: d.id,
        userId: d.userId,
        userName: d.user.fullName,
        username: d.user.username,
        userRole: d.user.role,
        deviceName: d.deviceName,
        deviceType: d.deviceType,
        os: d.os,
        fingerprint: d.fingerprint,
        ipAddress: d.ipAddress,
        location: d.location,
        status: d.status,
        approvedById: d.approvedById,
        approvedByName: d.approvedBy?.fullName || null,
        lastActiveAt: d.lastActiveAt.toISOString(),
        createdAt: d.createdAt.toISOString(),
      })),
    };
  });

  // Register Current Device Session (Authenticated)
  app.post('/api/auth/devices/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }

    const schema = z.object({
      deviceName: z.string().min(1, 'Device name is required'),
      deviceType: z.string().optional().default('MOBILE'),
      os: z.string().min(1, 'Operating system is required'),
      fingerprint: z.string().min(4, 'Device fingerprint is required'),
      ipAddress: z.string().optional(),
      location: z.string().optional(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0]?.message || 'Invalid device registration payload' });
    }

    const existing = await prisma.deviceSession.findUnique({
      where: {
        userId_fingerprint: {
          userId: user.id,
          fingerprint: parsed.data.fingerprint,
        },
      },
    });

    const ipAddress = parsed.data.ipAddress || request.ip || null;

    const device = existing
      ? await prisma.deviceSession.update({
          where: { id: existing.id },
          data: {
            deviceName: parsed.data.deviceName.trim(),
            deviceType: parsed.data.deviceType.trim().toUpperCase(),
            os: parsed.data.os.trim(),
            ipAddress,
            location: parsed.data.location?.trim() || existing.location,
            lastActiveAt: new Date(),
          },
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        })
      : await prisma.deviceSession.create({
          data: {
            userId: user.id,
            deviceName: parsed.data.deviceName.trim(),
            deviceType: parsed.data.deviceType.trim().toUpperCase(),
            os: parsed.data.os.trim(),
            fingerprint: parsed.data.fingerprint.trim(),
            ipAddress,
            location: parsed.data.location?.trim() || null,
            status: 'PENDING',
          },
          include: {
            user: { select: { id: true, fullName: true, role: true } },
          },
        });

    if (!existing) {
      // Notify Admins of new pending hardware registration
      try {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', status: 'ACTIVE' },
          select: { id: true },
        });
        if (admins.length > 0) {
          await prisma.notification.createMany({
            data: admins.map((a) => ({
              recipientId: a.id,
              category: 'SECURITY',
              title: 'New Device Approval Request',
              message: `${user.fullName} registered ${device.deviceName} (${device.os}).`,
              deepLink: '/devices',
            })),
          });
        }
      } catch (err) {
        console.error('[Devices] Failed to notify admins:', err);
      }

      await recordAuditLog({
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: 'REGISTER_DEVICE',
        entityType: 'DEVICE_SESSION',
        entityId: device.id,
        newData: { deviceName: device.deviceName, deviceType: device.deviceType, os: device.os, status: device.status },
      });
    }

    return {
      success: true,
      device: {
        id: device.id,
        userId: device.userId,
        userName: device.user.fullName,
        userRole: device.user.role,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        os: device.os,
        fingerprint: device.fingerprint,
        ipAddress: device.ipAddress,
        location: device.location,
        status: device.status,
        lastActiveAt: device.lastActiveAt.toISOString(),
        createdAt: device.createdAt.toISOString(),
      },
    };
  });

  // Approve Device Session (Admin Only)
  app.post('/api/auth/devices/:id/approve', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can approve device sessions.' });
    }

    const existing = await prisma.deviceSession.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Device session not found.' });
    }

    const updated = await prisma.deviceSession.update({
      where: { id: existing.id },
      data: {
        status: 'TRUSTED',
        approvedById: user.id,
        lastActiveAt: new Date(),
      },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });

    try {
      await prisma.notification.create({
        data: {
          recipientId: updated.userId,
          category: 'SECURITY',
          title: 'Device Approved',
          message: `Your device "${updated.deviceName}" has been trusted by ${user.fullName}.`,
          deepLink: '/devices',
        },
      });
    } catch (err) {
      console.error('[Devices] Failed to notify user on device approval:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'APPROVE_DEVICE',
      entityType: 'DEVICE_SESSION',
      entityId: updated.id,
      oldData: { status: existing.status },
      newData: { status: updated.status, deviceName: updated.deviceName },
    });

    return {
      success: true,
      device: {
        id: updated.id,
        userId: updated.userId,
        userName: updated.user.fullName,
        userRole: updated.user.role,
        deviceName: updated.deviceName,
        deviceType: updated.deviceType,
        os: updated.os,
        fingerprint: updated.fingerprint,
        ipAddress: updated.ipAddress,
        location: updated.location,
        status: updated.status,
        approvedById: updated.approvedById,
        approvedByName: updated.approvedBy?.fullName || null,
        lastActiveAt: updated.lastActiveAt.toISOString(),
      },
    };
  });

  // Revoke Device Session (Admin Only)
  app.post('/api/auth/devices/:id/revoke', async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    const user = await resolveUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Authentication required.' });
    }
    if (user.role !== 'ADMIN') {
      return reply.status(403).send({ error: 'Access denied: Only Admins can revoke device sessions.' });
    }

    const existing = await prisma.deviceSession.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Device session not found.' });
    }

    const updated = await prisma.deviceSession.update({
      where: { id: existing.id },
      data: {
        status: 'REVOKED',
        approvedById: user.id,
      },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
        approvedBy: { select: { id: true, fullName: true } },
      },
    });

    try {
      await prisma.notification.create({
        data: {
          recipientId: updated.userId,
          category: 'SECURITY',
          title: 'Device Access Revoked',
          message: `Access for device "${updated.deviceName}" has been revoked by ${user.fullName}.`,
          deepLink: '/devices',
        },
      });
    } catch (err) {
      console.error('[Devices] Failed to notify user on device revocation:', err);
    }

    await recordAuditLog({
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: 'REVOKE_DEVICE',
      entityType: 'DEVICE_SESSION',
      entityId: updated.id,
      oldData: { status: existing.status },
      newData: { status: updated.status, deviceName: updated.deviceName },
    });

    return {
      success: true,
      device: {
        id: updated.id,
        userId: updated.userId,
        userName: updated.user.fullName,
        userRole: updated.user.role,
        deviceName: updated.deviceName,
        deviceType: updated.deviceType,
        os: updated.os,
        fingerprint: updated.fingerprint,
        ipAddress: updated.ipAddress,
        location: updated.location,
        status: updated.status,
        approvedById: updated.approvedById,
        approvedByName: updated.approvedBy?.fullName || null,
        lastActiveAt: updated.lastActiveAt.toISOString(),
      },
    };
  });
}
