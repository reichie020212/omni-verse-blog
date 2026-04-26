import { mulberry32, seedFromString } from '@/lib/prng';

type Size = 'hero' | 'wide' | 'medium' | 'small';

export function BookCover({ seed, size }: { seed: string; size: Size }) {
  void size;
  const rng = mulberry32(seedFromString(`book:${seed}`));
  const stars = Array.from({ length: 100 }, () => ({
    cx: rng() * 800,
    cy: rng() * 500,
    r: rng() * 1.2 + 0.3,
    o: rng() * 0.8 + 0.1,
  }));
  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      role="img"
      aria-hidden="true"
    >
      <rect width="800" height="500" fill="#0e1820" />
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <circle cx="200" cy="200" r="80" fill="#c47840" />
      <circle cx="500" cy="280" r="60" fill="#7ec3a8" />
      <circle cx="650" cy="150" r="40" fill="#9a8ac4" />
      <line x1="200" y1="200" x2="500" y2="280" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
      <line x1="500" y1="280" x2="650" y2="150" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
      <line x1="200" y1="200" x2="650" y2="150" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}
