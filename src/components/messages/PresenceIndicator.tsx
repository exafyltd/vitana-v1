import React from 'react';
import { cn } from '@/lib/utils';
import { useUserPresence, UserPresence } from '@/hooks/useUserPresence';

interface PresenceIndicatorProps {
  userId: string;
  context?: 'global' | 'tenant';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ 
  userId, 
  context = 'global', 
  size = 'sm',
  className,
  showText = false 
}) => {
  const { getUserPresence, getStatusColor, getStatusText } = useUserPresence(context);
  const presence = getUserPresence(userId);

  // Don't show indicator if user has never been online or is offline for too long
  if (!presence || presence.status === 'offline') {
    const lastSeen = presence ? new Date(presence.last_seen) : null;
    const daysSinceLastSeen = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    // Hide indicator if offline for more than 7 days or never seen
    if (daysSinceLastSeen > 7) {
      return null;
    }
  }

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  const statusColor = presence ? getStatusColor(presence.status) : 'bg-gray-400';
  const statusText = getStatusText(presence);

  if (showText && statusText) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {statusText}
      </span>
    );
  }

  return (
    <div 
      className={cn(
        "rounded-full border-2 border-background flex-shrink-0",
        sizeClasses[size],
        statusColor,
        className
      )}
      title={statusText}
    />
  );
};

export default PresenceIndicator;