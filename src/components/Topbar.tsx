import Link from 'next/link';
import { auth } from '@/lib/auth';
import { ThemeToggle } from './ThemeToggle';
import { SearchInput } from './SearchInput';
import { UserMenu } from './UserMenu';
import { SignInButton } from './SignInButton';

export async function Topbar() {
  const session = await auth();
  return (
    <header className="topbar" role="banner">
      <Link href="/" className="brand" aria-label="Omni-Verse Blog home">
        <span className="brand-mark" aria-hidden="true">
          Ω
        </span>
        <span>
          <span className="brand-prompt">~/</span>
          <span className="brand-name">omni-verse</span>
          <span className="brand-cursor" aria-hidden="true" />
        </span>
      </Link>
      <SearchInput />
      <nav aria-label="Primary" className="topbar-nav">
        <ThemeToggle />
        {session?.user ? (
          <UserMenu
            user={{
              id: session.user.id!,
              name: session.user.name,
              image: session.user.image,
            }}
          />
        ) : (
          <SignInButton />
        )}
      </nav>
    </header>
  );
}
