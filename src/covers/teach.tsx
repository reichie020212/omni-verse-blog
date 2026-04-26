type Size = 'hero' | 'wide' | 'medium' | 'small';

export function TeachCover({ seed, size }: { seed: string; size: Size }) {
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
      <rect width="800" height="500" fill="#fce8e4" />
      <rect x="80" y="80" width="640" height="340" fill="#1a1d22" rx="8" />
      <rect x="80" y="80" width="640" height="32" fill="#0a0c10" rx="8" />
      <text x="100" y="160" fontFamily="ui-monospace" fontSize="14" fill="#7ec38a">
        {'> npm start'}
      </text>
      <text
        x="100"
        y="200"
        fontFamily="ui-monospace"
        fontSize="14"
        fill="#e88c5a"
        fontWeight="700"
      >
        {'Error: Cannot find module'}
      </text>
      <text x="100" y="225" fontFamily="ui-monospace" fontSize="13" fill="#c8cdd4">
        {"  './components/App'"}
      </text>
      <text x="100" y="265" fontFamily="ui-monospace" fontSize="13" fill="#7a8290">
        {'  at Function.Module._resolve'}
      </text>
      <text x="100" y="290" fontFamily="ui-monospace" fontSize="13" fill="#7a8290">
        {'  at Function.Module._load'}
      </text>
      <text x="100" y="340" fontFamily="ui-monospace" fontSize="20" fill="#f4c478">
        {'> read it carefully ▊'}
      </text>
    </svg>
  );
}
