import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Load .env.local into process.env before any test module is evaluated.
// This ensures env.ts (which calls envSchema.parse(process.env) at module level)
// has the required AUTH_SECRET when imported by tests.
try {
  const envLocal = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  for (const line of envLocal.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
} catch {
  // .env.local is optional in CI — variables should be set via the environment
}
