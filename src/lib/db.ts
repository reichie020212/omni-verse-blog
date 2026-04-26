import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { env } from './env';

const url = env.DATABASE_URL;
const authToken = env.DATABASE_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });
export const db = drizzle(client, { schema });
export type DB = typeof db;
