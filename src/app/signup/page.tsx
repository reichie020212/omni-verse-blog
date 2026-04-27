import Link from 'next/link';
import { SignUpForm } from '@/components/SignUpForm';

export const metadata = {
  title: 'Sign up',
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  return (
    <main className="signin">
      <div className="signin-card">
        <h1>Create your Omni-Verse account</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: 13, marginTop: -4 }}>
          A username and password are all you need. You can comment on posts as soon
          as you sign up.
        </p>
        <SignUpForm redirectTo={redirectTo} />
        <p className="signin-back">
          Already have an account?{' '}
          <Link href={`/signin${next ? `?next=${encodeURIComponent(next)}` : ''}`}>
            Sign in
          </Link>
        </p>
        <p className="signin-back">
          <Link href="/">← Back home</Link>
        </p>
      </div>
    </main>
  );
}
