const lastPost = new Map<string, number>();
const WINDOW_MS = 30_000;

export type Verdict =
  | { allowed: true }
  | { allowed: false; waitMs: number };

export function check(userId: string): Verdict {
  const now = Date.now();
  const last = lastPost.get(userId);
  if (last !== undefined && now - last < WINDOW_MS) {
    return { allowed: false, waitMs: WINDOW_MS - (now - last) };
  }
  lastPost.set(userId, now);
  return { allowed: true };
}

/** Test-only helper. */
export function reset(): void {
  lastPost.clear();
}
