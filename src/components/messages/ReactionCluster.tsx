import React, { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { ReactionSummary } from '@/hooks/useMessageReactions';

interface ReactionClusterProps {
  reactions: ReactionSummary[];
  onReactionClick: (emoji: string) => void;
  onReactionRemove?: (emoji: string) => void;
  onShowPopover: () => void;
  className?: string;
}

interface ReactionPillProps {
  reaction: ReactionSummary;
  onTap: () => void;
  onLongPress: () => void;
}

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 12;

// A single reaction pill. Tap toggles the current user's reaction; a long-press
// (touch) or right-click (desktop) opens the "who reacted" details. The
// long-press uses an explicit touch timer instead of relying on the browser's
// `contextmenu` event, which does not fire reliably inside the mobile webview.
function ReactionPill({ reaction, onTap, onLongPress }: ReactionPillProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const longPressPending = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    longPressed.current = false;
    longPressPending.current = false;
    startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    timer.current = setTimeout(() => {
      longPressed.current = true;
      longPressPending.current = true;
      if ('vibrate' in navigator) navigator.vibrate(40);
    }, LONG_PRESS_MS);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (longPressPending.current) return;
    if (!timer.current) return;
    const dx = Math.abs(e.touches[0].clientX - startPos.current.x);
    const dy = Math.abs(e.touches[0].clientY - startPos.current.y);
    if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearTimer();
  }, []);

  // Android webviews often fire touchcancel instead of touchend after a
  // long-press, so both finalize through the same path.
  const finalize = useCallback(() => {
    clearTimer();
    if (longPressPending.current) {
      longPressPending.current = false;
      onLongPress();
    }
  }, [onLongPress]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Never let a tap bubble to the popover trigger — details are long-press only.
    e.stopPropagation();
    // Suppress the synthetic click that follows a confirmed long-press.
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onTap();
  }, [onTap]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onLongPress();
  }, [onLongPress]);

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={finalize}
      onTouchCancel={finalize}
      style={{ WebkitTouchCallout: 'none' }}
      className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-full text-xs select-none",
        "border border-border/50 bg-background/80 backdrop-blur-sm",
        "hover:bg-accent/20 transition-colors duration-200",
        "hover:scale-105 transform transition-transform",
        reaction.hasUserReacted && "bg-primary/10 border-primary/30"
      )}
      aria-label={`${reaction.count} ${reaction.emoji} reactions`}
    >
      <span className="text-sm">{reaction.emoji}</span>
      <span className="text-muted-foreground font-medium">
        {reaction.count}
      </span>
    </button>
  );
}

export function ReactionCluster({
  reactions,
  onReactionClick,
  onReactionRemove,
  onShowPopover,
  className
}: ReactionClusterProps) {
  if (reactions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1 mt-1", className)}>
      {reactions.map((reaction) => (
        <ReactionPill
          key={reaction.emoji}
          reaction={reaction}
          onTap={() => {
            if (reaction.hasUserReacted && onReactionRemove) {
              onReactionRemove(reaction.emoji);
            } else {
              onReactionClick(reaction.emoji);
            }
          }}
          onLongPress={onShowPopover}
        />
      ))}
    </div>
  );
}
