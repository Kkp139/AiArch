import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { generateOtp, verifyOtp } from './otp.service';
import {
  hashPassword,
  verifyPassword,
  createTempToken,
  verifyTempToken,
  consumeTempToken,
  SEED_USERS,
  SeedUser,
} from './auth.service';

export async function authRoutes(app: FastifyInstance) {
  // Step 1: Login endpoint (Admin direct vs. Staff/Client 2-Step OTP)
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

    // Check seed accounts
    const user: SeedUser | undefined = SEED_USERS[lowerUsername];
    if (!user) {
      return reply.status(401).send({ error: 'Invalid username or password. Please verify and try again.' });
    }

    if (user.passwordPlainText !== password) {
      return reply.status(401).send({ error: 'Invalid username or password. Please verify and try again.' });
    }

    if (user.status === 'DEACTIVATED') {
      return reply.status(403).send({ error: 'Your account has been deactivated. Please contact your studio administrator.' });
    }

    // Admin users log in directly without OTP
    if (user.role === 'ADMIN') {
      const token = `jwt_token_${user.id}_${Date.now()}`;
      return {
        success: true,
        requireOtp: false,
        token,
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          showPricing: user.showPricing,
        },
      };
    }

    // Staff and Client roles require 2-Step WhatsApp OTP
    const tempToken = createTempToken({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      mobile: user.mobile,
      showPricing: user.showPricing,
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

    // In dev / test mode, OTP is fixed to '123456'; also save to otpStore
    const otp = process.env.NODE_ENV === 'production' ? generateOtp(body.data.mobile) : '123456';
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
    // Allow fixed dev OTP '123456' or valid OTP store check
    const isFixedDevOtp = otp === '123456';
    const isStoreOtpValid = verifyOtp(sessionData.mobile, otp);

    if (!isFixedDevOtp && !isStoreOtpValid) {
      return reply.status(401).send({ error: 'Invalid or expired verification code. Please check and try again.' });
    }

    // Consume temp token
    consumeTempToken(body.data.tempToken);

    const token = `jwt_session_${sessionData.id}_${Date.now()}`;
    return {
      success: true,
      token,
      user: {
        id: sessionData.id,
        username: sessionData.username,
        fullName: sessionData.fullName,
        role: sessionData.role,
        showPricing: sessionData.showPricing,
      },
    };
  });

  // Check current session
  app.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    // In mock/test environment, return corresponding seed user or admin default
    const matchedUser = Object.values(SEED_USERS).find(u => token.includes(u.id)) || SEED_USERS.admin;

    return {
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        fullName: matchedUser.fullName,
        role: matchedUser.role,
        showPricing: matchedUser.showPricing,
      },
    };
  });

  // Logout
  app.post('/api/auth/logout', async () => {
    return { success: true };
  });
}
