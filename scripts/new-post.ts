import path from 'node:path';
import { writeFile, access } from 'node:fs/promises';
import * as p from '@clack/prompts';
import { CATEGORIES } from '../content/categories';
import {
  deriveSlug,
  deriveNextId,
  assembleFrontmatter,
} from '../src/lib/new-post';
import { loadPostsFromDir } from '../src/lib/posts';

const POSTS_DIR = path.join(process.cwd(), 'content', 'posts');
const COVER_KEYS = [
  'jovian', 'rust', 'pancakes', 'config', 'notebook', 'tabs',
  'lisbon', 'book', 'web', 'pluto', 'caldo', 'teach', 'sqlite', 'paint',
];

async function main(): Promise<void> {
  p.intro('New post');

  const title = (await p.text({
    message: 'Title',
    validate: (v) =>
      !v ? 'required' : v.length > 200 ? 'must be ≤200 chars' : undefined,
  })) as string;
  if (p.isCancel(title)) { p.cancel('aborted'); process.exit(0); }

  const proposedSlug = deriveSlug(title);
  const slug = (await p.text({
    message: 'Slug',
    initialValue: proposedSlug,
    validate: (v) => (!v || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) ? undefined : 'must be kebab-case alphanumerics'),
  })) as string;
  if (p.isCancel(slug)) { p.cancel('aborted'); process.exit(0); }

  const target = path.join(POSTS_DIR, `${slug}.mdx`);
  try {
    await access(target);
    p.cancel(`refusing to overwrite ${target}`);
    process.exit(1);
  } catch {
    /* file does not exist — good */
  }

  const excerpt = (await p.text({
    message: 'Excerpt',
    validate: (v) =>
      !v ? 'required' : v.length > 300 ? 'must be ≤300 chars' : undefined,
  })) as string;
  if (p.isCancel(excerpt)) { p.cancel('aborted'); process.exit(0); }

  const category = (await p.select({
    message: 'Category',
    options: CATEGORIES
      .filter((c) => c.id !== 'all')
      .map((c) => ({ value: c.id, label: c.label })),
  })) as string;
  if (p.isCancel(category)) { p.cancel('aborted'); process.exit(0); }

  const tagsRaw = (await p.text({
    message: 'Tags (comma-separated)',
    initialValue: '',
  })) as string;
  if (p.isCancel(tagsRaw)) { p.cancel('aborted'); process.exit(0); }
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  for (const t of tags) {
    if (t.length > 30) {
      p.cancel(`tag "${t}" exceeds 30 chars`);
      process.exit(1);
    }
  }

  const size = (await p.select({
    message: 'Size',
    options: [
      { value: 'medium', label: 'medium (default)' },
      { value: 'small', label: 'small' },
      { value: 'wide', label: 'wide' },
      { value: 'hero', label: 'hero' },
    ],
    initialValue: 'medium',
  })) as 'hero' | 'wide' | 'medium' | 'small';
  if (p.isCancel(size)) { p.cancel('aborted'); process.exit(0); }

  const cover = (await p.select({
    message: 'Cover',
    options: COVER_KEYS.map((k) => ({ value: k, label: k })),
  })) as string;
  if (p.isCancel(cover)) { p.cancel('aborted'); process.exit(0); }

  const existing = await loadPostsFromDir(POSTS_DIR, { includeDrafts: true });
  const id = deriveNextId(existing.map((post) => post.id));
  const date = new Date().toISOString().slice(0, 10);

  const file = assembleFrontmatter({
    id, slug, title, excerpt, category, tags, date, size, cover,
  });

  await writeFile(target, file, 'utf8');
  p.outro(`✓ wrote ${path.relative(process.cwd(), target)}`);
}

main().catch((err) => {
  p.cancel(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
