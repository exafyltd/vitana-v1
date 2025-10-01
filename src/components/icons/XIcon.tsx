import React from 'react';

interface XIconProps {
  className?: string;
  strokeWidth?: number;
}

export const XIcon: React.FC<XIconProps> = ({ className = "h-6 w-6", strokeWidth = 2 }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
};
