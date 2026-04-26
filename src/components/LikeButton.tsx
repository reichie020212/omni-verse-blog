'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toggleLike, type LikeState } from '@/lib/likes';

export function LikeButton({ slug, initial }: { slug: string; initial: LikeState }) {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname() ?? `/posts/${slug}`;
  const [state, applyOptimistic] = useOptimistic<LikeState, LikeState>(
    initial,
    (_prev, next) => next,
  );
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (session.status !== 'authenticated') {
      router.push(`/signin?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next: LikeState = {
      liked: !state.liked,
      count: state.count + (state.liked ? -1 : 1),
    };
    startTransition(async () => {
      applyOptimistic(next);
      try {
        await toggleLike(slug);
      } catch {
        applyOptimistic(state);
      }
    });
  }

  const tooltip = session.status === 'authenticated' ? undefined : 'Sign in to like';
  return (
    <button
      type="button"
      className="like-button"
      data-liked={state.liked ? 'true' : 'false'}
      aria-pressed={state.liked}
      aria-label={state.liked ? 'Remove like' : 'Like this post'}
      title={tooltip}
      disabled={pending}
      onClick={onClick}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={state.liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span>{state.count}</span>
    </button>
  );
}
