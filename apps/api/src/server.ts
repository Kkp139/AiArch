import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ProNex-ArchAI API',
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
