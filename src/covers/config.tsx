type Size = 'hero' | 'wide' | 'medium' | 'small';

const CONFIG_LINES = [
  'server:',
  '  host: 0.0.0.0',
  '  port: 8080',
  'database:',
  '  url: postgres://...',
  '  pool: 10',
  'features:',
  '  - auth',
  '  - billing',
  'env: production',
];

export function ConfigCover({ seed, size }: { seed: string; size: Size }) {
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
      <rect width="800" height="500" fill="#0e1116" />
      <text x="40" y="60" fontFamily="ui-monospace" fontSize="13" fill="#5a6470">
        # config.yaml
      </text>
      {CONFIG_LINES.map((line, i) => (
        <text
          key={i}
          x="40"
          y={92 + i * 22}
          fontFamily="ui-monospace"
          fontSize="13"
          fill={i === 4 || i === 9 ? '#7ec38a' : '#c8cdd4'}
        >
          {line}
        </text>
      ))}
      <text
        x="640"
        y="420"
        fontFamily="ui-monospace"
        fontSize="80"
        fontWeight="700"
        fill="#ce4040"
        textAnchor="end"
        opacity="0.85"
      >
        {'{}'}
      </text>
    </svg>
  );
}
