import { describe, expect, it } from 'vitest';
import { envSchema } from './env';

describe('envSchema', () => {
  const valid = {
    AUTH_SECRET: 'a'.repeat(32),
    DATABASE_URL: 'file:local.db',
    SITE_URL: 'http://localhost:3000',
    E2E_TEST: '0',
    NODE_ENV: 'development',
  };

  it('parses a valid env', () => {
    expect(() => envSchema.parse(valid)).not.toThrow();
  });

  it('rejects missing AUTH_SECRET', () => {
    const { AUTH_SECRET: _omit, ...rest } = valid;
    expect(() => envSchema.parse(rest)).toThrow(/AUTH_SECRET/);
  });

  it('rejects AUTH_SECRET shorter than 32 chars', () => {
    expect(() => envSchema.parse({ ...valid, AUTH_SECRET: 'short' })).toThrow(/32/);
  });

  it('rejects SITE_URL that is not a URL', () => {
    expect(() => envSchema.parse({ ...valid, SITE_URL: 'not a url' })).toThrow();
  });

  it('defaults DATABASE_URL when omitted', () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    const parsed = envSchema.parse(rest);
    expect(parsed.DATABASE_URL).toBe('file:local.db');
  });

  it('defaults SITE_URL when omitted', () => {
    const { SITE_URL: _omit, ...rest } = valid;
    const parsed = envSchema.parse(rest);
    expect(parsed.SITE_URL).toBe('http://localhost:3000');
  });

  it('defaults E2E_TEST to "0" when omitted', () => {
    const { E2E_TEST: _omit, ...rest } = valid;
    const parsed = envSchema.parse(rest);
    expect(parsed.E2E_TEST).toBe('0');
  });

  it('rejects E2E_TEST values outside the enum', () => {
    expect(() => envSchema.parse({ ...valid, E2E_TEST: 'true' })).toThrow();
  });
});
