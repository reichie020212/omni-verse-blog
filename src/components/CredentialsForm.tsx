'use client';

import { useActionState } from 'react';
import { credentialsSignInAction, type SignInResult } from '@/lib/signin-actions';

export function CredentialsForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState<SignInResult | null, FormData>(
    credentialsSignInAction,
    null,
  );

  return (
    <form action={action} className="credentials-form">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <label className="credentials-field">
        <span>Username</span>
        <input
          name="username"
          type="text"
          autoComplete="username"
          required
        />
      </label>
      <label className="credentials-field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>
      {state && !state.ok ? (
        <p className="signin-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="oauth-button" disabled={pending}>
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
