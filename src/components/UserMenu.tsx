'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

type UserLite = { id: string; name?: string | null; image?: string | null };

export function UserMenu({ user }: { user: UserLite }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const initial = (user.name?.[0] ?? 'R').toUpperCase();
  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="user-menu-button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="user-avatar" />
        ) : (
          <span className="user-avatar user-avatar-fallback" aria-hidden="true">
            {initial}
          </span>
        )}
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          <Link href="/bookmarks" className="user-menu-item" role="menuitem">
            Bookmarks
          </Link>
          <button
            type="button"
            className="user-menu-item"
            role="menuitem"
            onClick={() => signOut({ redirectTo: '/' })}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
