import { describe, it, expect } from 'vitest';
import { mulberry32, seedFromString } from './prng';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces a different sequence for a different seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(43);
    expect(a()).not.toBe(b());
  });

  it('returns values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('seedFromString', () => {
  it('is deterministic', () => {
    expect(seedFromString('jovian')).toBe(seedFromString('jovian'));
  });

  it('differs between distinct inputs', () => {
    expect(seedFromString('jovian')).not.toBe(seedFromString('rust'));
  });
});
