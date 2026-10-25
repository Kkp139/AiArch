import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

import { authRoutes } from './modules/auth/auth.controller';
import { chatRoutes } from './modules/chat/chat.controller';
import { projectRoutes } from './modules/projects/projects.controller';
import { vaultRoutes } from './modules/vault/vault.controller';
import { meetingRoutes } from './modules/meetings/meetings.controller';
import { attendanceRoutes } from './modules/attendance/attendance.controller';
import { paymentRoutes } from './modules/payments/payments.controller';
import { verificationRoutes } from './modules/verification/verification.controller';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register OpenAPI / Swagger specification generator
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'ProNex-ArchAI Studio Collaboration API',
        description: 'Interactive API documentation for ProNex-ArchAI Studio Collaboration Portal (A&B Design)',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/',
          description: 'Current Server',
        },
      ],
      tags: [
        { name: 'System', description: 'System health & diagnostic endpoints' },
        { name: 'Auth', description: 'Authentication, OTP & User session management' },
        { name: 'Chat', description: 'Real-time studio chat and project discussions' },
        { name: 'Projects', description: 'Project lifecycle, progress and folder structure' },
        { name: 'Vault', description: 'Document vault, drawings and presigned uploads' },
        { name: 'Meetings', description: 'Calendar booking, office visits and slots' },
        { name: 'Attendance', description: 'Staff GPS punch-in/out and work updates' },
        { name: 'Payments', description: 'Milestones, billing, ledger and discrepancies' },
        { name: 'Verification', description: 'Design reviews, approvals and markups' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  // Register Swagger UI interactive documentation page
  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  // Register all system controllers
  await app.register(authRoutes);
  await app.register(chatRoutes);
  await app.register(projectRoutes);
  await app.register(vaultRoutes);
  await app.register(meetingRoutes);
  await app.register(attendanceRoutes);
  await app.register(paymentRoutes);
  await app.register(verificationRoutes);

  // Health check endpoint
  app.get('/api/health', {
    schema: {
      description: 'API Health Check and service status',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            service: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: `${process.env.STUDIO_NAME || 'A&B Design'} Portal API`,
    };
  });

  // Convenient redirects for API documentation
  app.get('/', async (_req, reply) => {
    return reply.redirect('/docs');
  });
  app.get('/api/docs', async (_req, reply) => {
    return reply.redirect('/docs');
  });
  app.get('/swagger', async (_req, reply) => {
    return reply.redirect('/docs');
  });

  return app;
}

if (require.main === module) {
  buildApp().then(app => {
    const port = Number(process.env.PORT) || 4000;
    app.listen({ port, host: '0.0.0.0' }, (err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`ProNex-ArchAI API running on port ${port}`);
    });
  });
}
