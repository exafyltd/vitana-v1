import React from 'react';
import { cn } from '@/lib/utils';

interface EmojiReactionBarProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🎉'];

export function EmojiReactionBar({ onEmojiSelect, onClose, className }: EmojiReactionBarProps) {
  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Don't close immediately to allow multiple reactions
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 p-2 bg-background/95 backdrop-blur-sm",
        "border border-border rounded-full shadow-lg",
        "animate-scale-in",
        className
      )}
      onMouseLeave={onClose}
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => handleEmojiClick(emoji)}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full",
            "hover:bg-accent/20 transition-colors duration-200",
            "text-2xl hover:scale-110 transform transition-transform"
          )}
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}