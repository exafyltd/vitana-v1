interface FacebookIconProps {
  className?: string;
  connected?: boolean;
}

export function FacebookIcon({ className = "h-[32px] w-[32px]", connected = true }: FacebookIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`Facebook ${connected ? '(connected)' : '(not connected)'}`}
      role="img"
    >
      {/* Facebook rounded square background */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        fill={connected ? "#1877F2" : "#A0A0A0"}
      />
      
      {/* "f" letter - white */}
      <path
        d="M14.023 13.5l.435-2.835h-2.72V8.85c0-.776.38-1.533 1.6-1.533h1.237V4.89s-1.122-.192-2.196-.192c-2.24 0-3.704 1.358-3.704 3.817v2.16H6.187V13.5h2.488V20h3.063v-6.5h2.285z"
        fill="white"
      />
    </svg>
  );
}
