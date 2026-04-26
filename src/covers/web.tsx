type Size = 'hero' | 'wide' | 'medium' | 'small';

export function WebCover({ seed, size }: { seed: string; size: Size }) {
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
      <rect width="800" height="500" fill="#f4f1ea" />
      <rect x="100" y="80" width="600" height="340" fill="#fff" stroke="#1a1d22" strokeWidth="2" />
      <rect x="100" y="80" width="600" height="36" fill="#1a1d22" />
      <circle cx="120" cy="98" r="5" fill="#e88c5a" />
      <circle cx="138" cy="98" r="5" fill="#f4c478" />
      <circle cx="156" cy="98" r="5" fill="#7ec38a" />
      <text x="180" y="103" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">
        index.html
      </text>
      <text x="140" y="180" fontFamily="ui-monospace" fontSize="14" fill="#5a6470">
        {'<!DOCTYPE html>'}
      </text>
      <text x="140" y="210" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">
        {'<html>'}
      </text>
      <text x="160" y="240" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">
        {'<body>'}
      </text>
      <text x="180" y="270" fontFamily="ui-monospace" fontSize="14" fill="#c44848">
        {'  hello, web.'}
      </text>
      <text x="160" y="300" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">
        {'</body>'}
      </text>
      <text x="140" y="330" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">
        {'</html>'}
      </text>
    </svg>
  );
}
