import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JumpToBottomButtonProps {
  show: boolean;
  unreadCount?: number;
  onClick: () => void;
  className?: string;
}

const JumpToBottomButton: React.FC<JumpToBottomButtonProps> = ({
  show,
  unreadCount = 0,
  onClick,
  className
}) => {
  if (!show) return null;

  return (
    <div className={cn(
      "absolute bottom-20 right-4 z-20 transition-all duration-200",
      show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      className
    )}>
      <Button
        onClick={onClick}
        size="sm"
        className="rounded-full shadow-lg bg-domain-messages-accent hover:bg-domain-messages-accent/90 text-white gap-2 px-4"
      >
        {unreadCount > 0 && (
          <span className="text-xs font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <ArrowDown className="w-4 h-4" />
        {unreadCount > 0 ? 'New messages' : 'Jump to latest'}
      </Button>
    </div>
  );
};

export default JumpToBottomButton;