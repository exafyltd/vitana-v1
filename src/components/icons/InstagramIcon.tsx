interface InstagramIconProps {
  className?: string;
  connected?: boolean;
}

export function InstagramIcon({ className = "h-[32px] w-[32px]", connected = true }: InstagramIconProps) {
  const fallbackColor = "#DD2A7B";
  
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Instagram ${connected ? '(connected)' : '(not connected)'}`}
      role="img"
    >
      <defs>
        <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="30%" stopColor="#DD2A7B" />
          <stop offset="70%" stopColor="#8134AF" />
          <stop offset="100%" stopColor="#515BD4" />
        </linearGradient>
      </defs>
      
      {/* Instagram rounded square with camera lens */}
      <path
        d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8 1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
        fill={connected ? "url(#instagram-gradient)" : "#A0A0A0"}
      />
      
      {/* High-contrast fallback */}
      <style>
        {`
          @media (prefers-contrast: high) {
            path {
              fill: ${connected ? fallbackColor : "#A0A0A0"} !important;
            }
          }
        `}
      </style>
    </svg>
  );
}
