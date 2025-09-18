import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users, className }) => {
  if (users.length === 0) return null;

  // WhatsApp-style text patterns
  const getDisplayText = () => {
    if (users.length === 1) {
      return `${users[0].name} is typing…`;
    } else if (users.length === 2) {
      return `${users[0].name} and ${users[1].name} are typing…`;
    } else {
      return 'Several people are typing…';
    }
  };

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2", className)}>
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.id} className="w-6 h-6 border-2 border-background">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-xs">
              {user.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{getDisplayText()}</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;