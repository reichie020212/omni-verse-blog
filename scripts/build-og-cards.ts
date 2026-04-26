import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { loadPostsFromDir } from '../src/lib/posts';

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const OUT_DIR = path.join(ROOT, 'public', 'og');
const FONTS_DIR = path.join(ROOT, 'assets', 'fonts');

const ACCENT = '#7CFFB2';
const BG = '#0E1116';
const FG = '#E6EDF3';
const FG_MUTED = '#9DA7B3';

type FontSpec = {
  name: string;
  data: Buffer;
  weight: 400 | 600;
  style: 'normal';
};

async function loadFonts(): Promise<FontSpec[]> {
  const [serif, mono] = await Promise.all([
    readFile(path.join(FONTS_DIR, 'SourceSerif4-SemiBold.ttf')),
    readFile(path.join(FONTS_DIR, 'JetBrainsMono-Regular.ttf')),
  ]);
  return [
    { name: 'SourceSerif4', data: serif, weight: 600, style: 'normal' },
    { name: 'JetBrainsMono', data: mono, weight: 400, style: 'normal' },
  ];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function card({ title, meta }: { title: string; meta: string }): Parameters<typeof satori>[0] {
  const node: any = {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BG,
        padding: '64px',
        fontFamily: 'SourceSerif4',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontFamily: 'JetBrainsMono',
              fontSize: '24px',
              color: FG_MUTED,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: ACCENT,
                    color: BG,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  },
                  children: 'Ω',
                },
              },
              { type: 'span', props: { children: '~/omni-verse' } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontSize: '72px',
              lineHeight: 1.1,
              color: FG,
              fontWeight: 600,
              maxWidth: '1000px',
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              fontFamily: 'JetBrainsMono',
              fontSize: '24px',
              color: FG_MUTED,
            },
            children: meta,
          },
        },
      ],
    },
  };
  return node;
}

async function renderPng(node: Parameters<typeof satori>[0], fonts: FontSpec[]): Promise<Buffer> {
  const svg = await satori(node, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return Buffer.from(png);
}

async function fileNewerThan(file: string, ref: string): Promise<boolean> {
  try {
    const [a, b] = await Promise.all([stat(file), stat(ref)]);
    return a.mtimeMs > b.mtimeMs;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const fonts = await loadFonts();

  // Default card
  const defaultPath = path.join(OUT_DIR, 'default.png');
  const defaultPng = await renderPng(
    card({ title: 'Omni-Verse Blog', meta: "A blog about whatever won't leave my head" }),
    fonts,
  );
  await writeFile(defaultPath, defaultPng);
  console.log(`wrote ${path.relative(ROOT, defaultPath)}`);

  const posts = await loadPostsFromDir(POSTS_DIR, { includeDrafts: false });
  let written = 0;
  let skipped = 0;
  for (const post of posts) {
    const out = path.join(OUT_DIR, `${post.slug}.png`);
    const src = path.join(POSTS_DIR, `${post.slug}.mdx`);
    if (await fileNewerThan(out, src)) {
      skipped++;
      continue;
    }
    const meta = `${post.date} · ${post.readTime} min read`;
    const png = await renderPng(card({ title: post.title, meta }), fonts);
    await writeFile(out, png);
    written++;
  }
  console.log(`og cards: ${written} written, ${skipped} up-to-date`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
