import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { SearchInput } from './SearchInput';

export function Topbar() {
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
      </nav>
    </header>
  );
}
