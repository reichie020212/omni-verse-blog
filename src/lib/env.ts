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
  SITE_URL: z.string().url().default('http://localhost:3000'),
  E2E_TEST: z.enum(['0', '1']).default('0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV === 'production' && parsed.E2E_TEST === '1') {
  throw new Error('E2E_TEST=1 is not allowed in production');
}

export const env = parsed;
