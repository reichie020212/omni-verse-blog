'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { toggleBookmark } from '@/lib/bookmarks-actions';
import { useToast } from './ToastProvider';

const STORAGE_KEY = 'ovb-bookmarks';

function readLocal(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocal(slugs: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // ignore
  }
}

export function BookmarkButton({
  slug,
  initialBookmarked,
}: {
  slug: string;
  initialBookmarked?: boolean;
}) {
  const session = useSession();
  const toast = useToast();
  const [bookmarked, setBookmarked] = useState<boolean>(initialBookmarked ?? false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (session.status !== 'authenticated' && initialBookmarked === undefined) {
      setBookmarked(readLocal().includes(slug));
    }
  }, [session.status, initialBookmarked, slug]);

  function onClick() {
    if (session.status !== 'authenticated') {
      const slugs = readLocal();
      const has = slugs.includes(slug);
      const next = has ? slugs.filter((s) => s !== slug) : [...slugs, slug];
      writeLocal(next);
      setBookmarked(!has);
      toast.show(has ? 'Removed bookmark' : 'Bookmarked');
      return;
    }
    startTransition(async () => {
      const prev = bookmarked;
      setBookmarked(!prev);
      try {
        const result = await toggleBookmark(slug);
        setBookmarked(result.bookmarked);
        toast.show(result.bookmarked ? 'Bookmarked' : 'Removed bookmark');
      } catch {
        setBookmarked(prev);
        toast.show('Could not update bookmark');
      }
    });
  }

  return (
    <button
      type="button"
      className="bookmark-button"
      data-bookmarked={bookmarked ? 'true' : 'false'}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this post'}
      disabled={pending}
      onClick={onClick}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={bookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
