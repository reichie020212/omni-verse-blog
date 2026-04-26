type Size = 'hero' | 'wide' | 'medium' | 'small';

export function NotebookCover({ seed, size }: { seed: string; size: Size }) {
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
      <rect width="800" height="500" fill="#e8e2d0" />
      {Array.from({ length: 18 }).map((_, i) => (
        <line
          key={i}
          x1="0"
          x2="800"
          y1={50 + i * 26}
          y2={50 + i * 26}
          stroke="#a89c80"
          strokeWidth="0.5"
          opacity="0.4"
        />
      ))}
      <line x1="80" y1="0" x2="80" y2="500" stroke="#c47878" strokeWidth="1" opacity="0.5" />
      <text x="100" y="90" fontFamily="Georgia" fontStyle="italic" fontSize="42" fill="#3a3428">
        paper still
      </text>
      <text x="100" y="140" fontFamily="Georgia" fontStyle="italic" fontSize="42" fill="#3a3428">
        wins.
      </text>
    </svg>
  );
}
