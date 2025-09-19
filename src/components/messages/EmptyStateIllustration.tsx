import { MessageSquare, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateIllustrationProps {
  type: 'inbox' | 'conversation';
  context?: 'global' | 'tenant';
  onAction?: () => void;
}

export default function EmptyStateIllustration({ 
  type, 
  context = 'global',
  onAction 
}: EmptyStateIllustrationProps) {
  if (type === 'inbox') {
    return (
      <div className="text-center py-12">
        <div className="relative mb-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <MessageSquare className="w-10 h-10 text-primary/60" />
          </div>
          <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Start connecting with others in your{' '}
          {context === 'global' ? 'global community' : 'professional network'}.
          Your conversations will appear here.
        </p>
        
        {onAction && (
          <Button onClick={onAction} className="gap-2">
            <Plus className="w-4 h-4" />
            Start a conversation
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-16">
      <div className="relative mb-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground/60" />
        </div>
      </div>
      
      <h3 className="text-lg font-medium mb-2">No messages yet</h3>
      <p className="text-muted-foreground">
        Start the conversation! Send your first message below.
      </p>
    </div>
  );
}