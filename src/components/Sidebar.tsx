import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { getCategoryCounts, getAllTags } from '@/lib/posts';
import { auth } from '@/lib/auth';

export async function Sidebar({
  activeCategory,
  activeTag,
}: {
  activeCategory?: string;
  activeTag?: string;
}) {
  const [counts, tags, session] = await Promise.all([
    getCategoryCounts(),
    getAllTags(),
    auth(),
  ]);
  const popularTags = tags.slice(0, 14);

  return (
    <aside className="sidebar">
      <nav aria-label="Categories">
        <div className="side-section-label">
          <span>Categories</span>
        </div>
        <div className="cat-list">
          {CATEGORIES.map((c) => {
            const isActive =
              (c.id === 'all' && !activeCategory) || activeCategory === c.id;
            const count = counts[c.id] ?? 0;
            return (
              <Link
                key={c.id}
                href={c.id === 'all' ? '/' : `/category/${c.id}`}
                className="cat-item"
                data-active={isActive ? 'true' : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="cat-left">
                  <span className="cat-dot" />
                  <span>{c.label}</span>
                </span>
                <span className="cat-count">{count}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {session?.user ? (
        <nav aria-label="Yours">
          <div className="side-section-label">
            <span>Yours</span>
          </div>
          <div className="cat-list">
            <Link href="/bookmarks" className="cat-item">
              <span className="cat-left">
                <span className="cat-dot" />
                <span>Bookmarks</span>
              </span>
            </Link>
          </div>
        </nav>
      ) : null}

      <nav aria-label="Popular tags">
        <div className="side-section-label">
          <span>Popular tags</span>
        </div>
        <div className="side-tags">
          {popularTags.map((t) => (
            <Link
              key={t.name}
              href={`/tag/${t.name}`}
              className="side-tag"
              data-active={activeTag === t.name ? 'true' : undefined}
              aria-current={activeTag === t.name ? 'page' : undefined}
            >
              #{t.name}
            </Link>
          ))}
        </div>
      </nav>
    </aside>
  );
}
