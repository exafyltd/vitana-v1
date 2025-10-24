interface YouTubeIconProps {
  className?: string;
  connected?: boolean;
}

export function YouTubeIcon({ className = "h-[32px] w-[32px]", connected = true }: YouTubeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`YouTube ${connected ? '(connected)' : '(not connected)'}`}
      role="img"
    >
      {/* YouTube rounded rectangle background */}
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        fill={connected ? "#FF0000" : "#A0A0A0"}
      />
      
      {/* Play button triangle - white */}
      <path
        d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"
        fill="white"
      />
    </svg>
  );
}
