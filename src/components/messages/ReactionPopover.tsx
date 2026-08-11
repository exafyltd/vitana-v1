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
  const groups = reactions.filter(reaction => reaction.users.length > 0);
  const totalUsers = groups.reduce((sum, group) => sum + group.users.length, 0);

  if (totalUsers === 0) return <>{children}</>;

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
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {groups.map((group) => (
            <div key={group.emoji} className="space-y-1">
              <div className="flex items-center gap-2 px-1">
                <span className="text-lg">{group.emoji}</span>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {group.count}
                </span>
              </div>
              {group.users.map((user, index) => (
                <div
                  key={`${group.emoji}-${user.user_id}-${index}`}
                  className="flex items-center gap-3 py-1.5 pl-1 min-h-[44px]"
                >
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {user.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-foreground flex-1 truncate">
                    {user.display_name || t('screens.messages.anonymous')}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}