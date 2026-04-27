import { z } from 'zod';

export const envSchema = z.object({
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be ≥32 chars; run `pnpm auth:secret`'),
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  DATABASE_URL: z.string().default('file:local.db'),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.enum(['true', 'false']).optional(),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  E2E_TEST: z.enum(['0', '1']).default('0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ADMIN_USERNAME: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,32}$/, 'ADMIN_USERNAME must be 3–32 chars [a-zA-Z0-9_]')
    .optional(),
  ADMIN_PASSWORD: z.string().min(8, 'ADMIN_PASSWORD must be ≥8 chars').optional(),
});

export type Env = z.infer<typeof envSchema>;

export function assertNotE2EInProduction(parsed: Env): void {
  if (parsed.NODE_ENV === 'production' && parsed.E2E_TEST === '1') {
    throw new Error('E2E_TEST=1 is not allowed in production');
  }
}

const parsed = envSchema.parse(process.env);
// Note: assertNotE2EInProduction is exported for unit-testing but NOT called at
// module level.  Next.js router-server mutates process.env.NODE_ENV to 'production'
// after lazy route chunks are loaded, so a module-level guard fires incorrectly
// during E2E runs.  The real safeguard lives in auth.ts: the Credentials provider
// is only registered when E2E_TEST='1', which is never set in real deployments.

export const env = parsed;
