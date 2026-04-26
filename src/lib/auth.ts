import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users as userTable } from './schema';
import { env } from './env';

const E2E_TEST_EMAIL = 'e2e@test.local';

const baseProviders: NextAuthConfig['providers'] = [GitHub, Google];

if (env.E2E_TEST === '1') {
  baseProviders.push(
    Credentials({
      name: 'E2E Test',
      credentials: { email: { label: 'Email', type: 'email' } },
      authorize: async (creds) => {
        if (!creds || creds.email !== E2E_TEST_EMAIL) return null;
        const existing = await db.query.users.findFirst({
          where: eq(userTable.email, E2E_TEST_EMAIL),
        });
        if (existing) return existing;
        const [created] = await db
          .insert(userTable)
          .values({
            id: 'e2e-user',
            email: E2E_TEST_EMAIL,
            name: 'E2E User',
            emailVerified: null,
            image: null,
          })
          .returning();
        return created;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: baseProviders,
  session: { strategy: env.E2E_TEST === '1' ? 'jwt' : 'database' },
  pages: { signIn: '/signin' },
  callbacks: {
    // In JWT mode (E2E only), surface the user id on session.user so server
    // actions that read session.user.id behave the same as in DB-session mode.
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = (user?.id ?? token?.sub) as string;
      }
      return session;
    },
  },
});
