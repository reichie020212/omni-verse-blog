import { mulberry32, seedFromString } from '@/lib/prng';

type Size = 'hero' | 'wide' | 'medium' | 'small';

export function JovianCover({ seed, size }: { seed: string; size: Size }) {
  void size;
  const rng = mulberry32(seedFromString(`jovian:${seed}`));
  const stars = Array.from({ length: 60 }, () => ({
    cx: rng() * 800,
    cy: rng() * 500,
    r: rng() * 0.9 + 0.3,
    o: rng() * 0.7 + 0.2,
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
      <defs>
        <radialGradient id={`jov-bg-${seed}`} cx="30%" cy="40%" r="80%">
          <stop offset="0%" stopColor="#2b1a3a" />
          <stop offset="100%" stopColor="#0a0816" />
        </radialGradient>
        <radialGradient id={`jov-planet-${seed}`} cx="40%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#d9a376" />
          <stop offset="55%" stopColor="#a8633e" />
          <stop offset="100%" stopColor="#3a1a0e" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#jov-bg-${seed})`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <circle cx="560" cy="260" r="180" fill={`url(#jov-planet-${seed})`} />
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse
          key={i}
          cx="560"
          cy={210 + i * 22}
          rx={180 - Math.abs(i - 2) * 15}
          ry="6"
          fill="#000"
          opacity="0.18"
        />
      ))}
      <circle cx="180" cy="180" r="14" fill="#e8d4a8" />
      <circle cx="180" cy="180" r="14" fill="#e8d4a8" opacity="0.4" />
      <circle cx="120" cy="340" r="9" fill="#a8c3d4" />
      <circle cx="290" cy="380" r="6" fill="#c9a374" />
    </svg>
  );
}
