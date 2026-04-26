type Size = 'hero' | 'wide' | 'medium' | 'small';

export function PancakesCover({ seed, size }: { seed: string; size: Size }) {
  void size;
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
        <linearGradient id={`pan-bg-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4dfb4" />
          <stop offset="100%" stopColor="#d9a874" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#pan-bg-${seed})`} />
      <ellipse cx="400" cy="380" rx="220" ry="36" fill="#a8743f" />
      <ellipse cx="400" cy="350" rx="210" ry="32" fill="#d9a266" />
      <ellipse cx="400" cy="320" rx="200" ry="30" fill="#e8b878" />
      <ellipse cx="400" cy="290" rx="190" ry="28" fill="#f4cc8c" />
      <ellipse cx="400" cy="262" rx="180" ry="26" fill="#fae0a4" />
      <path
        d="M 280 260 Q 400 220 520 260 L 510 280 Q 400 250 290 280 Z"
        fill="#e8a648"
        opacity="0.7"
      />
    </svg>
  );
}
