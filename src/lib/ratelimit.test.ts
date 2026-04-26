import { describe, it, expect, beforeEach, vi } from 'vitest';
import { check, reset } from './ratelimit';

describe('rate limit', () => {
  beforeEach(() => {
    reset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));
  });

  it('allows the first call', () => {
    const r = check('user-a');
    expect(r.allowed).toBe(true);
  });

  it('blocks a second call within the window', () => {
    check('user-a');
    vi.setSystemTime(new Date('2026-04-26T12:00:10Z'));
    const r = check('user-a');
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.waitMs).toBeGreaterThan(0);
  });

  it('allows again after the window passes', () => {
    check('user-a');
    vi.setSystemTime(new Date('2026-04-26T12:00:31Z'));
    const r = check('user-a');
    expect(r.allowed).toBe(true);
  });

  it('treats different users independently', () => {
    check('user-a');
    const r = check('user-b');
    expect(r.allowed).toBe(true);
  });
});
