import { fmtDate } from '@/lib/format';
import { Cover } from '@/covers';
import type { Post } from '@/lib/posts';

export function ArticleHeader({ post }: { post: Post }) {
  return (
    <header className="article-header">
      <div className="article-meta">
        <span className="article-id">{post.id}</span>
        <span className="article-category">{post.category}</span>
        <span className="article-date">{fmtDate(post.date)}</span>
        <span className="article-readtime">{post.readTime} min read</span>
      </div>
      <h1 className="article-title">{post.title}</h1>
      <p className="article-excerpt">{post.excerpt}</p>
      <div className="article-cover">
        <Cover cover={post.cover} slug={post.slug} size="hero" />
      </div>
    </header>
  );
}
