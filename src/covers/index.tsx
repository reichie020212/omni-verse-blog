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
import { JPG_COVERS } from './manifest';

type Size = 'hero' | 'wide' | 'medium' | 'small';

const SIZE_DIMENSIONS: Record<Size, { width: number; height: number }> = {
  hero:   { width: 1200, height: 675 },
  wide:   { width: 800,  height: 450 },
  medium: { width: 600,  height: 400 },
  small:  { width: 400,  height: 250 },
};

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

export function Cover({
  cover,
  slug,
  size,
}: {
  cover: string;
  slug: string;
  size: Size;
}) {
  if (JPG_COVERS.has(slug)) {
    const dim = SIZE_DIMENSIONS[size];
    return (
      <Image
        src={`/covers/${slug}.jpg`}
        alt=""
        width={dim.width}
        height={dim.height}
        className="cover-image"
        priority={size === 'hero'}
      />
    );
  }
  const Generator = GENERATORS[cover] ?? DefaultCover;
  return <Generator seed={slug} size={size} />;
}
