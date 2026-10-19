import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { generateOtp, verifyOtp } from './otp.service';
import { hashPassword, verifyPassword, verifySetupToken } from './auth.service';

export async function authRoutes(app: FastifyInstance) {
  // Staff & Admin Login
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid username or password format' });
    }

    return {
      success: true,
      token: 'jwt-token-placeholder',
      user: {
        username: body.data.username,
        role: 'ADMIN',
      },
    };
  });

  // Client Leader / Viewer Login (Credentials + OTP)
  app.post('/api/auth/client-login', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
      mobile: z.string().min(10),
      otp: z.string().length(6),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Missing required credentials or mobile' });
    }

    const isOtpValid = verifyOtp(body.data.mobile, body.data.otp);
    if (!isOtpValid) {
      return reply.status(401).send({ error: 'Invalid or expired OTP' });
    }

    return {
      success: true,
      token: 'client-jwt-token-placeholder',
      user: {
        username: body.data.username,
        role: 'CLIENT_LEADER',
      },
    };
  });

  // Send WhatsApp OTP
  app.post('/api/auth/send-otp', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      mobile: z.string().min(10),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Valid mobile number is required' });
    }

    const otp = generateOtp(body.data.mobile);
    return {
      success: true,
      message: 'OTP sent successfully via WhatsApp',
      // In development/test mode only:
      debugOtp: process.env.NODE_ENV === 'production' ? undefined : otp,
    };
  });
}
