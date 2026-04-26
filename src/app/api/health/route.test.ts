import { describe, expect, it, vi, beforeEach } from 'vitest';

const { runMock } = vi.hoisted(() => ({ runMock: vi.fn() }));

vi.mock('@/lib/db', () => ({
  db: { run: runMock },
}));

import { GET } from './route';

describe('GET /api/health', () => {
  beforeEach(() => {
    runMock.mockReset();
  });

  it('returns 200 {ok:true} when the DB ping succeeds', async () => {
    runMock.mockResolvedValueOnce(undefined);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 503 {ok:false, error} when the DB ping fails', async () => {
    runMock.mockRejectedValueOnce(new Error('libsql: closed'));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('libsql');
  });

  it('returns 503 with a generic message when the error is not an Error instance', async () => {
    runMock.mockRejectedValueOnce('weird thrown value');
    const res = await GET();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe('unknown');
  });
});
