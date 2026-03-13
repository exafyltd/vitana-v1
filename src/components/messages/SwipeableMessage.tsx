import React, { useRef, useState, useCallback } from 'react';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply: () => void;
  isOwnMessage: boolean;
  enabled?: boolean;
}

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 80;
const SWIPE_HOLDOFF_MS = 400;
const EARLY_SWIPE_MIN_PX = 25;

export function SwipeableMessage({ children, onReply, isOwnMessage, enabled = true }: SwipeableMessageProps) {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const touchStartTime = useRef(0);
  const swiping = useRef(false);
  const cancelled = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    swiping.current = false;
    cancelled.current = false;
  }, [enabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enabled || cancelled.current) return;
    
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    const elapsed = Date.now() - touchStartTime.current;

    // If vertical movement exceeds horizontal, cancel swipe (user is scrolling)
    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) {
      cancelled.current = true;
      setTranslateX(0);
      return;
    }

    // During hold-off period, only allow swipe if movement is clearly intentional
    if (elapsed < SWIPE_HOLDOFF_MS && Math.abs(dx) < EARLY_SWIPE_MIN_PX) {
      return;
    }

    // Only allow swipe-right (positive dx)
    if (dx > 10) {
      swiping.current = true;
      const clamped = Math.min(dx, MAX_SWIPE);
      setTranslateX(clamped);
    }
  }, [enabled]);

  const handleTouchEnd = useCallback(() => {
    if (!enabled) return;
    
    if (translateX >= SWIPE_THRESHOLD) {
      // Trigger reply
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
      onReply();
    }
    
    setTranslateX(0);
    swiping.current = false;
    cancelled.current = false;
  }, [enabled, translateX, onReply]);

  if (!enabled) return <>{children}</>;

  const progress = Math.min(translateX / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden">
      {/* Reply icon that slides in from the left */}
      <div
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center",
          "w-8 h-8 rounded-full bg-primary/15 text-primary transition-opacity",
          progress > 0.3 ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: `translateY(-50%) scale(${0.5 + progress * 0.5})`,
        }}
      >
        <Reply className="w-4 h-4" />
      </div>

      {/* Message content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: swiping.current ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
