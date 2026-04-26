import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await db.run(sql`SELECT 1`);
    return Response.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : 'unknown';
    return Response.json({ ok: false, error }, { status: 503 });
  }
}
