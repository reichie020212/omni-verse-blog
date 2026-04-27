'use client';

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  // Initial state must match the server (where `document` is unavailable)
  // to avoid a hydration mismatch. The actual theme — set by the FOUC-prevention
  // script before React mounts — is read in useEffect post-hydration.
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setTheme(t === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('ovb-theme', next);
      localStorage.setItem('ovb-theme-manual', '1');
    } catch {
      /* private mode / disabled storage — fail silently */
    }
  }

  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      aria-pressed={mounted ? theme === 'dark' : undefined}
      onClick={toggle}
    >
      {mounted ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {theme === 'dark' ? (
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </>
          )}
        </svg>
      ) : (
        <svg width="16" height="16" aria-hidden="true" />
      )}
    </button>
  );
}
