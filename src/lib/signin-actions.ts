'use server';

import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { signIn } from './auth';

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function credentialsSignInAction(
  _prev: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('redirectTo') ?? '/');
  const safeRedirect = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  try {
    await signIn('credentials', {
      username,
      password,
      redirect: false,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { ok: false, error: 'Invalid username or password' };
    }
    throw err;
  }
  redirect(safeRedirect);
}
