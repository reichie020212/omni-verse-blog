import { mulberry32, seedFromString } from '@/lib/prng';

type Size = 'hero' | 'wide' | 'medium' | 'small';

export function CaldoCover({ seed, size }: { seed: string; size: Size }) {
  void size;
  const rng = mulberry32(seedFromString(`caldo:${seed}`));
  const grains = Array.from({ length: 30 }, () => ({
    cx: 250 + rng() * 300,
    cy: 240 + rng() * 30,
    r: rng() * 4 + 2,
    o: rng() * 0.8 + 0.2,
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
      <rect width="800" height="500" fill="#3a2814" />
      <ellipse cx="400" cy="280" rx="240" ry="60" fill="#1a0e08" />
      <ellipse cx="400" cy="260" rx="240" ry="50" fill="#e8c878" />
      <ellipse cx="400" cy="258" rx="220" ry="42" fill="#f4d488" />
      {grains.map((g, i) => (
        <circle key={i} cx={g.cx} cy={g.cy} r={g.r} fill="#fff" opacity={g.o} />
      ))}
      <path
        d="M 360 200 Q 365 170 360 140 Q 355 170 360 200"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M 400 200 Q 405 160 400 130 Q 395 160 400 200"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
      <path
        d="M 440 200 Q 445 170 440 145 Q 435 170 440 200"
        stroke="#fff"
        strokeWidth="2"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}
