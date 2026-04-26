import { mulberry32, seedFromString } from '@/lib/prng';

type Size = 'hero' | 'wide' | 'medium' | 'small';

export function PlutoCover({ seed, size }: { seed: string; size: Size }) {
  void size;
  const rng = mulberry32(seedFromString(`pluto:${seed}`));
  const stars = Array.from({ length: 80 }, () => ({
    cx: rng() * 800,
    cy: rng() * 500,
    r: rng() * 0.8 + 0.3,
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
        <radialGradient id={`pluto-bg-${seed}`} cx="50%" cy="50%" r="80%">
          <stop offset="0%" stopColor="#1a1828" />
          <stop offset="100%" stopColor="#050410" />
        </radialGradient>
        <radialGradient id={`pluto-body-${seed}`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#e8d4b8" />
          <stop offset="60%" stopColor="#a88a6c" />
          <stop offset="100%" stopColor="#3a2818" />
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#pluto-bg-${seed})`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <circle cx="400" cy="250" r="170" fill={`url(#pluto-body-${seed})`} />
      <path
        d="M 340 270 Q 380 220 440 240 Q 480 280 460 320 Q 410 350 360 320 Q 320 300 340 270 Z"
        fill="#f4e4c4"
        opacity="0.7"
      />
    </svg>
  );
}
