// app.jsx — Omni-Verse Blog main app

const { useState, useEffect, useMemo, useRef, useCallback } = React;

// ───────────────────────────────────────────────────────────
// Icons (inline SVG, hairline)
// ───────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
    bookmarkFill: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="currentColor" />,
    heart: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
    heartFill: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor" />,
    comment: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
    close: <><path d="M18 6L6 18" /><path d="M6 6l18 18" transform="scale(0.667)" /></>,
    x: <><path d="M18 6 6 18M6 6l12 12" /></>,
    arrowLeft: <><path d="M19 12H5M12 19l-7-7 7-7" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a7 7 0 0 1 14 0v1" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    sliders: <><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="6" r="2" fill="var(--bg)" /><circle cx="15" cy="12" r="2" fill="var(--bg)" /><circle cx="7" cy="18" r="2" fill="var(--bg)" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

// ───────────────────────────────────────────────────────────
// Theme hook (system + manual override)
// ───────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('ovb-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ovb-theme', theme);
  }, [theme]);
  // Listen to system changes if user hasn't overridden in this session
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (!localStorage.getItem('ovb-theme-manual')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const toggle = () => {
    localStorage.setItem('ovb-theme-manual', '1');
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };
  return [theme, toggle];
}

// ───────────────────────────────────────────────────────────
// Persistent state hook
// ───────────────────────────────────────────────────────────
function usePersisted(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }, [key, val]);
  return [val, setVal];
}

// ───────────────────────────────────────────────────────────
// Date / format helpers
// ───────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtRelative = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

// ───────────────────────────────────────────────────────────
// Toast
// ───────────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = useState('');
  const tref = useRef(null);
  const show = (m) => {
    setMsg(m);
    clearTimeout(tref.current);
    tref.current = setTimeout(() => setMsg(''), 2200);
  };
  const node = <div className="toast" data-show={!!msg}>{msg}</div>;
  return [show, node];
}

// ───────────────────────────────────────────────────────────
// Topbar
// ───────────────────────────────────────────────────────────
function Topbar({ search, setSearch, theme, toggleTheme, signedIn, setSignedIn, bookmarkCount, onShowBookmarks, searchRef }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">Ω</span>
        <span><span className="brand-prompt">~/</span><span className="brand-name">omni-verse</span><span className="brand-cursor" /></span>
      </div>

      <div className="search-wrap">
        <span className="search-icon"><Icon name="search" size={15} /></span>
        <input
          ref={searchRef}
          className="search"
          type="text"
          placeholder="search posts, tags, or topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search ? (
          <button className="search-clear" onClick={() => setSearch('')} aria-label="clear search">✕</button>
        ) : (
          <span className="search-kbd">/</span>
        )}
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" onClick={onShowBookmarks} data-active={bookmarkCount > 0 ? 'true' : 'false'} title="Bookmarks" aria-label="bookmarks">
          <Icon name="bookmarkFill" size={16} />
        </button>
        <button className="icon-btn" onClick={toggleTheme} title="Toggle theme" aria-label="toggle theme">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
        </button>
        <div className="user-chip" data-anon={signedIn ? 'false' : 'true'} onClick={() => setSignedIn(!signedIn)} role="button" title={signedIn ? 'Sign out' : 'Sign in'}>
          <span className="user-avatar">{signedIn ? 'R' : '?'}</span>
          <span>{signedIn ? 'red' : 'anonymous'}</span>
        </div>
      </div>
    </header>
  );
}

