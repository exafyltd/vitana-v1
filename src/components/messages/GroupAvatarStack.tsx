import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
// VTID-04959: legacy group threads carry display_name/avatar_url at the top
// level, not in `profile` — the shared helpers read both, so no more "?".
import {
  getParticipantAvatarUrl,
  getParticipantDisplayName,
  type ThreadParticipant,
} from "@/utils/conversationHelpers";

const initial = (p: ThreadParticipant) => {
  const name = getParticipantDisplayName(p);
  return name === 'Unknown' ? '?' : name[0]?.toUpperCase() || '?';
};

interface GroupAvatarStackProps {
  participants: ThreadParticipant[];
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

    return (
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={getParticipantAvatarUrl(participant) || undefined} />
        <AvatarFallback>{initial(participant)}</AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className={cn("flex -space-x-1 rtl:space-x-reverse", className)} data-testid="group-avatar-stack">
      {visibleParticipants.map((participant, index) => {
        return (
          <Avatar
            key={participant.user_id}
            className={cn(sizeClasses[size], "border-2 border-background")}
            style={{ zIndex: maxVisible - index }}
          >
            <AvatarImage src={getParticipantAvatarUrl(participant) || undefined} />
            <AvatarFallback>{initial(participant)}</AvatarFallback>
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