import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getPostBySlug } from '@/lib/posts';

export const runtime = 'nodejs';
export const revalidate = 86400;

const ACCENT = '#7CFFB2';
const BG = '#0E1116';
const FG = '#E6EDF3';
const FG_MUTED = '#9DA7B3';

const FONTS_DIR = path.join(process.cwd(), 'assets', 'fonts');

async function loadFonts() {
  const [serif, mono] = await Promise.all([
    readFile(path.join(FONTS_DIR, 'SourceSerif4-SemiBold.ttf')),
    readFile(path.join(FONTS_DIR, 'JetBrainsMono-Regular.ttf')),
  ]);
  return [
    { name: 'SourceSerif4', data: serif, weight: 600 as const, style: 'normal' as const },
    { name: 'JetBrainsMono', data: mono, weight: 400 as const, style: 'normal' as const },
  ];
}

function Card({ title, meta }: { title: string; meta: string }) {
  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: BG,
        padding: '64px',
        fontFamily: 'SourceSerif4',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'JetBrainsMono',
          fontSize: '24px',
          color: FG_MUTED,
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: ACCENT,
            color: BG,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
          }}
        >
          Ω
        </div>
        <span>~/omni-verse</span>
      </div>
      <div
        style={{
          fontSize: '72px',
          lineHeight: 1.1,
          color: FG,
          fontWeight: 600,
          maxWidth: '1000px',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: 'JetBrainsMono',
          fontSize: '24px',
          color: FG_MUTED,
        }}
      >
        {meta}
      </div>
    </div>
  );
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const post = await getPostBySlug(slug);
  const title = post?.title ?? 'Omni-Verse Blog';
  const meta = post
    ? `${post.date} · ${post.readTime} min read`
    : "A blog about whatever won't leave my head";

  const fonts = await loadFonts();
  return new ImageResponse(<Card title={title} meta={meta} />, {
    width: 1200,
    height: 630,
    fonts,
  });
}
