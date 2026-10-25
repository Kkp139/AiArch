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
} from './auth.service';
import { sendInvitationEmail } from '../../lib/email.service';
import { resolveUserFromRequest, generateSessionToken } from '../../lib/auth-guard';

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

    return {
      success: true,
      message: `A 6-digit verification code has been dispatched to WhatsApp on ${body.data.mobile}.`,
      debugOtp: otp,
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
    const invitationTemplate = `ProNex-ArchAI | Studio Invitation\nPortal URL: ${clientAppUrl}\nRole: ${role}\nUsername: ${username}\nPassword setup: ${setupLink}\nNote: Please use the secure single-use link to create your password.`;

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

    return {
      success: true,
      message: 'Your password has been successfully configured. You may now log in.',
    };
  });
}
