import Link from 'next/link';
import type { Post } from '@/lib/posts';

export function ArticleFooter({ post }: { post: Post }) {
  return (
    <footer className="article-footer">
      <ul className="article-tags">
        {post.tags.map((t) => (
          <li key={t}>
            <Link href={`/tag/${t}`} className="tag-chip">
              #{t}
            </Link>
          </li>
        ))}
      </ul>
      <p className="article-back">
        <Link href={`/category/${post.category}`}>← More in {post.category}</Link>
      </p>
    </footer>
  );
}
