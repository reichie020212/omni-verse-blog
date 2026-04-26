type Size = 'hero' | 'wide' | 'medium' | 'small';

export function PaintCover({ seed, size }: { seed: string; size: Size }) {
  void seed;
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
      <rect width="800" height="500" fill="#f8f1e4" />
      <ellipse cx="200" cy="200" rx="120" ry="80" fill="#c47878" opacity="0.7" />
      <ellipse cx="500" cy="280" rx="160" ry="60" fill="#7ea8c4" opacity="0.6" />
      <ellipse cx="350" cy="350" rx="140" ry="50" fill="#c4a878" opacity="0.6" />
      <ellipse cx="600" cy="150" rx="80" ry="50" fill="#a8c478" opacity="0.7" />
      <path d="M 100 100 L 140 180" stroke="#3a2818" strokeWidth="3" strokeLinecap="round" />
      <path d="M 700 380 L 720 440" stroke="#3a2818" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
