/**
 * Full-bleed illustrated scenes for the Solar & Energy landing: a modern
 * Jamaican home (flat concrete roof, tilted panel rows) by day, at night in
 * an outage with its battery on, in a storm, and on the driveway with an EV
 * charging. Illustrations, until real installation photography replaces them.
 */
export type SceneKind = 'day' | 'night' | 'storm' | 'garage'

export default function Scene({ kind }: { kind: SceneKind }) {
  const night = kind === 'night' || kind === 'storm'
  const id = `sc-${kind}`
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden style={{ position: 'absolute', inset: 0, display: 'block' }}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          {kind === 'day' && (
            <>
              <stop offset="0" stopColor="#4f8fd6" />
              <stop offset="0.55" stopColor="#9cc8ee" />
              <stop offset="1" stopColor="#f6d9a8" />
            </>
          )}
          {kind === 'garage' && (
            <>
              <stop offset="0" stopColor="#2c4a7a" />
              <stop offset="0.6" stopColor="#c47a52" />
              <stop offset="1" stopColor="#f3b16b" />
            </>
          )}
          {kind === 'night' && (
            <>
              <stop offset="0" stopColor="#050a14" />
              <stop offset="0.7" stopColor="#0d1a2c" />
              <stop offset="1" stopColor="#1a2a3a" />
            </>
          )}
          {kind === 'storm' && (
            <>
              <stop offset="0" stopColor="#1a1f26" />
              <stop offset="0.6" stopColor="#2b333c" />
              <stop offset="1" stopColor="#3b444c" />
            </>
          )}
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={kind === 'garage' ? '#ffd28a' : '#fff6d8'} />
          <stop offset="0.3" stopColor={kind === 'garage' ? '#ffb45e' : '#ffe9a8'} stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-panel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={night ? '#1a2740' : '#3a5f9a'} />
          <stop offset="0.5" stopColor={night ? '#0c1526' : '#1a2f55'} />
          <stop offset="1" stopColor={night ? '#070d18' : '#0f1f3d'} />
        </linearGradient>
        <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#2a3038' : '#f4f1ea'} />
          <stop offset="1" stopColor={night ? '#1d2228' : '#dcd6ca'} />
        </linearGradient>
        <linearGradient id={`${id}-glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd98a" />
          <stop offset="1" stopColor="#f2a640" />
        </linearGradient>
        <linearGradient id={`${id}-ground`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={night ? '#0e1612' : kind === 'garage' ? '#3e3a30' : '#4f7a3a'} />
          <stop offset="1" stopColor={night ? '#070b09' : kind === 'garage' ? '#24221d' : '#2d4a22'} />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill={`url(#${id}-sky)`} />
      {(kind === 'day' || kind === 'garage') && <circle cx={kind === 'day' ? 1240 : 1320} cy={kind === 'day' ? 170 : 520} r={kind === 'day' ? 260 : 300} fill={`url(#${id}-sun)`} />}
      {kind === 'night' &&
        Array.from({ length: 70 }, (_, i) => <circle key={i} cx={(i * 233) % 1600} cy={(i * 97) % 420} r={i % 7 === 0 ? 1.8 : 1} fill="#dfe8ff" opacity={0.35 + ((i * 13) % 50) / 100} />)}
      {kind === 'storm' && (
        <>
          {Array.from({ length: 6 }, (_, i) => (
            <ellipse key={i} cx={150 + i * 280} cy={120 + (i % 2) * 50} rx="320" ry="110" fill="#11151a" opacity="0.7" />
          ))}
          <path d="M1080 40 L1040 210 L1090 205 L1030 380" stroke="#e8f1ff" strokeWidth="5" fill="none" opacity="0.85" />
          {Array.from({ length: 140 }, (_, i) => (
            <line key={i} x1={(i * 61) % 1600} y1={(i * 37) % 900} x2={((i * 61) % 1600) - 18} y2={((i * 37) % 900) + 46} stroke="#9fb3c8" strokeWidth="1.4" opacity="0.35" />
          ))}
        </>
      )}

      {/* Blue Mountains */}
      <g transform="translate(0 150)">
      <path d="M0 560 C 180 470 320 500 470 440 C 620 380 760 450 900 410 C 1050 370 1180 440 1320 400 C 1450 365 1530 420 1600 400 L1600 640 L0 640 Z" fill={night ? '#0b141d' : kind === 'garage' ? '#6a4a52' : '#6f93b0'} opacity={night ? 1 : 0.55} />
      <path d="M0 600 C 200 540 360 580 540 530 C 720 480 860 560 1040 520 C 1220 480 1380 560 1600 520 L1600 680 L0 680 Z" fill={night ? '#09110c' : kind === 'garage' ? '#4a3a3c' : '#5d8a5a'} opacity={night ? 1 : 0.7} />
      <rect y="660" width="1600" height="400" fill={`url(#${id}-ground)`} />
      </g>

      <g transform="translate(250 285) scale(0.69)">
      {/* Neighbouring houses: dark in an outage */}
      {[60, 1360].map((x, k) => (
        <g key={x} opacity={0.9}>
          <rect x={x} y={560 - k * 10} width="200" height="120" fill={night ? '#151a20' : '#e8e2d6'} />
          <rect x={x - 8} y={550 - k * 10} width="216" height="12" fill={night ? '#1b2128' : '#cfc8bb'} />
          {[0, 1, 2].map((w) => (
            <rect key={w} x={x + 20 + w * 60} y={590 - k * 10} width="36" height="30" fill={night ? '#0a0d10' : '#3a4a55'} />
          ))}
        </g>
      ))}

      {/* The home */}
      <g>
        <rect x="430" y="430" width="740" height="260" fill={`url(#${id}-wall)`} />
        <rect x="560" y="330" width="480" height="104" fill={`url(#${id}-wall)`} />
        <rect x="412" y="418" width="776" height="16" rx="3" fill={night ? '#3a4048' : '#cfc9bd'} />
        <rect x="546" y="318" width="508" height="14" rx="3" fill={night ? '#3a4048' : '#cfc9bd'} />
        {/* Panel rows on both roof levels */}
        {[
          [575, 300, 8],
          [440, 398, 3],
          [1030, 398, 3],
        ].map(([sx, sy, n], r) =>
          Array.from({ length: n }, (_, i) => (
            <g key={`${r}-${i}`}>
              <path d={`M${sx + i * 58} ${sy} l50 0 l10 -26 l-50 0 Z`} fill={`url(#${id}-panel)`} stroke={night ? '#28364d' : '#6d8fc4'} strokeWidth="1.2" />
              {!night && <path d={`M${sx + i * 58 + 14} ${sy - 4} l18 0 l6 -14 l-18 0 Z`} fill="#fff" opacity="0.18" />}
              <line x1={sx + i * 58 + 8} y1={sy} x2={sx + i * 58 + 8} y2={sy + 18} stroke="#8a948c" strokeWidth="2" />
              <line x1={sx + i * 58 + 44} y1={sy} x2={sx + i * 58 + 44} y2={sy + 18} stroke="#8a948c" strokeWidth="2" />
            </g>
          )),
        )}
        {/* Windows and doors */}
        {[
          [470, 480, 120, 90],
          [620, 480, 120, 90],
          [960, 480, 170, 90],
          [600, 355, 90, 56],
          [720, 355, 90, 56],
          [880, 355, 130, 56],
        ].map(([x, y, w, h], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} rx="3" fill={night ? `url(#${id}-glow)` : '#2b3a44'} opacity={night ? 0.92 : 1} />
            {!night && <path d={`M${x + 8} ${y + h - 8} L${x + w * 0.5} ${y + 8}`} stroke="#fff" strokeOpacity="0.15" strokeWidth="10" />}
            {[1, 2].map((l) => (
              <line key={l} x1={x} y1={y + (h * l) / 3} x2={x + w} y2={y + (h * l) / 3} stroke={night ? '#c9852e' : '#56656e'} strokeWidth="2" opacity="0.6" />
            ))}
          </g>
        ))}
        <rect x="800" y="520" width="90" height="170" rx="4" fill={night ? '#5a3e22' : '#6b4f36'} />
        {night && <rect x="760" y="690" width="170" height="40" fill="#f2a640" opacity="0.12" />}
        {/* Battery and inverter on the side wall */}
        <g>
          <rect x="1185" y="560" width="46" height="120" rx="8" fill={night ? '#e9ece8' : '#f7f8f6'} stroke="#9aa39c" />
          <rect x="1194" y="574" width="28" height="6" rx="3" fill={night ? '#78ad28' : '#a6aea8'} />
          {night && <circle cx="1208" cy="620" r="60" fill="#93c93f" opacity="0.12" />}
          <rect x="1240" y="575" width="40" height="52" rx="6" fill="#f2f4f1" stroke="#9aa39c" />
          <circle cx="1260" cy="610" r="4" fill="#78ad28" />
        </g>
      </g>

      {/* Palms */}
      {[330, 1300].map((x, k) => (
        <g key={x} transform={`translate(${x} ${640 - k * 20})`} opacity={night ? 0.85 : 1}>
          <path d="M0 50 C 6 -40 14 -110 26 -190" stroke={night ? '#0e1310' : '#5a4630'} strokeWidth="12" fill="none" />
          {[-150, -110, -60, -20, 25, 60].map((a, i) => (
            <path key={i} d={`M26 -190 q ${Math.cos((a * Math.PI) / 180) * 60} ${Math.sin((a * Math.PI) / 180) * 30 - 30} ${Math.cos((a * Math.PI) / 180) * 130} ${Math.sin((a * Math.PI) / 180) * 70 + 10}`} stroke={night ? '#0c120e' : '#2f6b2f'} strokeWidth="14" fill="none" strokeLinecap="round" />
          ))}
        </g>
      ))}

      {kind === 'garage' && (
        <g>
          <rect x="-400" y="720" width="2400" height="400" fill="#2a2823" />
          <rect x="-400" y="690" width="2400" height="30" fill="#3a372f" />
          {/* Wall charger */}
          <rect x="1120" y="560" width="34" height="56" rx="8" fill="#f7f8f6" stroke="#9aa39c" />
          <circle cx="1137" cy="580" r="5" fill="#78ad28" />
          <path d="M1137 616 C 1137 690 1060 700 1010 700" stroke="#1d2226" strokeWidth="7" fill="none" />
        </g>
      )}
      </g>
    </svg>
  )
}
