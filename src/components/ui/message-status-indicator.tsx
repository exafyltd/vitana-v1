import React from 'react';
import { Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageStatusIndicatorProps {
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  className?: string;
  size?: 'sm' | 'md';
}

export const MessageStatusIndicator: React.FC<MessageStatusIndicatorProps> = ({
  status,
  className,
  size = 'sm'
}) => {
  const sizeClasses = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  switch (status) {
    case 'sending':
      return (
        <Clock 
          className={cn(
            sizeClasses,
            'text-muted-foreground animate-pulse',
            className
          )}
        />
      );
    
    case 'sent':
      return (
        <Check 
          className={cn(
            sizeClasses,
            'text-muted-foreground',
            className
          )}
        />
      );
    
    case 'delivered':
      return (
        <CheckCheck 
          className={cn(
            sizeClasses,
            'text-muted-foreground',
            className
          )}
        />
      );
    
    case 'read':
      return (
        <CheckCheck 
          className={cn(
            sizeClasses,
            'text-primary',
            className
          )}
        />
      );
    
    case 'failed':
      return (
        <AlertCircle 
          className={cn(
            sizeClasses,
            'text-destructive',
            className
          )}
        />
      );
    
    default:
      return null;
  }
};