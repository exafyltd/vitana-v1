import { cn } from "@/lib/utils";

/**
 * DividerCard - Motivational separator for horizontal lists
 * 
 * Usage: Inject at indices [3, 7, 11, ...] in AI Feed Activity list
 * 
 * Requirements:
 * - role="separator"
 * - non-focusable
 * - no analytics
 * - height: 88px (consistent rhythm with StandardHorizontalCard)
 * - subtle glass strip with emoji + 12px copy
 */

interface DividerCardProps {
  emoji: string;
  message: string;
  className?: string;
}

export function DividerCard({ emoji, message, className }: DividerCardProps) {
  return (
    <div
      role="separator"
      aria-hidden="true"
      className={cn(
        // Fixed height to match card rhythm
        "h-[88px]",
        // Glass effect (subtle)
        "bg-white/5 backdrop-blur-sm",
        "border-y border-white/5",
        // Layout
        "flex items-center justify-center",
        "px-4 py-3",
        // Non-interactive
        "pointer-events-none select-none",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">
          {emoji}
        </span>
        <p className="text-[12px] text-muted-foreground/60 font-medium tracking-wide">
          {message}
        </p>
      </div>
    </div>
  );
}

/**
 * Preset motivational dividers for AI Feed Activity list
 */
export const MOTIVATIONAL_DIVIDERS = [
  { emoji: "💧", message: "Keep the streak going" },
  { emoji: "🎯", message: "You're making great progress" },
  { emoji: "⚡", message: "Consistency is key" },
  { emoji: "🌟", message: "Every step counts" },
  { emoji: "🔥", message: "Stay on track" },
  { emoji: "💪", message: "Building healthy habits" }
];
