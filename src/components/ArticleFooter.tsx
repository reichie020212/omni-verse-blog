import Link from 'next/link';
import type { Post } from '@/lib/posts';

export function ArticleFooter({ post }: { post: Post }) {
  return (
    <footer className="article-footer">
      <div className="article-tags">
        {post.tags.map((t) => (
          <Link key={t} href={`/tag/${t}`} className="tag-pill">
            {t}
          </Link>
        ))}
      </div>
      <p className="article-back">
        <Link href={`/category/${post.category}`}>← More in {post.category}</Link>
      </p>
    </footer>
  );
}
