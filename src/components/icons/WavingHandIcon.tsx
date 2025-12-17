interface WavingHandIconProps {
  className?: string;
}

export function WavingHandIcon({ className }: WavingHandIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5"
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Palm base */}
      <path d="M8 14v3a3 3 0 003 3h2a3 3 0 003-3v-4" />
      
      {/* Fingers - elegant monoline style */}
      <path d="M12 4v9" />
      <path d="M9 5.5v7" />
      <path d="M15 5.5v7" />
      <path d="M6 8v4.5" />
      <path d="M18 8v4.5" />
      
      {/* Subtle wrist */}
      <path d="M9 20v1" />
      <path d="M15 20v1" />
    </svg>
  );
}
