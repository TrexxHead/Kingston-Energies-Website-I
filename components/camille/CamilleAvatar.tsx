interface CamilleAvatarProps {
  size?: number
  /** Gentle vertical bob — used on the closed launcher. */
  float?: boolean
}

/**
 * Jordyn — a warm, minimal flat-illustration portrait of a young Black woman.
 * Pure inline SVG + CSS: she blinks softly, and (on the launcher) gently floats.
 * Deliberately stylised, not photorealistic, so she reads cleanly at small sizes.
 */
export default function CamilleAvatar({ size = 40, float = false }: CamilleAvatarProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        width: size,
        height: size,
        animation: float ? 'keFloat 3.4s var(--ease-standard) infinite' : undefined,
      }}
    >
      <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="camille-ring" x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#aed968" />
            <stop offset="0.55" stopColor="#93c93f" />
            <stop offset="1" stopColor="#29abe2" />
          </linearGradient>
          <linearGradient id="camille-bg" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#173a34" />
            <stop offset="1" stopColor="#0e211c" />
          </linearGradient>
          <clipPath id="camille-clip">
            <circle cx="32" cy="32" r="30" />
          </clipPath>
        </defs>

        <g clipPath="url(#camille-clip)">
          {/* backdrop */}
          <rect x="0" y="0" width="64" height="64" fill="url(#camille-bg)" />

          {/* hair — natural afro silhouette (layered rounded shapes) */}
          <g fill="#221a15">
            <circle cx="32" cy="27" r="21" />
            <circle cx="16" cy="24" r="9" />
            <circle cx="48" cy="24" r="9" />
            <circle cx="32" cy="12" r="12" />
            <circle cx="19" cy="14" r="8" />
            <circle cx="45" cy="14" r="8" />
            <circle cx="14" cy="34" r="7" />
            <circle cx="50" cy="34" r="7" />
          </g>

          {/* shoulders / top */}
          <path d="M4 64 C4 51 15 46 32 46 C49 46 60 51 60 64 Z" fill="#2f6b62" />
          <path d="M32 46 C25 46 20 48 16 52 L48 52 C44 48 39 46 32 46 Z" fill="#3a7f75" opacity="0.6" />

          {/* neck */}
          <path d="M27 40 L27 47 Q32 50 37 47 L37 40 Z" fill="#7c4e30" />

          {/* ears + earrings */}
          <ellipse cx="18.5" cy="33" rx="3" ry="4" fill="#8a5a3a" />
          <ellipse cx="45.5" cy="33" rx="3" ry="4" fill="#8a5a3a" />
          <circle cx="18.5" cy="39.5" r="1.8" fill="#fdb813" />
          <circle cx="45.5" cy="39.5" r="1.8" fill="#fdb813" />

          {/* face */}
          <ellipse cx="32" cy="31" rx="13" ry="15" fill="#935e3b" />
          {/* soft cheek warmth */}
          <ellipse cx="25" cy="36" rx="3" ry="2.2" fill="#a8704a" opacity="0.5" />
          <ellipse cx="39" cy="36" rx="3" ry="2.2" fill="#a8704a" opacity="0.5" />

          {/* front hairline framing the forehead */}
          <path d="M18 30 C18 17 25 12 32 12 C39 12 46 17 46 30 C46 23 40 21 32 21 C24 21 18 24 18 30 Z" fill="#221a15" />

          {/* eyebrows */}
          <path d="M23.5 26 Q27 24.2 30.5 26" fill="none" stroke="#2a1c14" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M33.5 26 Q37 24.2 40.5 26" fill="none" stroke="#2a1c14" strokeWidth="1.5" strokeLinecap="round" />

          {/* eyes (blink together) */}
          <g style={{ animation: 'keBlink 5.5s var(--ease-standard) infinite', transformOrigin: '32px 30px' }}>
            <ellipse cx="27" cy="30" rx="3.1" ry="3.4" fill="#fbf6ef" />
            <ellipse cx="37" cy="30" rx="3.1" ry="3.4" fill="#fbf6ef" />
            <circle cx="27.2" cy="30.3" r="2" fill="#3a2413" />
            <circle cx="37.2" cy="30.3" r="2" fill="#3a2413" />
            <circle cx="27.2" cy="30.3" r="0.9" fill="#160d06" />
            <circle cx="37.2" cy="30.3" r="0.9" fill="#160d06" />
            <circle cx="28" cy="29.3" r="0.7" fill="#ffffff" />
            <circle cx="38" cy="29.3" r="0.7" fill="#ffffff" />
          </g>

          {/* nose */}
          <path d="M32 32 L30.6 35.4 Q32 36.4 33.4 35.4" fill="none" stroke="#7c4e30" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />

          {/* lips — gentle smile */}
          <path d="M27.5 39 Q32 38.4 36.5 39 Q34.4 42.8 32 42.8 Q29.6 42.8 27.5 39 Z" fill="#9c5a44" />
          <path d="M28.5 39.3 Q32 40.2 35.5 39.3" fill="none" stroke="#7a4234" strokeWidth="0.8" strokeLinecap="round" />
        </g>

        {/* brand ring */}
        <circle cx="32" cy="32" r="30" fill="none" stroke="url(#camille-ring)" strokeWidth="2.5" />

        {/* small energy spark accent */}
        <g style={{ animation: 'keSparkle 2.8s var(--ease-standard) infinite', transformOrigin: '53px 12px' }}>
          <path d="M53 8 L54 11 L57 12 L54 13 L53 16 L52 13 L49 12 L52 11 Z" fill="#fdb813" />
        </g>
      </svg>
    </span>
  )
}
