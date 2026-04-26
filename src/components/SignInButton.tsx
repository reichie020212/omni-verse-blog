'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SignInButton() {
  const pathname = usePathname() ?? '/';
  const next = encodeURIComponent(pathname);
  return (
    <Link href={`/signin?next=${next}`} className="signin-link">
      Sign in
    </Link>
  );
}
