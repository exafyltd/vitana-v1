interface LinkedInIconProps {
  className?: string;
  connected?: boolean;
}

export function LinkedInIcon({ className = "h-[32px] w-[32px]", connected = true }: LinkedInIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={`LinkedIn ${connected ? '(connected)' : '(not connected)'}`}
      role="img"
    >
      {/* LinkedIn rounded square background */}
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2"
        fill={connected ? "#0A66C2" : "#A0A0A0"}
      />
      
      {/* "in" text - white */}
      <path
        d="M8.268 13.9H6.523V9.067h1.745v4.833zM7.395 8.319a1.015 1.015 0 1 1 0-2.03 1.015 1.015 0 0 1 0 2.03zM14.47 13.9h-1.742v-2.351c0-.65-.013-1.487-.906-1.487-.907 0-1.046.708-1.046 1.439v2.399H9.031V9.067h1.673v.66h.024c.233-.44.802-.906 1.65-.906 1.765 0 2.091 1.162 2.091 2.673v3.006z"
        fill="white"
      />
    </svg>
  );
}
