import { ClickableAvatar } from "@/components/ui/clickable-avatar";
import { Badge } from "@/components/ui/badge";
import PresenceIndicator from "@/components/messages/PresenceIndicator";
import { formatDistanceToNow } from "date-fns";

interface MobileConversationCardProps {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage?: string;
  timestamp?: string;
  unreadCount?: number;
  isActive?: boolean;
  isPinned?: boolean;
  isGroup?: boolean;
  participantUserId?: string;
  participantHandle?: string;
  context?: 'global' | 'tenant';
  onClick?: () => void;
}

/**
 * Mobile-optimized conversation card for Inbox
 * Single-column layout with clear touch targets (min 44px)
 */
export function MobileConversationCard({
  id,
  name,
  avatarUrl,
  lastMessage,
  timestamp,
  unreadCount = 0,
  isActive = false,
  isPinned = false,
  isGroup = false,
  participantUserId,
  participantHandle,
  context = 'global',
  onClick
}: MobileConversationCardProps) {
  const hasUnread = unreadCount > 0;
  
  const formattedTime = timestamp 
    ? (() => {
        const raw = formatDistanceToNow(new Date(timestamp), { addSuffix: false });
        if (raw.includes('less than')) return 'now';
        return raw
          .replace('about ', '')
          .replace(' hours', 'h')
          .replace(' hour', 'h')
          .replace(' minutes', 'm')
          .replace(' minute', 'm')
          .replace(' days', 'd')
          .replace(' day', 'd')
          .replace(' months', 'mo')
          .replace(' month', 'mo')
          .replace(' years', 'y')
          .replace(' year', 'y');
      })()
    : '';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 min-h-[64px] text-left ${
        isActive 
          ? 'bg-primary/10 border-l-2 border-l-primary' 
          : 'bg-card hover:bg-muted/50'
      } ${hasUnread ? 'border-l-2 border-l-primary/60' : ''}`}
    >
      {/* Avatar with presence */}
      <div className="relative shrink-0">
        <ClickableAvatar
          userId={participantUserId}
          handle={participantHandle}
          src={avatarUrl}
          fallback={name?.[0]?.toUpperCase() || '?'}
          alt={name}
          className="w-12 h-12"
        />
        {!isGroup && participantUserId && (
          <div className="absolute -bottom-0.5 -right-0.5">
            <PresenceIndicator 
              userId={participantUserId} 
              context={context}
              size="sm"
            />
          </div>
        )}
        {isPinned && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`text-sm truncate ${hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
            {name}
          </h3>
          <span className="text-xs text-muted-foreground shrink-0">
            {formattedTime}
          </span>
        </div>
        
        {lastMessage && (
          <p className={`text-sm truncate mt-0.5 ${hasUnread ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
            {lastMessage}
          </p>
        )}
      </div>

      {/* Unread indicator */}
      {hasUnread && (
        <Badge 
          variant="default" 
          className="shrink-0 w-5 h-5 rounded-full p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </button>
  );
}
