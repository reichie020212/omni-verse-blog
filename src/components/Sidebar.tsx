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
  const popularTags = tags.slice(0, 12);

  return (
    <aside className="sidebar">
      <nav aria-label="Categories" className="sidebar-section">
        <h2 className="sidebar-heading">Categories</h2>
        <ul className="category-list">
          {CATEGORIES.map((c) => {
            const isActive =
              (c.id === 'all' && !activeCategory) || activeCategory === c.id;
            const count = counts[c.id] ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={c.id === 'all' ? '/' : `/category/${c.id}`}
                  className="category-link"
                  data-active={isActive ? 'true' : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{c.label}</span>
                  <span className="count">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {session?.user ? (
        <nav aria-label="Yours" className="sidebar-section">
          <h2 className="sidebar-heading">Yours</h2>
          <ul className="category-list">
            <li>
              <Link href="/bookmarks" className="category-link">
                <span>Bookmarks</span>
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}

      <nav aria-label="Popular tags" className="sidebar-section">
        <h2 className="sidebar-heading">Popular tags</h2>
        <ul className="tag-cloud">
          {popularTags.map((t) => (
            <li key={t.name}>
              <Link
                href={`/tag/${t.name}`}
                className="tag-chip"
                data-active={activeTag === t.name ? 'true' : undefined}
                aria-current={activeTag === t.name ? 'page' : undefined}
              >
                #{t.name}
                <span className="count">{t.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
