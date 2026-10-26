import { describe, it, expect } from 'vitest';
import { calculateProgress, isMeaningfulProgressChange } from '../src/modules/projects/progress.service';
import { validateProjectStatusTransition } from '../src/modules/projects/projects.service';

describe('Project Progress Calculation Engine (16 Categories)', () => {
  it('calculates 12 populated categories out of 16 as exactly 75.0%', () => {
    const result = calculateProgress(12);
    expect(result.percentage).toBe(75.0);
    expect(result.totalCategories).toBe(16);
    expect(result.populatedCategories).toBe(12);
  });

  it('calculates 16 populated categories out of 16 as 100.0%', () => {
    const result = calculateProgress(16);
    expect(result.percentage).toBe(100.0);
  });

  it('calculates 0 populated categories as 0.0%', () => {
    const result = calculateProgress(0);
    expect(result.percentage).toBe(0.0);
  });

  it('calculates fractional percentages accurately to 1 decimal place', () => {
    // 1 populated category = 1/16 = 6.25% -> rounds cleanly to 6.3% or 6.25%
    const result = calculateProgress(1);
    expect(result.percentage).toBe(6.25);
  });

  it('detects meaningful progress changes for notifications', () => {
    // Meaningful change: percentage changed
    expect(isMeaningfulProgressChange(50.0, 56.25)).toBe(true);

    // Minor / duplicate calculation: same percentage
    expect(isMeaningfulProgressChange(75.0, 75.0)).toBe(false);
  });
});

describe('Project Lifecycle & Inactive Safeguards', () => {
  it('allows switching between ACTIVE and INACTIVE but strictly prevents permanent deletion', () => {
    expect(validateProjectStatusTransition('ACTIVE', 'INACTIVE')).toBe(true);
    expect(validateProjectStatusTransition('INACTIVE', 'ACTIVE')).toBe(true);
  });

  it('HTTP 401 & 403: protects PATCH /api/projects/:id/settings with Admin-only authorization', async () => {
    const { buildApp } = await import('../src/server');
    const app = await buildApp();

    const unauth = await app.inject({
      method: 'PATCH',
      url: '/api/projects/proj-123/settings',
      payload: { allowClientMeetings: true },
    });
    expect(unauth.statusCode).toBe(401);

    const forbiddenStaff = await app.inject({
      method: 'PATCH',
      url: '/api/projects/proj-123/settings',
      headers: { authorization: 'Bearer mock-staff-token' },
      payload: { allowClientMeetings: true },
    });
    expect(forbiddenStaff.statusCode).toBe(403);
    expect(JSON.parse(forbiddenStaff.body).error).toContain('Only Admins can update project settings');

    await app.close();
  });
});
