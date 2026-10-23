import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/server';

describe('Swagger API Documentation', () => {
  it('serves Swagger UI HTML page at /docs', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/docs/',
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('swagger-ui');
    await app.close();
  });

  it('serves OpenAPI specification at /docs/json with registered endpoints', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/docs/json',
    });
    expect(response.statusCode).toBe(200);
    const spec = JSON.parse(response.body);
    expect(spec.openapi).toBeDefined();
    expect(spec.info.title).toContain('ProNex-ArchAI');

    // Verify key modules are exposed in OpenAPI paths
    const paths = Object.keys(spec.paths);
    expect(paths).toContain('/api/health');
    expect(paths).toContain('/api/auth/login');
    expect(paths).toContain('/api/projects');
    expect(paths).toContain('/api/vault/presigned-upload');
    expect(paths).toContain('/api/meetings/request');
    expect(paths).toContain('/api/attendance/clock-in');
    expect(paths).toContain('/api/verification/submit');
    await app.close();
  });

  it('redirects /api/docs and /swagger to /docs', async () => {
    const app = await buildApp();
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/docs',
    });
    expect(res1.statusCode).toBe(302);
    expect(res1.headers.location).toBe('/docs');

    const res2 = await app.inject({
      method: 'GET',
      url: '/swagger',
    });
    expect(res2.statusCode).toBe(302);
    expect(res2.headers.location).toBe('/docs');
    await app.close();
  });
});
