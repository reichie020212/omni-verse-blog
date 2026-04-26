'use client';

import { useMemo } from 'react';
import { useSearch } from './SearchProvider';
import { CardGrid } from './CardGrid';
import type { Post } from '@/lib/posts';

export function FilteredGrid({ posts }: { posts: Post[] }) {
  const { matchedSlugs } = useSearch();

  const visible = useMemo(() => {
    if (matchedSlugs === null) return posts;
    return posts.filter((p) => matchedSlugs.has(p.slug));
  }, [posts, matchedSlugs]);

  if (visible.length === 0) {
    return (
      <div className="empty-state">
        <p>No posts match.</p>
      </div>
    );
  }

  return <CardGrid posts={visible} />;
}