// ───────────────────────────────────────────────────────────
// Sidebar
// ───────────────────────────────────────────────────────────
function Sidebar({ activeCategory, setCategory, categoryCounts, allTags, activeTag, setTag, totalPosts, bookmarkCount }) {
  return (
    <aside className="sidebar">
      <div>
        <div className="side-section-label"><span>Categories</span><span style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-faint)' }}>{Object.keys(categoryCounts).length - 1}</span></div>
        <div className="cat-list">
          {window.CATEGORIES.map((c) => (
            <button
              key={c.id}
              className="cat-item"
              data-active={activeCategory === c.id}
              onClick={() => setCategory(c.id)}
            >
              <span className="cat-left">
                <span className="cat-dot" />
                <span>{c.label}</span>
              </span>
              <span className="cat-count">{categoryCounts[c.id] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="side-section-label"><span>Popular tags</span></div>
        <div className="side-tags">
          {allTags.slice(0, 14).map((t) => (
            <button
              key={t}
              className="side-tag"
              data-active={activeTag === t}
              onClick={() => setTag(activeTag === t ? null : t)}
            >#{t}</button>
          ))}
        </div>
      </div>

      <div className="side-stats">
        <div><b>{totalPosts}</b> posts published</div>
        <div><b>{bookmarkCount}</b> bookmarked</div>
        <div style={{ marginTop: 8, opacity: 0.7 }}>last build: 04.26.26</div>
      </div>
    </aside>
  );
}

// ───────────────────────────────────────────────────────────
// PostCard
// ───────────────────────────────────────────────────────────
function PostCard({ post, sizeClass, onOpen, bookmarked, onToggleBookmark, liked, likeCount }) {
  const cat = window.CATEGORIES.find((c) => c.id === post.category);
  return (
    <article className={`card ${sizeClass}`} onClick={() => onOpen(post.id)} style={{ cursor: 'pointer' }}>
      <div className="card-cover">
        <window.CoverPlaceholder kind={post.cover} label={`cover ${post.id}`} />
      </div>
      <div className="card-body">
        <div className="card-meta">
          <span className="card-cat">{cat?.label.toLowerCase()}</span>
          <span className="card-meta-sep">•</span>
          <span>{fmtDate(post.date)}</span>
          <span className="card-meta-sep">•</span>
          <span>{post.readTime} min read</span>
          <span className="card-id">{post.id}</span>
        </div>
        <h3 className="card-title">{post.title}</h3>
        <p className="card-excerpt">{post.excerpt}</p>
        <div className="card-footer">
          <div className="card-footer-left">
            <span className="card-stat" data-liked={liked ? 'true' : 'false'}>
              <Icon name={liked ? 'heartFill' : 'heart'} size={13} /> {likeCount}
            </span>
            <span className="card-stat">
              <Icon name="comment" size={13} /> {post.comments}
            </span>
          </div>
          <button
            className="card-bookmark"
            data-saved={bookmarked ? 'true' : 'false'}
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(post.id); }}
            aria-label="bookmark"
          >
            <Icon name={bookmarked ? 'bookmarkFill' : 'bookmark'} size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

// ───────────────────────────────────────────────────────────
// Article drawer
// ───────────────────────────────────────────────────────────
function ArticleDrawer({ post, open, onClose, signedIn, setSignedIn, bookmarked, onToggleBookmark, liked, onToggleLike, likeCount, comments, onAddComment, onLikeComment, onOpen, allPosts, toast }) {
  const bodyRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    const handle = () => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0);
    };
    el.addEventListener('scroll', handle);
    el.scrollTop = 0;
    handle();
    return () => el.removeEventListener('scroll', handle);
  }, [open, post?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!post) return null;
  const cat = window.CATEGORIES.find((c) => c.id === post.category);

  const related = allPosts
    .filter((p) => p.id !== post.id && (p.category === post.category || p.tags.some((t) => post.tags.includes(t))))
    .slice(0, 4);

  return (
    <>
      <div className="drawer-backdrop" data-open={open} onClick={onClose} />
      <aside className="drawer" data-open={open} role="dialog" aria-modal="true">
        <div className="drawer-header">
          <button className="icon-btn" onClick={onClose} aria-label="close">
            <Icon name="arrowLeft" size={16} />
          </button>
          <div className="drawer-crumb">~/posts/<b style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>{post.id}</b></div>
          <div className="drawer-actions">
            <button className="icon-btn" onClick={() => onToggleBookmark(post.id)} aria-label="bookmark">
              <Icon name={bookmarked ? 'bookmarkFill' : 'bookmark'} size={16} />
            </button>
            <button className="icon-btn" onClick={() => toast('link copied')} aria-label="share">
              <Icon name="share" size={16} />
            </button>
          </div>
          <div className="drawer-progress" style={{ width: `${progress}%` }} />
        </div>

        <div className="drawer-body" ref={bodyRef}>
          <div className="drawer-cover">
            <window.CoverPlaceholder kind={post.cover} label={`cover ${post.id}`} />
          </div>
          <div className="article">
            <div className="article-meta">
              <span className="article-cat">{cat?.label.toLowerCase()}</span>
              <span>•</span>
              <span>{fmtDate(post.date)}</span>
              <span>•</span>
              <span>{post.readTime} min read</span>
            </div>
            <h1 className="article-title">{post.title}</h1>
            <p className="article-excerpt">{post.excerpt}</p>

            <div className="article-author">
              <span className="author-avatar">R</span>
              <div>
                <div className="author-name">Red</div>
                <div className="author-handle">@red · author</div>
              </div>
            </div>

            <div className="article-body">
              {post.content.map((block, i) => {
                if (block.type === 'p') return <p key={i}>{block.text}</p>;
                if (block.type === 'h2') return <h2 key={i}>{block.text}</h2>;
                if (block.type === 'code') return (
                  <pre key={i}>
                    <span className="lang-tag">{block.lang}</span>
                    <code>{block.text}</code>
                  </pre>
                );
                return null;
              })}
            </div>

            <div className="article-tags">
              {post.tags.map((t) => <span key={t} className="tag-pill">{t}</span>)}
            </div>

            <div className="reactions">
              <button
                className="reaction-btn"
                data-active={liked ? 'true' : 'false'}
                onClick={() => onToggleLike(post.id)}
              >
                <Icon name={liked ? 'heartFill' : 'heart'} size={14} />
                <span>{likeCount}</span>
              </button>
              <button
                className="reaction-btn"
                onClick={() => bodyRef.current?.querySelector('.comments')?.scrollIntoView({ block: 'start' })}
              >
                <Icon name="comment" size={14} />
                <span>{comments.length}</span>
              </button>
              <button className="reaction-btn" onClick={() => { onToggleBookmark(post.id); }}>
                <Icon name={bookmarked ? 'bookmarkFill' : 'bookmark'} size={14} />
                <span>{bookmarked ? 'saved' : 'save'}</span>
              </button>
            </div>

            <section className="comments">
              <div className="comments-header">
                <h3 className="comments-title">Comments<span className="count">{comments.length}</span></h3>
              </div>

              {signedIn ? (
                <div className="comment-form">
                  <span className="comment-avatar" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>R</span>
                  <textarea
                    placeholder="Add to the conversation…"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={2}
                  />
                  <button
                    className="comment-submit"
                    disabled={!comment.trim()}
                    onClick={() => { onAddComment(post.id, comment); setComment(''); toast('posted'); }}
                  >reply</button>
                </div>
              ) : (
                <div className="comment-anon-note">
                  reading anonymously — no account needed.<br />
                  <button onClick={() => setSignedIn(true)}>sign in</button> to leave a comment or reaction.
                </div>
              )}

              <div className="comment-list">
                {comments.map((c, i) => (
                  <div key={i} className="comment">
                    <span className="comment-avatar">{c.author[0].toUpperCase()}</span>
                    <div className="comment-body">
                      <div className="comment-head">
                        <span className="comment-name">{c.author}</span>
                        <span className="comment-meta">@{c.author.toLowerCase().replace(/\s+/g, '')} · {fmtRelative(c.at)}</span>
                      </div>
                      <p className="comment-text">{c.text}</p>
                      <div className="comment-actions">
                        <button data-active={c.liked ? 'true' : 'false'} onClick={() => onLikeComment(post.id, i)}>
                          ♥ {c.likes + (c.liked ? 1 : 0)}
                        </button>
                        <button>reply</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {related.length > 0 && (
              <section className="related">
                <div className="related-label">Related posts</div>
                <div className="related-list">
                  {related.map((r) => (
                    <button key={r.id} className="related-card" onClick={() => onOpen(r.id)}>
                      <div className="related-thumb">
                        <window.CoverPlaceholder kind={r.cover} label="" />
                      </div>
                      <div className="related-info">
                        <div className="related-cat">{window.CATEGORIES.find((c) => c.id === r.category)?.label.toLowerCase()}</div>
                        <h4 className="related-title">{r.title}</h4>
                        <div className="related-meta">{r.readTime} min · {fmtRelative(r.date)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

// ───────────────────────────────────────────────────────────
// Tweaks defaults (for the panel)
// ───────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentHue": 155,
  "fontPair": "mono-sans",
  "density": "cozy",
  "showSidebar": true,
  "cardStyle": "bordered"
}/*EDITMODE-END*/;

// ───────────────────────────────────────────────────────────
// App
// ───────────────────────────────────────────────────────────
function App() {
  const [theme, toggleTheme] = useTheme();
  const [search, setSearch] = useState('');
  const [activeCategory, setCategory] = useState('all');
  const [activeTag, setTag] = useState(null);
  const [sort, setSort] = useState('newest');
  const [openId, setOpenId] = useState(null);
  const [signedIn, setSignedIn] = usePersisted('ovb-signed-in', false);
  const [bookmarks, setBookmarks] = usePersisted('ovb-bookmarks', []);
  const [likes, setLikes] = usePersisted('ovb-likes', []);
  const [commentMap, setCommentMap] = usePersisted('ovb-comments', {});
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [toast, toastNode] = useToast();
  const searchRef = useRef(null);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply tweaks via CSS variables
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--accent', `oklch(${theme === 'dark' ? '78%' : '72%'} 0.14 ${tweaks.accentHue})`);
    r.style.setProperty('--accent-bg', `oklch(${theme === 'dark' ? '78%' : '72%'} 0.14 ${tweaks.accentHue} / ${theme === 'dark' ? '0.14' : '0.12'})`);
    r.style.setProperty('--selection', `oklch(${theme === 'dark' ? '78%' : '72%'} 0.14 ${tweaks.accentHue} / 0.3)`);
    if (tweaks.fontPair === 'mono-sans') {
      r.style.setProperty('--font-sans', "'Inter', system-ui, sans-serif");
    } else if (tweaks.fontPair === 'serif-mono') {
      r.style.setProperty('--font-sans', "'Source Serif 4', Georgia, serif");
    } else {
      r.style.setProperty('--font-sans', "'JetBrains Mono', ui-monospace, monospace");
    }
  }, [tweaks, theme]);

  // Keyboard: '/' to focus search, esc to clear
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allPosts = window.POSTS;
  const allTags = useMemo(() => {
    const set = new Set();
    allPosts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [allPosts]);

  const categoryCounts = useMemo(() => {
    const counts = { all: allPosts.length };
    allPosts.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [allPosts]);

  const filtered = useMemo(() => {
    let r = allPosts;
    if (showBookmarksOnly) r = r.filter((p) => bookmarks.includes(p.id));
    if (activeCategory !== 'all') r = r.filter((p) => p.category === activeCategory);
    if (activeTag) r = r.filter((p) => p.tags.includes(activeTag));
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }
    if (sort === 'newest') r = [...r].sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sort === 'popular') r = [...r].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments));
    else if (sort === 'oldest') r = [...r].sort((a, b) => new Date(a.date) - new Date(b.date));
    return r;
  }, [allPosts, search, activeCategory, activeTag, sort, showBookmarksOnly, bookmarks]);

  // Layout: hero (largest, latest) + magazine grid
  const layoutSize = (post, idx) => {
    if (idx === 0 && tweaks.density === 'cozy' && filtered.length > 4) return 'card-hero';
    const sizeMap = { hero: 'card-hero', wide: 'card-wide', medium: 'card-medium', small: 'card-small' };
    if (idx === 0) return 'card-wide';
    if ((idx - 1) % 5 === 0) return 'card-wide';
    if ((idx - 1) % 5 === 1 || (idx - 1) % 5 === 2) return 'card-medium';
    return 'card-small';
  };

  // Handlers
  const toggleBookmark = (id) => {
    setBookmarks((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
    toast(bookmarks.includes(id) ? 'removed bookmark' : 'bookmarked');
  };
  const toggleLike = (id) => {
    if (!signedIn) { toast('sign in to react'); return; }
    setLikes((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  };
  const initialComments = (post) => ([
    { author: 'Maya K.', text: 'This put words to something I have been circling for months. Thank you.', at: '2026-04-23', likes: 12, liked: false },
    { author: 'devnull', text: 'Saved. Read it twice. Will reread.', at: '2026-04-22', likes: 4, liked: false },
    { author: 'Atlas', text: 'Hard disagree on point 2 but the rest is gold.', at: '2026-04-22', likes: 7, liked: false },
  ]);
  const getComments = (postId) => {
    if (commentMap[postId]) return commentMap[postId];
    const post = allPosts.find((p) => p.id === postId);
    return post ? initialComments(post).slice(0, Math.min(post.comments, 3)) : [];
  };
  const addComment = (postId, text) => {
    setCommentMap((m) => ({
      ...m,
      [postId]: [{ author: 'Red', text, at: new Date().toISOString(), likes: 0, liked: false }, ...getComments(postId)],
    }));
  };
  const likeComment = (postId, idx) => {
    if (!signedIn) { toast('sign in to react'); return; }
    setCommentMap((m) => {
      const cur = m[postId] || getComments(postId);
      const next = cur.map((c, i) => i === idx ? { ...c, liked: !c.liked } : c);
      return { ...m, [postId]: next };
    });
  };

  const openPost = openId ? allPosts.find((p) => p.id === openId) : null;
  const openComments = openPost ? getComments(openPost.id) : [];
  const openLikeCount = openPost ? openPost.likes + (likes.includes(openPost.id) ? 1 : 0) : 0;

  const showSidebar = tweaks.showSidebar;

  return (
    <>
      <Topbar
        search={search}
        setSearch={setSearch}
        theme={theme}
        toggleTheme={toggleTheme}
        signedIn={signedIn}
        setSignedIn={setSignedIn}
        bookmarkCount={bookmarks.length}
        onShowBookmarks={() => { setShowBookmarksOnly(!showBookmarksOnly); setCategory('all'); }}
        searchRef={searchRef}
      />

      <div className="shell" style={!showSidebar ? { gridTemplateColumns: '1fr' } : {}}>
        {showSidebar && (
          <Sidebar
            activeCategory={activeCategory}
            setCategory={(id) => { setCategory(id); setShowBookmarksOnly(false); }}
            categoryCounts={categoryCounts}
            allTags={allTags}
            activeTag={activeTag}
            setTag={setTag}
            totalPosts={allPosts.length}
            bookmarkCount={bookmarks.length}
          />
        )}

        <main className="main">
          <div className="page-header">
            <div>
              <div className="crumb">
                ~/<b>{showBookmarksOnly ? 'bookmarks' : (activeCategory === 'all' ? 'all-posts' : activeCategory)}</b>
                {activeTag && <> / <b>#{activeTag}</b></>}
                {search.trim() && <> / search:"<b>{search}</b>"</>}
              </div>
              <h1 className="page-title">
                {showBookmarksOnly ? 'Your bookmarks' :
                 search.trim() ? `Searching "${search}"` :
                 activeTag ? `#${activeTag}` :
                 activeCategory === 'all' ? 'Everything I think about' :
                 window.CATEGORIES.find((c) => c.id === activeCategory)?.label}
              </h1>
              {activeCategory === 'all' && !search && !activeTag && !showBookmarksOnly && (
                <p className="page-sub">A blog about tech, programming, celestial bodies, family, and whatever else won't leave my head. Written by Red.</p>
              )}
            </div>
            <div className="sort-bar">
              {['newest', 'popular', 'oldest'].map((s) => (
                <button key={s} className="sort-btn" data-active={sort === s} onClick={() => setSort(s)}>{s}</button>
              ))}
            </div>
          </div>

          {(activeTag || activeCategory !== 'all' || showBookmarksOnly || search.trim()) && (
            <div className="filter-bar">
              <span className="filter-label">filters:</span>
              {showBookmarksOnly && (
                <button className="filter-chip" data-active="true" onClick={() => setShowBookmarksOnly(false)}>
                  bookmarks <span className="filter-chip-x">×</span>
                </button>
              )}
              {activeCategory !== 'all' && (
                <button className="filter-chip" data-active="true" onClick={() => setCategory('all')}>
                  {window.CATEGORIES.find((c) => c.id === activeCategory)?.label.toLowerCase()} <span className="filter-chip-x">×</span>
                </button>
              )}
              {activeTag && (
                <button className="filter-chip" data-active="true" onClick={() => setTag(null)}>
                  #{activeTag} <span className="filter-chip-x">×</span>
                </button>
              )}
              {search.trim() && (
                <button className="filter-chip" data-active="true" onClick={() => setSearch('')}>
                  "{search}" <span className="filter-chip-x">×</span>
                </button>
              )}
              <button
                className="filter-chip"
                onClick={() => { setSearch(''); setCategory('all'); setTag(null); setShowBookmarksOnly(false); }}
                style={{ marginLeft: 'auto' }}
              >clear all</button>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-mono">$ grep -r "{search || activeTag || activeCategory}" ./posts</div>
              <h3>No matches found</h3>
              <p>Try a different search, or <button style={{ background: 'transparent', border: 0, color: 'var(--accent)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', padding: 0 }} onClick={() => { setSearch(''); setCategory('all'); setTag(null); setShowBookmarksOnly(false); }}>clear all filters</button>.</p>
            </div>
          ) : (
            <div className="grid">
              {filtered.map((post, idx) => (
                <PostCard
                  key={post.id}
                  post={post}
                  sizeClass={layoutSize(post, idx)}
                  onOpen={setOpenId}
                  bookmarked={bookmarks.includes(post.id)}
                  onToggleBookmark={toggleBookmark}
                  liked={likes.includes(post.id)}
                  likeCount={post.likes + (likes.includes(post.id) ? 1 : 0)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <ArticleDrawer
        post={openPost}
        open={!!openId}
        onClose={() => setOpenId(null)}
        signedIn={signedIn}
        setSignedIn={setSignedIn}
        bookmarked={openPost ? bookmarks.includes(openPost.id) : false}
        onToggleBookmark={toggleBookmark}
        liked={openPost ? likes.includes(openPost.id) : false}
        onToggleLike={toggleLike}
        likeCount={openLikeCount}
        comments={openComments}
        onAddComment={addComment}
        onLikeComment={likeComment}
        onOpen={(id) => { setOpenId(null); setTimeout(() => setOpenId(id), 250); }}
        allPosts={allPosts}
        toast={toast}
      />

      {toastNode}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme" />
        <TweakSlider label="Accent hue" value={tweaks.accentHue} min={0} max={360} step={5} unit="°" onChange={(v) => setTweak('accentHue', v)} />
        <TweakRadio label="Font" value={tweaks.fontPair} options={[
          { value: 'mono-sans', label: 'sans' },
          { value: 'serif-mono', label: 'serif' },
          { value: 'mono-only', label: 'mono' },
        ]} onChange={(v) => setTweak('fontPair', v)} />

        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={tweaks.density} options={[
          { value: 'compact', label: 'compact' },
          { value: 'cozy', label: 'cozy' },
          { value: 'roomy', label: 'roomy' },
        ]} onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="Show sidebar" value={tweaks.showSidebar} onChange={(v) => setTweak('showSidebar', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
