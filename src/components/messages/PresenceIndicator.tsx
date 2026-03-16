import React from 'react';
import { cn } from '@/lib/utils';
import { useUserPresence } from '@/hooks/useUserPresence';

interface PresenceIndicatorProps {
  userId: string;
  context?: 'global' | 'tenant';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
  showConnection?: boolean;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ 
  userId, 
  context = 'global', 
  size = 'sm',
  className,
  showText = false,
  showConnection = false,
}) => {
  const { getUserPresence, getStatusColor, getStatusText, getConnectionStatusColor, connection } = useUserPresence(context);
  const presence = getUserPresence(userId);

  // Show connection status if requested
  if (showConnection) {
    return (
      <div className={cn("flex items-center gap-1 text-xs", className)}>
        <div 
          className={cn(
            "w-2 h-2 rounded-full",
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

  // Determine status — default to offline if no presence data
  const status = presence?.status ?? 'offline';
  const statusColor = getStatusColor(status);
  const statusText = getStatusText(presence);

  if (showText) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {statusText}
      </span>
    );
  }

  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  return (
    <div 
      className={cn(
        "rounded-full border-2 border-background flex-shrink-0",
        sizeClasses[size],
        statusColor,
        className
      )}
      title={`${statusText}${connection.status !== 'connected' ? ' (Offline mode)' : ''}`}
    />
  );
};

export default PresenceIndicator;
