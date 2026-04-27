import Link from 'next/link';
import { Cover } from '@/covers';
import { fmtDate } from '@/lib/format';
import type { Post } from '@/lib/posts';

const HEADING: Record<Post['size'], 'h2' | 'h3'> = {
  hero: 'h2',
  wide: 'h2',
  medium: 'h3',
  small: 'h3',
};

export function Card({ post }: { post: Post }) {
  const H = HEADING[post.size];
  return (
    <article className={`card card-${post.size}`}>
      <div className="card-cover">
        <Cover cover={post.cover} slug={post.slug} size={post.size} />
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span className="card-cat">{post.category.toLowerCase()}</span>
          <span className="card-meta-sep">•</span>
          <span>{fmtDate(post.date)}</span>
          <span className="card-meta-sep">•</span>
          <span>{post.readTime} min</span>
          <span className="card-id">{post.id}</span>
        </div>
        <H className="card-title">
          <Link href={`/posts/${post.slug}`} className="card-title-link">
            {post.title}
          </Link>
        </H>
        <p className="card-excerpt">{post.excerpt}</p>
        {post.tags.length > 0 && (
          <div
            className="card-tags"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginTop: '8px',
            }}
          >
            {post.tags.map((t) => (
              <Link key={t} href={`/tag/${t}`} className="tag-pill">
                {t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
