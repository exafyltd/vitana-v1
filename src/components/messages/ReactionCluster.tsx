import React from 'react';
import { cn } from '@/lib/utils';
import { ReactionSummary } from '@/hooks/useMessageReactions';

interface ReactionClusterProps {
  reactions: ReactionSummary[];
  onReactionClick: (emoji: string) => void;
  onReactionRemove?: (emoji: string) => void;
  onShowPopover: () => void;
  className?: string;
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
        <button
          key={reaction.emoji}
          onClick={() => onReactionClick(reaction.emoji)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (onReactionRemove && reaction.hasUserReacted) {
              onReactionRemove(reaction.emoji);
            } else {
              onShowPopover();
            }
          }}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
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
      ))}
    </div>
  );
}