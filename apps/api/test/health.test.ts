import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/server';

describe('GET /api/health', () => {
  it('returns ok status and timestamp', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.timestamp).toBeDefined();
    await app.close();
  });
});
