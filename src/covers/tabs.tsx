type Size = 'hero' | 'wide' | 'medium' | 'small';

export function TabsCover({ seed, size }: { seed: string; size: Size }) {
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
      <rect width="800" height="500" fill="#1a1d22" />
      <text x="60" y="120" fontFamily="ui-monospace" fontSize="22" fill="#7ec38a">
        function
      </text>
      <text x="220" y="120" fontFamily="ui-monospace" fontSize="22" fill="#c8cdd4">
        indent() {'{'}
      </text>
      <text x="100" y="180" fontFamily="ui-monospace" fontSize="22" fill="#7a8290" opacity="0.5">
        → → return
      </text>
      <text x="320" y="180" fontFamily="ui-monospace" fontSize="22" fill="#c8cdd4">
        true;
      </text>
      <text x="60" y="240" fontFamily="ui-monospace" fontSize="22" fill="#c8cdd4">
        {'}'}
      </text>
      <text x="60" y="380" fontFamily="ui-monospace" fontSize="96" fontWeight="700" fill="#e8916a">
        {'\\t'}
      </text>
    </svg>
  );
}
