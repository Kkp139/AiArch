import { describe, it, expect } from 'vitest';
import {
  sanitizePushPayload,
  calculateNextRetryDelay,
  MAX_PUSH_RETRIES,
  PushPayload,
} from '../src/processors/push.processor';

describe('Push Retry & Privacy Engine', () => {
  it('strips monetary amounts and bank details from push text to protect privacy', () => {
    const raw = 'Payment of Rs 5,00,000 received via HDFC Bank NEFT 12345';
    const sanitized = sanitizePushPayload(raw, 'LAP');
    expect(sanitized).toBe('A payment update has been recorded for Project LAP. Log in to view details.');
  });

  it('preserves non-sensitive operational messages without alteration', () => {
    const raw = 'New revision uploaded for Ground Floor Electrical Plan in Category 02_CONSTRUCTION_DRAWINGS.';
    const sanitized = sanitizePushPayload(raw, 'LAP');
    expect(sanitized).toBe('New revision uploaded for Ground Floor Electrical Plan in Category 02_CONSTRUCTION_DRAWINGS.');
  });

  it('strips OTP and credential text from push previews', () => {
    const raw = 'Your one-time login OTP is 948201. Valid for 10 minutes.';
    const sanitized = sanitizePushPayload(raw, 'LAP');
    expect(sanitized).not.toContain('948201');
    expect(sanitized).toContain('Log in to view details');
  });

  it('calculates exact 1+3 backoff retry delays (+1m, +5m, +15m)', () => {
    expect(calculateNextRetryDelay(1)).toBe(60 * 1000); // Attempt 1: +1 min
    expect(calculateNextRetryDelay(2)).toBe(5 * 60 * 1000); // Attempt 2: +5 min
    expect(calculateNextRetryDelay(3)).toBe(15 * 60 * 1000); // Attempt 3: +15 min
    expect(calculateNextRetryDelay(4)).toBe(null); // Max retries exhausted
  });

  it('defines max retry attempts as 3 (1 initial + 3 retries = 4 total attempts)', () => {
    expect(MAX_PUSH_RETRIES).toBe(3);
  });
});
