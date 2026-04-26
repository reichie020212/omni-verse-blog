import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { fmtDate, fmtRelative } from './format';

describe('fmtDate', () => {
  it('formats an ISO date as "Mon D, YYYY"', () => {
    expect(fmtDate('2026-04-22')).toBe('Apr 22, 2026');
  });

  it('handles January correctly', () => {
    expect(fmtDate('2026-01-03')).toBe('Jan 3, 2026');
  });
});

describe('fmtRelative', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    // 2026-04-26 12:00:00 UTC
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'));
  });

  afterAll(() => vi.useRealTimers());

  it('returns "today" for the same day', () => {
    expect(fmtRelative('2026-04-26')).toBe('today');
  });

  it('returns "yesterday" for one day ago', () => {
    expect(fmtRelative('2026-04-25')).toBe('yesterday');
  });

  it('returns "Nd ago" for 2..6 days', () => {
    expect(fmtRelative('2026-04-20')).toBe('6d ago');
  });

  it('returns "Nw ago" for 7..29 days', () => {
    expect(fmtRelative('2026-04-19')).toBe('1w ago');
    expect(fmtRelative('2026-03-28')).toBe('4w ago');
  });

  it('returns "Nmo ago" for 30..364 days', () => {
    expect(fmtRelative('2026-03-27')).toBe('1mo ago');
  });

  it('returns "Ny ago" for 365+ days', () => {
    expect(fmtRelative('2025-04-26')).toBe('1y ago');
  });
});
