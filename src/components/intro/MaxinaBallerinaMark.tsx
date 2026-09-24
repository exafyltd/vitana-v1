import { useId } from 'react';

interface MaxinaBallerinaMarkProps {
  className?: string;
}

/**
 * Static vector recreation of the MAXINA ballerina glyph (twirl-skirt dancer,
 * en pointe) — hand-authored from the brand mark, not a raster trace, so it
 * stays crisp at any size/DPR instead of the fixed-resolution stock video it
 * replaces. Pure shape/gradient, no animation — MaxinaIntroReveal owns the
 * motion so this stays reusable anywhere the static glyph is needed later.
 */
export default function MaxinaBallerinaMark({ className }: MaxinaBallerinaMarkProps) {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 240 300"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBF3DE" />
          <stop offset="45%" stopColor="#F3E2B0" />
          <stop offset="100%" stopColor="#D9B873" />
        </linearGradient>
      </defs>

      <g fill={`url(#${gradientId})`}>
        {/* Head / bodice */}
        <path d="M100,55 C98,40 108,28 120,30 C132,28 142,40 140,55 C139,66 130,72 120,70 C110,72 101,66 100,55 Z" />

        {/* Bodice ruffle — thin tapering strokes between head and skirt */}
        <path
          d="M95,78 L110,74 L125,80 L145,75"
          stroke={`url(#${gradientId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M88,88 L108,83 L130,89 L152,84"
          stroke={`url(#${gradientId})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Twirl skirt — layered asymmetric ruffles suggesting a spinning dress */}
        <path d="M70,110 C90,95 150,95 170,110 C160,125 140,132 120,128 C100,132 80,125 70,110 Z" opacity="0.95" />
        <path d="M50,132 C80,110 160,110 190,132 C175,152 145,160 120,154 C95,160 65,152 50,132 Z" opacity="0.92" />
        <path
          d="M30,152 C55,122 90,134 120,130 C150,134 185,122 210,152 C195,174 165,184 135,177 C128,180 112,180 105,177 C75,184 45,174 30,152 Z"
          opacity="0.96"
        />
        <path
          d="M55,177 C50,167 90,170 120,174 C150,170 190,167 185,177 C178,192 155,198 135,192 C128,195 112,195 105,192 C85,198 62,192 55,177 Z"
        />

        {/* Pointe legs — tapering, unequal length, small gap */}
        <path d="M112,192 C110,206 108,220 106,232 L110,233 C113,220 115,206 117,192 Z" />
        <path d="M124,192 C126,210 128,230 130,254 L133,255 C131,230 129,210 127,192 Z" />
      </g>
    </svg>
  );
}
