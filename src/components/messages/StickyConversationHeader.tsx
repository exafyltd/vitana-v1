import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  Info,
  Users,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StickyConversationHeaderProps {
  title: string;
  avatarUrl?: string;
  isOnline?: boolean;
  participantCount?: number;
  isGroup?: boolean;
  onBack?: () => void;
  onVideoCall?: () => void;
  onCall?: () => void;
  onInfo?: () => void;
  className?: string;
}

const StickyConversationHeader: React.FC<StickyConversationHeaderProps> = ({
  title,
  avatarUrl,
  isOnline = false,
  participantCount = 0,
  isGroup = false,
  onBack,
  onVideoCall,
  onCall,
  onInfo,
  className
}) => {
  return (
    <Card className={cn(
      "sticky top-0 z-10 rounded-none border-x-0 border-t-0 shadow-sm bg-card/95 backdrop-blur-sm",
      className
    )}>
      <div className="flex items-center justify-between p-4 space-x-4">
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          
          <div className="relative">
            <Avatar className="w-8 h-8">
              <AvatarImage src={avatarUrl} />
              <AvatarFallback>
                {title?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            {!isGroup && isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm truncate">{title}</h2>
            <div className="flex items-center text-xs text-muted-foreground">
              {isGroup ? (
                <>
                  <Users className="w-3 h-3 mr-1" />
                  {participantCount} members
                </>
              ) : (
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {onCall && (
            <Button variant="ghost" size="sm">
              <Phone className="w-4 h-4" />
            </Button>
          )}
          {onVideoCall && (
            <Button variant="ghost" size="sm">
              <Video className="w-4 h-4" />
            </Button>
          )}
          {onInfo && (
            <Button variant="ghost" size="sm" onClick={onInfo}>
              <Info className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default StickyConversationHeader;