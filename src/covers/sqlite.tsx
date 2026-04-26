type Size = 'hero' | 'wide' | 'medium' | 'small';

export function SqliteCover({ seed, size }: { seed: string; size: Size }) {
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
        <linearGradient id={`sql-bg-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1c3a4a" />
          <stop offset="100%" stopColor="#0a1a24" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#sql-bg-${seed})`} />
      <rect
        x="280"
        y="160"
        width="240"
        height="180"
        fill="none"
        stroke="#7ec3c8"
        strokeWidth="2"
        rx="6"
      />
      <line x1="280" y1="200" x2="520" y2="200" stroke="#7ec3c8" strokeWidth="1" />
      <text x="300" y="188" fontFamily="ui-monospace" fontSize="12" fill="#7ec3c8">
        db.sqlite
      </text>
      <text x="300" y="225" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">
        id | name
      </text>
      <line x1="280" y1="232" x2="520" y2="232" stroke="#7ec3c8" strokeWidth="0.5" opacity="0.5" />
      <text x="300" y="252" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">
        01 | one file
      </text>
      <text x="300" y="272" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">
        02 | zero ops
      </text>
      <text x="300" y="292" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">
        03 | fast
      </text>
      <text x="300" y="320" fontFamily="ui-monospace" fontSize="14" fill="#7ec38a">
        SELECT * FROM joy;
      </text>
    </svg>
  );
}
