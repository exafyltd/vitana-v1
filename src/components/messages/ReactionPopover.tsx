import React from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ReactionSummary } from '@/hooks/useMessageReactions';

interface ReactionPopoverProps {
  reactions: ReactionSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function ReactionPopover({ 
  reactions, 
  open, 
  onOpenChange, 
  children 
}: ReactionPopoverProps) {
  const allUsers = reactions.flatMap(reaction => 
    reaction.users.map(user => ({
      ...user,
      emoji: reaction.emoji
    }))
  );

  if (allUsers.length === 0) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-64 p-3" 
        align="start"
        side="top"
      >
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Reactions</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allUsers.map((user, index) => (
              <div
                key={`${user.user_id}-${user.emoji}-${index}`}
                className="flex items-center gap-3 py-1"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {user.display_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground flex-1">
                  {user.display_name || 'Anonymous'}
                </span>
                <span className="text-lg">{user.emoji}</span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}