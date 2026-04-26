import Link from 'next/link';
import { signIn } from '@/lib/auth';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return (
    <main className="signin">
      <div className="signin-card">
        <h1>Sign in to Omni-Verse</h1>
        {error ? (
          <p className="signin-error" role="alert">
            Sign-in failed. Try again or pick another provider.
          </p>
        ) : null}
        <form
          action={async () => {
            'use server';
            await signIn('github', { redirectTo });
          }}
        >
          <button type="submit" className="oauth-button github">
            Continue with GitHub
          </button>
        </form>
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo });
          }}
        >
          <button type="submit" className="oauth-button google">
            Continue with Google
          </button>
        </form>
        <p className="signin-back">
          <Link href="/">← Back home</Link>
        </p>
      </div>
    </main>
  );
}
