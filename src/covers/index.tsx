import { existsSync } from 'node:fs';
import path from 'node:path';
import Image from 'next/image';
import { DefaultCover } from './default';
import { JovianCover } from './jovian';
import { RustCover } from './rust';
import { PancakesCover } from './pancakes';
import { ConfigCover } from './config';
import { NotebookCover } from './notebook';
import { TabsCover } from './tabs';
import { LisbonCover } from './lisbon';
import { BookCover } from './book';
import { WebCover } from './web';
import { PlutoCover } from './pluto';
import { CaldoCover } from './caldo';
import { TeachCover } from './teach';
import { SqliteCover } from './sqlite';
import { PaintCover } from './paint';

type Size = 'hero' | 'wide' | 'medium' | 'small';

const GENERATORS: Record<string, React.ComponentType<{ seed: string; size: Size }>> = {
  jovian: JovianCover,
  rust: RustCover,
  pancakes: PancakesCover,
  config: ConfigCover,
  notebook: NotebookCover,
  tabs: TabsCover,
  lisbon: LisbonCover,
  book: BookCover,
  web: WebCover,
  pluto: PlutoCover,
  caldo: CaldoCover,
  teach: TeachCover,
  sqlite: SqliteCover,
  paint: PaintCover,
};

const ASPECT: Record<Size, { w: number; h: number }> = {
  hero: { w: 1600, h: 900 },
  wide: { w: 1600, h: 900 },
  medium: { w: 800, h: 600 },
  small: { w: 800, h: 800 },
};

export function Cover({
  cover,
  slug,
  size,
}: {
  cover: string;
  slug: string;
  size: Size;
}) {
  const jpgPath = path.join(process.cwd(), 'public', 'covers', `${cover}.jpg`);
  if (existsSync(jpgPath)) {
    const a = ASPECT[size];
    return (
      <Image
        src={`/covers/${cover}.jpg`}
        alt=""
        width={a.w}
        height={a.h}
        priority={size === 'hero'}
      />
    );
  }
  const Generator = GENERATORS[cover] ?? DefaultCover;
  return <Generator seed={slug} size={size} />;
}
