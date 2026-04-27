import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users as userTable } from './schema';
import { env } from './env';
import { verifyCredentialsImpl } from './signup';
import { bootstrapAdmin } from './bootstrap-admin';

const E2E_TEST_EMAIL = 'e2e@test.local';

void bootstrapAdmin().catch((err) => {
  console.error('[bootstrap-admin] failed:', err);
});

const providers: NextAuthConfig['providers'] = [
  GitHub,
  Google,
  Credentials({
    name: 'username',
    credentials: {
      username: { label: 'Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    authorize: async (creds) => {
      const user = await verifyCredentialsImpl(db, creds);
      if (!user) return null;
      return { id: user.id, name: user.name, role: user.role };
    },
  }),
];

if (env.E2E_TEST === '1') {
  providers.push(
    Credentials({
      id: 'e2e',
      name: 'E2E Test',
      credentials: { email: { label: 'Email', type: 'email' } },
      authorize: async (creds) => {
        if (!creds || creds.email !== E2E_TEST_EMAIL) return null;
        const existing = await db.query.users.findFirst({
          where: eq(userTable.email, E2E_TEST_EMAIL),
        });
        if (existing) {
          if (existing.role !== 'admin') {
            await db
              .update(userTable)
              .set({ role: 'admin' })
              .where(eq(userTable.id, existing.id));
            return { ...existing, role: 'admin' };
          }
          return existing;
        }
        const [created] = await db
          .insert(userTable)
          .values({
            id: 'e2e-user',
            email: E2E_TEST_EMAIL,
            name: 'E2E User',
            emailVerified: null,
            image: null,
            role: 'admin',
          })
          .returning();
        return created;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/signin' },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        const fresh = await db.query.users.findFirst({
          where: eq(userTable.id, user.id),
        });
        token.role = fresh?.role ?? 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.role = (token.role as string | undefined) ?? 'user';
      }
      return session;
    },
  },
});
