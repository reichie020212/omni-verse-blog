export type NewPostInput = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  size: 'hero' | 'wide' | 'medium' | 'small';
  cover: string;
};

export function deriveSlug(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new Error(`title "${title}" yields an empty slug`);
  return slug;
}

const ID_RE = /^0x[0-9a-f]{3}$/;

export function deriveNextId(existing: readonly string[]): string {
  const numbers = existing
    .filter((s) => ID_RE.test(s))
    .map((s) => parseInt(s.slice(2), 16));
  const max = numbers.length === 0 ? -1 : Math.max(...numbers);
  const next = max + 1;
  if (next > 0xfff) throw new Error('post id space overflow (>0xfff)');
  return `0x${next.toString(16).padStart(3, '0')}`;
}

function yamlString(value: string): string {
  // Only quote if the string contains characters that require quoting in YAML
  if (!/['":#\[\]{},&*?|<>=!%@`]/.test(value) && !/^\s/.test(value)) {
    return value;
  }
  if (!value.includes('"')) return `"${value}"`;
  return `'${value.replace(/'/g, "''")}'`;
}

export function assembleFrontmatter(input: NewPostInput): string {
  const tagsLiteral =
    input.tags.length === 0 ? '[]' : `[${input.tags.join(', ')}]`;
  return [
    '---',
    // id is hex notation (e.g. 0x010); quote so YAML parsers treat it as string
    `id: '${input.id}'`,
    `slug: ${input.slug}`,
    `title: ${yamlString(input.title)}`,
    `excerpt: ${yamlString(input.excerpt)}`,
    `category: ${input.category}`,
    `tags: ${tagsLiteral}`,
    // date is ISO YYYY-MM-DD; quote so YAML parsers treat it as string not Date
    `date: '${input.date}'`,
    `readTime: 1`,
    `size: ${input.size}`,
    `cover: ${input.cover}`,
    `draft: true`,
    '---',
    '',
    'Write your post here.',
    '',
  ].join('\n');
}
