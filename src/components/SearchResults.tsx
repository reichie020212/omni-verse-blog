import Link from 'next/link';
import { Cover } from '@/covers';
import { fmtDate } from '@/lib/format';
import { highlight } from '@/lib/highlight';
import { getPostBySlug } from '@/lib/posts';
import type { ServerMatch } from '@/lib/search-server';

export async function SearchResults({
  query,
  matches,
}: {
  query: string;
  matches: ServerMatch[];
}) {
  if (!query) {
    return (
      <section className="search-results-empty">
        <p>Type something in the topbar to search.</p>
      </section>
    );
  }
  if (matches.length === 0) {
    return (
      <section className="search-results-empty">
        <p>
          No posts match <q>{query}</q>.
        </p>
      </section>
    );
  }
  const resolved = await Promise.all(
    matches.map(async (m) => ({
      m,
      post: await getPostBySlug(m.entry.slug),
    })),
  );
  return (
    <section className="search-results">
      <header className="search-results-header">
        <h1>
          {matches.length} result{matches.length === 1 ? '' : 's'} for <q>{query}</q>
        </h1>
      </header>
      <ul className="search-results-list">
        {resolved.map(({ m, post }) =>
          post ? (
            <li key={post.slug} className="search-result">
              <Link href={`/posts/${post.slug}`} className="search-result-link">
                <div className="search-result-cover">
                  <Cover cover={post.cover} slug={post.slug} size="small" />
                </div>
                <div className="search-result-body">
                  <div className="search-result-meta">
                    <span>{post.category}</span>
                    <span>{fmtDate(post.date)}</span>
                    <span>{post.readTime} min</span>
                  </div>
                  <h2 className="search-result-title">
                    {highlight(post.title, m.fields.title ?? [])}
                  </h2>
                  <p className="search-result-excerpt">
                    {highlight(post.excerpt, m.fields.excerpt ?? [])}
                  </p>
                  {post.tags.length > 0 && (
                    <ul className="search-result-tags">
                      {post.tags.map((t) => (
                        <li key={t}>#{t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </Link>
            </li>
          ) : null,
        )}
      </ul>
    </section>
  );
}
