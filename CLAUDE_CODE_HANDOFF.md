# Omni-Verse Blog — Claude Code Handoff

A handoff prompt for building the production version of **Omni-Verse Blog**, a personal blog site by Red covering tech, programming, celestial bodies, family, and anything else worth writing about.

---

## Prompt for Claude Code

> Build a production-ready personal blog called **Omni-Verse Blog** based on the design prototype in this project (`Omni-Verse Blog.html` + `app.jsx` + `styles.css` + `data.jsx` + `covers.jsx`). The prototype demonstrates the complete UI, interactions, and visual system — your job is to turn it into a real, deployable, content-managed website while preserving every design decision.
>
> ### Stack
>
> - **Framework:** Next.js 15 (App Router) with React Server Components.
> - **Language:** TypeScript, strict mode.
> - **Styling:** Keep the existing `styles.css` token system as CSS variables. Port to CSS Modules or Tailwind v4 with `@theme` — whichever lets the existing tokens (`--bg`, `--fg`, `--accent`, `--font-mono`, etc.) carry over verbatim. Do not introduce a UI library.
> - **Content:** MDX files in `/content/posts/*.mdx` with frontmatter (`title`, `excerpt`, `category`, `tags`, `date`, `readTime`, `cover`, `id`). Parse with `next-mdx-remote` or `contentlayer`. Categories live in `/content/categories.ts` and are open-ended — Red wants to add new ones (`tech`, `programming`, `celestial`, `family`, `travel`, `books`, `food`, `essays`, plus future ones) without code changes beyond appending to that file.
> - **Database:** SQLite via Drizzle ORM for likes, bookmarks (per-user), and comments. Single file, zero ops, easy backups.
> - **Auth:** Auth.js (NextAuth) with GitHub + Google providers. **Critical:** all posts must be readable without an account. Auth gates only commenting and reactions, never reading.
> - **Deployment:** Vercel or any Node host. SQLite via Turso for production if multi-region.
>
> ### Routes
>
> - `/` — Magazine homepage. Hero post (latest) + mixed grid (wide/medium/small cards). Server-rendered with category counts.
> - `/posts/[slug]` — Full article page. Reading progress bar, related posts, comments, reactions. Open Graph / Twitter cards from frontmatter.
> - `/category/[id]` — Filtered listing.
> - `/tag/[name]` — Tag-filtered listing.
> - `/search?q=…` — Full-text search results (use SQLite FTS5 or `fuse.js` on a built-in index).
> - `/bookmarks` — Per-user bookmark page (signed-in) or localStorage-backed (anonymous).
> - `/api/likes`, `/api/bookmarks`, `/api/comments` — Server actions or route handlers.
>
> ### Article-view decision
>
> The prototype opens articles in a **slide-in drawer** for snappy browsing. In production, do both: real `/posts/[slug]` pages for SEO and direct linking, plus client-side intercept (Next's parallel/intercepting routes) so clicking a card from the homepage opens the drawer overlay while still updating the URL. Direct visits to `/posts/[slug]` render as full pages.
>
> ### Features to preserve from the prototype
>
> 1. **Light/dark theme** — defaults to `prefers-color-scheme`, persists manual override in localStorage. Use `next-themes` or equivalent and avoid FOUC with a blocking inline script.
> 2. **Live search** — debounced input in the topbar with `/` keyboard shortcut. Results update as you type. Highlight matches.
> 3. **Category filter sidebar** — sticky, scrollable, shows live counts.
> 4. **Popular tags** — pulled from frontmatter, sorted by frequency.
> 5. **Active-filter chips** — remove individually or "clear all".
> 6. **Sort** — newest / popular (likes + comments) / oldest.
> 7. **Bookmarks** — localStorage for anonymous, synced to DB on sign-in (merge strategy: union).
> 8. **Likes** — signed-in only; show a tooltip nudge for anonymous users. Optimistic UI updates.
> 9. **Comments** — signed-in only. Markdown subset (bold, italic, code, links). Soft-delete. Anonymous users see a clear sign-in prompt where the form would be.
> 10. **Related posts** — same category OR shared tags, ranked.
> 11. **Reading progress bar** in the article view.
> 12. **Toast notifications** for "bookmarked", "link copied", etc.
> 13. **Tweaks panel** — keep it as a dev-only feature behind a query flag (`?tweaks=1`) for design iteration; ship without it for end users.
>
> ### Design system (lift exactly)
>
> - Tokens in `:root` and `[data-theme="dark"]` — copy as-is.
> - Type stack: Inter (UI), Source Serif 4 (article body), JetBrains Mono (metadata, IDs, breadcrumbs, code).
> - Accent: `oklch(72% 0.14 155)` (light) / `oklch(78% 0.16 155)` (dark) — minty green, used sparingly.
> - Card sizes: `card-hero`, `card-wide`, `card-medium`, `card-small` mapped to a 6-column grid.
> - Cover placeholders: the SVG generators in `covers.jsx` are intentionally illustrative — replace with real cover images per post (`cover` frontmatter pointing to `/public/covers/*.jpg`), with the SVG generators kept as fallback when `cover` is missing.
>
> ### Content authoring
>
> Provide a CLI script `pnpm new-post` that scaffolds an MDX file with frontmatter, a generated post ID (`0x` + 3 hex digits, incremented), today's date, and an empty body. Document the workflow in `CONTRIBUTING.md`.
>
> ### Quality bar
>
> - **Lighthouse:** ≥95 on Performance, Accessibility, Best Practices, SEO for `/` and a representative post.
> - **Accessibility:** keyboard navigable end-to-end, focus visible, ARIA where needed (drawer is a real `dialog`, sidebar nav is a `nav`, search has a label).
> - **Reduced motion:** respect `prefers-reduced-motion` — drawer slides become fades, blinking cursor stops, hover lifts disappear.
> - **Tests:** Vitest for utilities (date formatting, filtering, sorting), Playwright for the critical flows (open drawer, filter by category, search, bookmark a post, sign in and comment).
> - **No client JS for things that can be server-rendered.** The grid, sidebar, and article body are static; only search input, drawer transitions, theme toggle, likes/bookmarks, and comments need client interactivity.
>
> ### Deliverables
>
> 1. Working repo with the above stack.
> 2. Seed it with the 15 prototype posts converted to MDX.
> 3. `README.md` covering local dev, content authoring, deployment.
> 4. `CONTRIBUTING.md` covering the post-authoring workflow.
> 5. A short `MIGRATION.md` documenting any deviations from the prototype and why.
>
> Read every file in the prototype before starting. Match the prototype's exact spacing, typography, and interaction feel — the design has been signed off. If you must deviate, flag it in `MIGRATION.md` first.

---

## Files in this project to read first

- `Omni-Verse Blog.html` — entry point, font imports, script tags
- `styles.css` — full design token system, all component CSS
- `app.jsx` — every component, every interaction, every state shape
- `data.jsx` — sample posts and category list (treat as seed data)
- `covers.jsx` — generative cover placeholders (treat as fallback)
- `tweaks-panel.jsx` — dev-only, do not ship to users

## Author

**Red** — sole author, blog handle `@red`. Avatar uses the letter "R" on the accent green.

## Site identity

- **Name:** Omni-Verse Blog
- **Brand mark:** capital omega `Ω` in a rounded square, plus the prompt-style wordmark `~/omni-verse` with a blinking accent-green cursor.
- **Tagline:** "A blog about tech, programming, celestial bodies, family, and whatever else won't leave my head."
