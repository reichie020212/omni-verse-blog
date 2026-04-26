import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { PostFrontmatterSchema } from '../src/lib/posts';

type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'code'; lang: string; text: string };

type RawPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  readTime: number;
  size: 'hero' | 'wide' | 'medium' | 'small';
  cover: string;
  featured?: boolean;
  content: Block[];
};

async function loadRawPosts(dataPath: string): Promise<RawPost[]> {
  const source = await readFile(dataPath, 'utf8');
  const sandbox: { window: Record<string, unknown> } = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  const posts = (sandbox.window as { POSTS?: RawPost[] }).POSTS;
  if (!posts) throw new Error('data.jsx did not assign window.POSTS');
  return posts;
}

function blockToMd(b: Block): string {
  switch (b.type) {
    case 'p':
      return `${b.text}\n`;
    case 'h2':
      return `## ${b.text}\n`;
    case 'h3':
      return `### ${b.text}\n`;
    case 'code':
      return '```' + b.lang + '\n' + b.text + '\n```\n';
  }
}

function escapeYamlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

function buildFrontmatter(p: RawPost): string {
  const lines = [
    '---',
    `id: ${escapeYamlString(p.id)}`,
    `title: ${escapeYamlString(p.title)}`,
    `slug: ${escapeYamlString(p.slug)}`,
    `excerpt: ${escapeYamlString(p.excerpt)}`,
    `category: ${p.category}`,
    `tags: [${p.tags.join(', ')}]`,
    `date: ${escapeYamlString(p.date)}`,
    `readTime: ${p.readTime}`,
    `size: ${p.size}`,
    `cover: ${p.cover}`,
  ];
  if (p.featured) lines.push('featured: true');
  lines.push('---');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const dataPath = path.join(process.cwd(), 'data.jsx');
  const outDir = path.join(process.cwd(), 'content', 'posts');
  await mkdir(outDir, { recursive: true });

  const raw = await loadRawPosts(dataPath);
  let written = 0;
  for (const p of raw) {
    const fm = buildFrontmatter(p);
    const body = p.content.map(blockToMd).join('\n');
    const mdx = `${fm}\n\n${body}`.trimEnd() + '\n';

    const validated = PostFrontmatterSchema.safeParse({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      category: p.category,
      tags: p.tags,
      date: p.date,
      readTime: p.readTime,
      size: p.size,
      cover: p.cover,
      featured: p.featured ?? false,
      draft: false,
    });
    if (!validated.success) {
      throw new Error(
        `Post ${p.slug} fails Zod validation: ${JSON.stringify(validated.error.format(), null, 2)}`,
      );
    }

    const file = path.join(outDir, `${p.slug}.mdx`);
    await writeFile(file, mdx, 'utf8');
    written++;
  }
  console.log(`Wrote ${written} MDX files to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
