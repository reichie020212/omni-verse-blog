import Link from 'next/link';
import { Cover } from '@/covers';
import { fmtDate } from '@/lib/format';
import { getAllPosts, type Post } from '@/lib/posts';
import { rankRelated } from '@/lib/related';

export async function RelatedPosts({ post }: { post: Post }) {
  const all = await getAllPosts();
  const related = rankRelated(post, all);
  if (related.length === 0) return null;
  return (
    <aside className="related-posts" aria-label="Related posts">
      <h2 className="related-heading">Related</h2>
      <ul className="related-list">
        {related.map((r) => (
          <li key={r.slug} className="related-item">
            <Link href={`/posts/${r.slug}`} className="related-link">
              <div className="related-cover">
                <Cover
                  cover={r.cover}
                  slug={r.slug}
                  size="small"
                  hasCoverImage={r.hasCoverImage}
                />
              </div>
              <div className="related-meta">
                <span className="related-date">{fmtDate(r.date)}</span>
                <h3 className="related-title">{r.title}</h3>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
