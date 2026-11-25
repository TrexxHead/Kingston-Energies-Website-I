/**
 * The design as a picture: a house with the recommended number of panels on
 * the roof, the inverter, and the battery filled to the energy it holds.
 * Purely illustrative — counts and sizes come from the design.
 */
export default function SystemVisual({ modules, inverterKw, batteryKwh, solarShare }: { modules: number; inverterKw: number | null; batteryKwh: number | null; solarShare: number }) {
  const shown = Math.min(modules, 24)
  const cols = shown <= 8 ? shown : Math.ceil(shown / 2)
  const rows = shown <= 8 ? 1 : 2
  const pw = 34
  const ph = 22
  const gap = 4
  const arrW = cols * (pw + gap) - gap
  const sx = 210 - arrW / 2
  const batFill = batteryKwh ? Math.min(1, batteryKwh / 40) : 0
  return (
    <svg viewBox="0 0 420 300" width="100%" role="img" aria-label={`${modules} solar panels${inverterKw ? `, a ${inverterKw} kW inverter` : ''}${batteryKwh ? ` and a ${batteryKwh.toFixed(1)} kWh battery` : ''}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sv-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#13261f" />
          <stop offset="1" stopColor="#0d1714" />
        </linearGradient>
        <linearGradient id="sv-panel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a4a7a" />
          <stop offset="0.55" stopColor="#14284a" />
          <stop offset="1" stopColor="#0c1a33" />
        </linearGradient>
        <linearGradient id="sv-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9ede6" />
          <stop offset="1" stopColor="#c9d0c6" />
        </linearGradient>
        <radialGradient id="sv-sun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd75e" />
          <stop offset="1" stopColor="#ffd75e" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="420" height="300" fill="url(#sv-sky)" rx="18" />
      <circle cx="352" cy="52" r="46" fill="url(#sv-sun)" opacity={0.35 + solarShare * 0.5} />
      <circle cx="352" cy="52" r="14" fill="#ffd75e" />
      {/* Flat concrete roof (the most common Jamaican roof), with tilted rows */}
      <rect x="70" y="120" width="280" height="120" fill="url(#sv-wall)" />
      <rect x="62" y="110" width="296" height="12" rx="3" fill="#b9c1b5" />
      <rect x="95" y="170" width="44" height="70" rx="3" fill="#6b4f36" />
      <rect x="170" y="160" width="60" height="40" rx="3" fill="#24323b" />
      <rect x="260" y="160" width="60" height="40" rx="3" fill="#24323b" />
      {Array.from({ length: shown }, (_, k) => {
        const r = rows === 2 ? Math.floor(k / cols) : 0
        const c = rows === 2 ? k % cols : k
        const x = sx + c * (pw + gap)
        const y = 82 - r * (ph + 6)
        return (
          <g key={k}>
            <rect x={x} y={y} width={pw} height={ph} rx="2" fill="url(#sv-panel)" stroke="#5f7fb0" strokeWidth="0.8" transform={`skewX(-12) translate(${y * 0.21} 0)`} />
            <line x1={x + 4} y1={y + ph} x2={x + 4} y2={110} stroke="#8a948c" strokeWidth="1.2" />
            <line x1={x + pw - 4} y1={y + ph} x2={x + pw - 4} y2={110} stroke="#8a948c" strokeWidth="1.2" />
          </g>
        )
      })}
      {modules > shown && (
        <text x="210" y="30" textAnchor="middle" fontSize="11" fill="rgba(234,242,236,.7)">
          +{modules - shown} more panels
        </text>
      )}
      {/* Inverter and battery on the side wall */}
      {inverterKw != null && (
        <g>
          <rect x="362" y="150" width="34" height="44" rx="5" fill="#f4f6f3" stroke="#9aa39c" />
          <rect x="369" y="158" width="20" height="8" rx="2" fill="#1d2b26" />
          <circle cx="379" cy="180" r="3" fill="#78ad28" />
          <text x="379" y="208" textAnchor="middle" fontSize="10" fill="rgba(234,242,236,.8)">{inverterKw} kW</text>
        </g>
      )}
      {batteryKwh != null && batteryKwh > 0 && (
        <g>
          <rect x="18" y="160" width="40" height="80" rx="6" fill="#f4f6f3" stroke="#9aa39c" />
          <rect x="24" y={166 + 68 * (1 - batFill)} width="28" height={68 * batFill} rx="3" fill="#78ad28" />
          <text x="38" y="256" textAnchor="middle" fontSize="10" fill="rgba(234,242,236,.8)">{batteryKwh.toFixed(1)} kWh</text>
        </g>
      )}
      <rect x="0" y="240" width="420" height="60" fill="#0b1411" rx="0" />
      <rect x="0" y="240" width="420" height="2" fill="#1b2a24" />
    </svg>
  )
}
