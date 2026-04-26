type Size = 'hero' | 'wide' | 'medium' | 'small';

export function LisbonCover({ seed, size }: { seed: string; size: Size }) {
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
        <linearGradient id={`lis-bg-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4c478" />
          <stop offset="100%" stopColor="#e88c5a" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#lis-bg-${seed})`} />
      <polygon
        points="0,500 0,360 80,340 80,300 160,290 160,250 240,240 240,310 320,300 320,260 400,250 400,200 480,190 480,250 560,240 560,290 640,280 640,330 720,320 720,360 800,350 800,500"
        fill="#c44848"
        opacity="0.85"
      />
      <polygon
        points="0,500 0,400 100,390 100,360 200,350 200,380 300,370 300,330 400,320 400,360 500,350 500,310 600,300 600,360 700,350 700,390 800,380 800,500"
        fill="#8a2828"
        opacity="0.9"
      />
      {Array.from({ length: 20 }).map((_, i) => (
        <rect
          key={i}
          x={(i % 10) * 80 + 20}
          y={400 + Math.floor(i / 10) * 30}
          width="6"
          height="8"
          fill="#1a0a08"
          opacity="0.6"
        />
      ))}
    </svg>
  );
}
