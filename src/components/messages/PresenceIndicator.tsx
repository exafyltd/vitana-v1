import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useUserPresence, UserPresence } from '@/hooks/useUserPresence';

interface PresenceIndicatorProps {
  userId: string;
  context?: 'global' | 'tenant';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  showConnection?: boolean;
  enableAnimation?: boolean;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ 
  userId, 
  context = 'global', 
  size = 'sm',
  className,
  showText = false,
  showConnection = false,
  enableAnimation = true
}) => {
  const { getUserPresence, getStatusColor, getStatusText, getConnectionStatusColor, connection } = useUserPresence(context);
  const [isLoading, setIsLoading] = useState(true);
  const presence = getUserPresence(userId);

  // Handle loading state
  useEffect(() => {
    if (presence || connection.status === 'connected') {
      const timer = setTimeout(() => setIsLoading(false), 100);
      return () => clearTimeout(timer);
    }
  }, [presence, connection.status]);

  // Show connection status if requested
  if (showConnection) {
    return (
      <div className={cn("flex items-center gap-1 text-xs", className)}>
        <div 
          className={cn(
            "w-2 h-2 rounded-full transition-colors duration-200",
            getConnectionStatusColor()
          )}
        />
        <span className="text-muted-foreground">
          {connection.status === 'connected' ? 'Connected' : 
           connection.status === 'connecting' ? 'Connecting...' : 'Disconnected'}
        </span>
      </div>
    );
  }

  // Show loading state
  if (isLoading && !presence) {
    return (
      <div 
        className={cn(
          "rounded-full border-2 border-background animate-pulse bg-muted",
          size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5',
          className
        )}
      />
    );
  }

  // Hide if no presence data and not loading
  if (!presence) {
    return null;
  }

  const lastSeen = new Date(presence.last_seen);
  const hoursAway = Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60));
  
  // Hide indicator if offline for more than 24 hours
  if (hoursAway > 24) {
    return null;
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
        "rounded-full border-2 border-background flex-shrink-0 transition-all duration-200 shadow-sm",
        sizeClasses[size],
        statusColor,
        enableAnimation && presence.status === 'online' && "animate-pulse",
        className
      )}
      style={{
        boxShadow: presence.status === 'online' ? '0 0 6px rgba(var(--health-success), 0.4)' : undefined
      }}
      title={`${statusText}${connection.status !== 'connected' ? ' (Offline mode)' : ''}`}
    />
  );
};

export default PresenceIndicator;