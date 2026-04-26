import { mulberry32, seedFromString } from '@/lib/prng';

type Size = 'hero' | 'wide' | 'medium' | 'small';

function viewBoxFor(size: Size): { w: number; h: number } {
  switch (size) {
    case 'hero':
    case 'wide':
      return { w: 800, h: 450 };
    case 'medium':
      return { w: 800, h: 600 };
    case 'small':
      return { w: 800, h: 800 };
  }
}

export function DefaultCover({ seed, size }: { seed: string; size: Size }) {
  const { w, h } = viewBoxFor(size);
  const rng = mulberry32(seedFromString(seed));
  const stops = Array.from({ length: 20 }, () => ({
    x: rng() * w,
    y: rng() * h,
    r: rng() * 1.2 + 0.4,
    a: rng() * 0.5 + 0.2,
  }));
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`bg-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1a1d24" />
          <stop offset="100%" stopColor="#0a0c10" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#bg-${seed})`} />
      {stops.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.a} />
      ))}
    </svg>
  );
}
