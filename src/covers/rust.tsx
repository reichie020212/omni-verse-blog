type Size = 'hero' | 'wide' | 'medium' | 'small';

const RUST_TOKENS = [
  'fn main()',
  'let mut x',
  '&str',
  'Result<T,E>',
  'impl Trait',
  'Box<dyn>',
  "'static",
  'match arm',
  'Vec::new()',
  'Option::Some',
  'Arc<Mutex>',
  '?Sized',
  "lifetime 'a",
  'unsafe {}',
];

export function RustCover({ seed, size }: { seed: string; size: Size }) {
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
        <linearGradient id={`rust-bg-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d1c0a" />
          <stop offset="100%" stopColor="#1a0a04" />
        </linearGradient>
      </defs>
      <rect width="800" height="500" fill={`url(#rust-bg-${seed})`} />
      {RUST_TOKENS.map((token, i) => (
        <text
          key={i}
          x={40 + (i % 4) * 200}
          y={60 + Math.floor(i / 4) * 110}
          fontFamily="ui-monospace"
          fontSize="14"
          fill="#ce6a3a"
          opacity="0.22"
        >
          {token}
        </text>
      ))}
      <text
        x="400"
        y="280"
        fontFamily="ui-monospace"
        fontSize="120"
        fontWeight="700"
        fill="#e8916a"
        textAnchor="middle"
      >
        &amp;&apos;a
      </text>
    </svg>
  );
}
