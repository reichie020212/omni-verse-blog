import { Card } from './Card';
import type { Post } from '@/lib/posts';

export function CardGrid({ posts }: { posts: Post[] }) {
  return (
    <div className="grid">
      {posts.map((p) => (
        <Card key={p.slug} post={p} />
      ))}
    </div>
  );
}
