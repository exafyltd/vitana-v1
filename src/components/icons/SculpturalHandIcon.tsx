interface SculpturalHandIconProps {
  className?: string;
}

export function SculpturalHandIcon({ className }: SculpturalHandIconProps) {
  return (
    <svg 
      viewBox="0 0 64 64" 
      fill="none" 
      className={className}
    >
      <defs>
        {/* Soft skin gradient - neutral, warm tone */}
        <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(28, 35%, 78%)" />
          <stop offset="50%" stopColor="hsl(25, 30%, 72%)" />
          <stop offset="100%" stopColor="hsl(22, 25%, 68%)" />
        </linearGradient>
        
        {/* Subtle shadow for depth */}
        <linearGradient id="shadowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="hsl(22, 20%, 60%)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(22, 20%, 55%)" stopOpacity="0.5" />
        </linearGradient>
        
        {/* Highlight for soft depth */}
        <radialGradient id="highlightGradient" cx="30%" cy="20%" r="60%">
          <stop offset="0%" stopColor="hsl(30, 40%, 88%)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="hsl(28, 35%, 78%)" stopOpacity="0" />
        </radialGradient>
      </defs>
      
      {/* Palm base - soft rounded shape */}
      <ellipse 
        cx="32" 
        cy="44" 
        rx="14" 
        ry="12" 
        fill="url(#skinGradient)"
      />
      
      {/* Palm shadow layer */}
      <ellipse 
        cx="32" 
        cy="46" 
        rx="12" 
        ry="8" 
        fill="url(#shadowGradient)"
      />
      
      {/* Fingers - soft, rounded, organic shapes */}
      {/* Pinky */}
      <path 
        d="M18 38 Q16 28 18 20 Q20 16 22 20 Q24 28 22 38 Z" 
        fill="url(#skinGradient)"
      />
      
      {/* Ring finger */}
      <path 
        d="M24 36 Q22 24 24 14 Q26 10 28 14 Q30 24 28 36 Z" 
        fill="url(#skinGradient)"
      />
      
      {/* Middle finger */}
      <path 
        d="M30 34 Q28 20 30 10 Q32 6 34 10 Q36 20 34 34 Z" 
        fill="url(#skinGradient)"
      />
      
      {/* Index finger */}
      <path 
        d="M36 36 Q34 24 36 14 Q38 10 40 14 Q42 24 40 36 Z" 
        fill="url(#skinGradient)"
      />
      
      {/* Thumb - angled outward */}
      <path 
        d="M44 42 Q50 38 54 32 Q56 28 54 26 Q50 28 46 34 Q44 38 44 42 Z" 
        fill="url(#skinGradient)"
      />
      
      {/* Highlight overlay for soft dimension */}
      <ellipse 
        cx="30" 
        cy="30" 
        rx="16" 
        ry="20" 
        fill="url(#highlightGradient)"
      />
    </svg>
  );
}
