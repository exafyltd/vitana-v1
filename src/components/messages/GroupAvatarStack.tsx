import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Participant {
  user_id: string;
  profile?: {
    display_name?: string;
    full_name?: string;
    avatar_url?: string;
  };
}

interface GroupAvatarStackProps {
  participants: Participant[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function GroupAvatarStack({ 
  participants, 
  maxVisible = 3, 
  size = 'md',
  className 
}: GroupAvatarStackProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const visibleParticipants = participants.slice(0, maxVisible);
  const remainingCount = Math.max(0, participants.length - maxVisible);

  if (participants.length === 0) {
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  }

  if (participants.length === 1) {
    const participant = participants[0];
    const profile = participant.profile;
    const displayName = profile?.display_name || profile?.full_name || '?';
    
    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={cn("flex -space-x-1", className)}>
      {visibleParticipants.map((participant, index) => {
        const profile = participant.profile;
        const displayName = profile?.display_name || profile?.full_name || '?';
        
        return (
          <Avatar 
            key={participant.user_id} 
            className={cn(
              sizeClasses[size],
              "border-2 border-background",
              index > 0 && "ml-0"
            )}
            style={{ zIndex: maxVisible - index }}
          >
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{displayName[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        );
      })}
      
      {remainingCount > 0 && (
        <Avatar 
          className={cn(
            sizeClasses[size],
            "border-2 border-background bg-muted text-muted-foreground"
          )}
          style={{ zIndex: 0 }}
        >
          <AvatarFallback>+{remainingCount}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}