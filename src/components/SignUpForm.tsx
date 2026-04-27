'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signupAction } from '@/lib/signup-actions';
import type { SignupResult } from '@/lib/signup';

export function SignUpForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SignupResult | null, FormData>(
    signupAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.replace(redirectTo);
      router.refresh();
    }
  }, [state, redirectTo, router]);

  return (
    <form action={action} className="credentials-form">
      <label className="credentials-field">
        <span>Username</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9_]+"
        />
      </label>
      <label className="credentials-field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
        />
      </label>
      {state && !state.ok ? (
        <p className="signin-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="oauth-button" disabled={pending}>
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}
