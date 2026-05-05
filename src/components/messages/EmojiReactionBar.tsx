import React from 'react';
import { Button } from '@/components/ui/button';
import { Reply } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface EmojiReactionBarProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
  onReply?: () => void;
  position?: { x: number; y: number };
  className?: string;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '🙏', '🎉'];

export function EmojiReactionBar({ 
  onEmojiSelect, 
  onClose, 
  onReply, 
  position = { x: 0, y: 0 },
  className 
}: EmojiReactionBarProps) {
  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    // Don't close immediately to allow multiple reactions
  };

  return (
    <div
      className={cn(
        "fixed z-50 flex items-center gap-1 p-2 bg-background/95 backdrop-blur-sm",
        "border border-border rounded-full shadow-lg",
        "animate-scale-in",
        className
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)'
      }}
      onMouseLeave={onClose}
    >
      {/* Reply button (if available) */}
      {onReply && (
        <Button
          variant="ghost"
          size="sm"
          className="w-10 h-10 p-0 rounded-full hover:bg-accent/20"
          onClick={() => {
            onReply();
            onClose();
          }}
          aria-label={t('screens.messages.replyMessage')}
        >
          <Reply className="w-4 h-4" />
        </Button>
      )}
      
      {/* Emoji reactions */}
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