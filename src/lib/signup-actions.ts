'use server';

import { signIn } from './auth';
import { db } from './db';
import { signupImpl, type SignupResult } from './signup';

export async function signupAction(
  _prev: SignupResult | null,
  formData: FormData,
): Promise<SignupResult> {
  const username = formData.get('username');
  const password = formData.get('password');

  const result = await signupImpl(db, { username, password });
  if (!result.ok) return result;

  await signIn('credentials', {
    username: typeof username === 'string' ? username.toLowerCase() : '',
    password,
    redirect: false,
  });
  return result;
}
