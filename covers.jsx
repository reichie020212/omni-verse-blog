// covers.jsx — generative SVG cover placeholders, themed per post topic.
// No emoji, no hand-drawn imagery; just shapes, gradients, and typographic glyphs.

function CoverPlaceholder({ kind, label }) {
  const covers = {
    jovian: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <radialGradient id="jov-bg" cx="30%" cy="40%" r="80%">
            <stop offset="0%" stopColor="#2b1a3a" />
            <stop offset="100%" stopColor="#0a0816" />
          </radialGradient>
          <radialGradient id="jov-planet" cx="40%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#d9a376" />
            <stop offset="55%" stopColor="#a8633e" />
            <stop offset="100%" stopColor="#3a1a0e" />
          </radialGradient>
        </defs>
        <rect width="800" height="500" fill="url(#jov-bg)" />
        {Array.from({ length: 60 }).map((_, i) => (
          <circle key={i} cx={Math.random() * 800} cy={Math.random() * 500} r={Math.random() * 0.9 + 0.3} fill="#fff" opacity={Math.random() * 0.7 + 0.2} />
        ))}
        <circle cx="560" cy="260" r="180" fill="url(#jov-planet)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse key={i} cx="560" cy={210 + i * 22} rx={180 - Math.abs(i - 2) * 15} ry="6" fill="#000" opacity="0.18" />
        ))}
        <circle cx="180" cy="180" r="14" fill="#e8d4a8" />
        <circle cx="180" cy="180" r="14" fill="#e8d4a8" opacity="0.4" />
        <circle cx="120" cy="340" r="9" fill="#a8c3d4" />
        <circle cx="290" cy="380" r="6" fill="#c9a374" />
      </svg>
    ),
    rust: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id="rust-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3d1c0a" />
            <stop offset="100%" stopColor="#1a0a04" />
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#rust-bg)" />
        {Array.from({ length: 14 }).map((_, i) => (
          <text key={i} x={40 + (i % 4) * 200} y={60 + Math.floor(i / 4) * 110} fontFamily="ui-monospace" fontSize="14" fill="#ce6a3a" opacity="0.22">
            {['fn main()', "let mut x", '&str', "Result<T,E>", 'impl Trait', 'Box<dyn>', "'static", 'match arm', 'Vec::new()', 'Option::Some', 'Arc<Mutex>', "?Sized", "lifetime 'a", "unsafe {}"][i]}
          </text>
        ))}
        <text x="400" y="280" fontFamily="ui-monospace" fontSize="120" fontWeight="700" fill="#e8916a" textAnchor="middle">&amp;'a</text>
      </svg>
    ),
    pancakes: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id="pan-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4dfb4" />
            <stop offset="100%" stopColor="#d9a874" />
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#pan-bg)" />
        <ellipse cx="400" cy="380" rx="220" ry="36" fill="#a8743f" />
        <ellipse cx="400" cy="350" rx="210" ry="32" fill="#d9a266" />
        <ellipse cx="400" cy="320" rx="200" ry="30" fill="#e8b878" />
        <ellipse cx="400" cy="290" rx="190" ry="28" fill="#f4cc8c" />
        <ellipse cx="400" cy="262" rx="180" ry="26" fill="#fae0a4" />
        <path d="M 280 260 Q 400 220 520 260 L 510 280 Q 400 250 290 280 Z" fill="#e8a648" opacity="0.7" />
      </svg>
    ),
    config: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#0e1116" />
        <text x="40" y="60" fontFamily="ui-monospace" fontSize="13" fill="#5a6470">{'# config.yaml'}</text>
        {[
          'server:', '  host: 0.0.0.0', '  port: 8080', 'database:', '  url: postgres://...',
          '  pool: 10', 'features:', '  - auth', '  - billing', 'env: production'
        ].map((line, i) => (
          <text key={i} x="40" y={92 + i * 22} fontFamily="ui-monospace" fontSize="13" fill={i === 4 || i === 9 ? '#7ec38a' : '#c8cdd4'}>{line}</text>
        ))}
        <text x="640" y="420" fontFamily="ui-monospace" fontSize="80" fontWeight="700" fill="#ce4040" textAnchor="end" opacity="0.85">{'{}'}</text>
      </svg>
    ),
    notebook: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#e8e2d0" />
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={i} x1="0" x2="800" y1={50 + i * 26} y2={50 + i * 26} stroke="#a89c80" strokeWidth="0.5" opacity="0.4" />
        ))}
        <line x1="80" y1="0" x2="80" y2="500" stroke="#c47878" strokeWidth="1" opacity="0.5" />
        <text x="100" y="90" fontFamily="Georgia" fontStyle="italic" fontSize="42" fill="#3a3428">paper still</text>
        <text x="100" y="140" fontFamily="Georgia" fontStyle="italic" fontSize="42" fill="#3a3428">wins.</text>
      </svg>
    ),
    tabs: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#1a1d22" />
        <text x="60" y="120" fontFamily="ui-monospace" fontSize="22" fill="#7ec38a">function</text>
        <text x="220" y="120" fontFamily="ui-monospace" fontSize="22" fill="#c8cdd4">indent() {'{'}</text>
        <text x="100" y="180" fontFamily="ui-monospace" fontSize="22" fill="#7a8290" opacity="0.5">→ → return</text>
        <text x="320" y="180" fontFamily="ui-monospace" fontSize="22" fill="#c8cdd4">{'true;'}</text>
        <text x="60" y="240" fontFamily="ui-monospace" fontSize="22" fill="#c8cdd4">{'}'}</text>
        <text x="60" y="380" fontFamily="ui-monospace" fontSize="96" fontWeight="700" fill="#e8916a">\t</text>
      </svg>
    ),
    lisbon: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id="lis-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4c478" />
            <stop offset="100%" stopColor="#e88c5a" />
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#lis-bg)" />
        <polygon points="0,500 0,360 80,340 80,300 160,290 160,250 240,240 240,310 320,300 320,260 400,250 400,200 480,190 480,250 560,240 560,290 640,280 640,330 720,320 720,360 800,350 800,500" fill="#c44848" opacity="0.85" />
        <polygon points="0,500 0,400 100,390 100,360 200,350 200,380 300,370 300,330 400,320 400,360 500,350 500,310 600,300 600,360 700,350 700,390 800,380 800,500" fill="#8a2828" opacity="0.9" />
        {Array.from({ length: 20 }).map((_, i) => (
          <rect key={i} x={(i % 10) * 80 + 20} y={400 + Math.floor(i / 10) * 30} width="6" height="8" fill="#1a0a08" opacity="0.6" />
        ))}
      </svg>
    ),
    book: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#0e1820" />
        {Array.from({ length: 100 }).map((_, i) => (
          <circle key={i} cx={Math.random() * 800} cy={Math.random() * 500} r={Math.random() * 1.2 + 0.3} fill="#fff" opacity={Math.random() * 0.8 + 0.1} />
        ))}
        <circle cx="200" cy="200" r="80" fill="#c47840" />
        <circle cx="500" cy="280" r="60" fill="#7ec3a8" />
        <circle cx="650" cy="150" r="40" fill="#9a8ac4" />
        <line x1="200" y1="200" x2="500" y2="280" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
        <line x1="500" y1="280" x2="650" y2="150" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
        <line x1="200" y1="200" x2="650" y2="150" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
      </svg>
    ),
    web: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#f4f1ea" />
        <rect x="100" y="80" width="600" height="340" fill="#fff" stroke="#1a1d22" strokeWidth="2" />
        <rect x="100" y="80" width="600" height="36" fill="#1a1d22" />
        <circle cx="120" cy="98" r="5" fill="#e88c5a" />
        <circle cx="138" cy="98" r="5" fill="#f4c478" />
        <circle cx="156" cy="98" r="5" fill="#7ec38a" />
        <text x="180" y="103" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">index.html</text>
        <text x="140" y="180" fontFamily="ui-monospace" fontSize="14" fill="#5a6470">{'<!DOCTYPE html>'}</text>
        <text x="140" y="210" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">{'<html>'}</text>
        <text x="160" y="240" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">{'<body>'}</text>
        <text x="180" y="270" fontFamily="ui-monospace" fontSize="14" fill="#c44848">{'  hello, web.'}</text>
        <text x="160" y="300" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">{'</body>'}</text>
        <text x="140" y="330" fontFamily="ui-monospace" fontSize="14" fill="#1a1d22">{'</html>'}</text>
      </svg>
    ),
    pluto: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <radialGradient id="pluto-bg" cx="50%" cy="50%" r="80%">
            <stop offset="0%" stopColor="#1a1828" />
            <stop offset="100%" stopColor="#050410" />
          </radialGradient>
          <radialGradient id="pluto-body" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#e8d4b8" />
            <stop offset="60%" stopColor="#a88a6c" />
            <stop offset="100%" stopColor="#3a2818" />
          </radialGradient>
        </defs>
        <rect width="800" height="500" fill="url(#pluto-bg)" />
        {Array.from({ length: 80 }).map((_, i) => (
          <circle key={i} cx={Math.random() * 800} cy={Math.random() * 500} r={Math.random() * 0.8 + 0.3} fill="#fff" opacity={Math.random() * 0.7 + 0.2} />
        ))}
        <circle cx="400" cy="250" r="170" fill="url(#pluto-body)" />
        <path d="M 340 270 Q 380 220 440 240 Q 480 280 460 320 Q 410 350 360 320 Q 320 300 340 270 Z" fill="#f4e4c4" opacity="0.7" />
      </svg>
    ),
    caldo: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#3a2814" />
        <ellipse cx="400" cy="280" rx="240" ry="60" fill="#1a0e08" />
        <ellipse cx="400" cy="260" rx="240" ry="50" fill="#e8c878" />
        <ellipse cx="400" cy="258" rx="220" ry="42" fill="#f4d488" />
        {Array.from({ length: 30 }).map((_, i) => (
          <circle key={i} cx={250 + Math.random() * 300} cy={240 + Math.random() * 30} r={Math.random() * 4 + 2} fill="#fff" opacity={Math.random() * 0.8 + 0.2} />
        ))}
        <path d="M 360 200 Q 365 170 360 140 Q 355 170 360 200" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M 400 200 Q 405 160 400 130 Q 395 160 400 200" stroke="#fff" strokeWidth="2" fill="none" opacity="0.5" />
        <path d="M 440 200 Q 445 170 440 145 Q 435 170 440 200" stroke="#fff" strokeWidth="2" fill="none" opacity="0.4" />
      </svg>
    ),
    teach: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#fce8e4" />
        <rect x="80" y="80" width="640" height="340" fill="#1a1d22" rx="8" />
        <rect x="80" y="80" width="640" height="32" fill="#0a0c10" rx="8" />
        <text x="100" y="160" fontFamily="ui-monospace" fontSize="14" fill="#7ec38a">{'> npm start'}</text>
        <text x="100" y="200" fontFamily="ui-monospace" fontSize="14" fill="#e88c5a" fontWeight="700">{'Error: Cannot find module'}</text>
        <text x="100" y="225" fontFamily="ui-monospace" fontSize="13" fill="#c8cdd4">{"  './components/App'"}</text>
        <text x="100" y="265" fontFamily="ui-monospace" fontSize="13" fill="#7a8290">{'  at Function.Module._resolve'}</text>
        <text x="100" y="290" fontFamily="ui-monospace" fontSize="13" fill="#7a8290">{'  at Function.Module._load'}</text>
        <text x="100" y="340" fontFamily="ui-monospace" fontSize="20" fill="#f4c478">{'> read it carefully ▊'}</text>
      </svg>
    ),
    sqlite: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <defs>
          <linearGradient id="sql-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1c3a4a" />
            <stop offset="100%" stopColor="#0a1a24" />
          </linearGradient>
        </defs>
        <rect width="800" height="500" fill="url(#sql-bg)" />
        <rect x="280" y="160" width="240" height="180" fill="none" stroke="#7ec3c8" strokeWidth="2" rx="6" />
        <line x1="280" y1="200" x2="520" y2="200" stroke="#7ec3c8" strokeWidth="1" />
        <text x="300" y="188" fontFamily="ui-monospace" fontSize="12" fill="#7ec3c8">db.sqlite</text>
        <text x="300" y="225" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">id  | name</text>
        <line x1="280" y1="232" x2="520" y2="232" stroke="#7ec3c8" strokeWidth="0.5" opacity="0.5" />
        <text x="300" y="252" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">01  | one file</text>
        <text x="300" y="272" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">02  | zero ops</text>
        <text x="300" y="292" fontFamily="ui-monospace" fontSize="12" fill="#c8cdd4">03  | fast</text>
        <text x="300" y="320" fontFamily="ui-monospace" fontSize="14" fill="#7ec38a">SELECT * FROM joy;</text>
      </svg>
    ),
    paint: (
      <svg viewBox="0 0 800 500" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <rect width="800" height="500" fill="#f8f1e4" />
        <ellipse cx="200" cy="200" rx="120" ry="80" fill="#c47878" opacity="0.7" />
        <ellipse cx="500" cy="280" rx="160" ry="60" fill="#7ea8c4" opacity="0.6" />
        <ellipse cx="350" cy="350" rx="140" ry="50" fill="#c4a878" opacity="0.6" />
        <ellipse cx="600" cy="150" rx="80" ry="50" fill="#a8c478" opacity="0.7" />
        <path d="M 100 100 L 140 180" stroke="#3a2818" strokeWidth="3" strokeLinecap="round" />
        <path d="M 700 380 L 720 440" stroke="#3a2818" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  };
  return (
    <>
      {covers[kind] || (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-subtle)' }} />
      )}
      <div className="cover-placeholder">
        <span>{label}</span>
      </div>
    </>
  );
}

window.CoverPlaceholder = CoverPlaceholder;
