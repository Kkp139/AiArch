import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

import { chatRoutes } from './modules/chat/chat.controller';
import { authRoutes } from './modules/auth/auth.controller';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(authRoutes);
  await app.register(chatRoutes);

  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: `${process.env.STUDIO_NAME || 'A&F Design'} Portal API`,
    };
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
