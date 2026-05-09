import React from 'react';
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from '@/components/ui/responsive-popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ReactionSummary } from '@/hooks/useMessageReactions';
import { t } from '@/lib/i18n-toast';

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
    <ResponsivePopover open={open} onOpenChange={onOpenChange}>
      <ResponsivePopoverTrigger asChild>
        {children}
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent 
        title={t('screens.messages.reactions')}
        className="w-64 p-3" 
        align="start"
        side="top"
      >
        <div className="space-y-2">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allUsers.map((user, index) => (
              <div
                key={`${user.user_id}-${user.emoji}-${index}`}
                className="flex items-center gap-3 py-2 min-h-[44px]"
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
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}