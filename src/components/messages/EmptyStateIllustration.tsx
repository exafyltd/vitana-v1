import { MessageSquare, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from '@/lib/i18n-toast';

interface EmptyStateIllustrationProps {
  type: 'inbox' | 'conversation';
  context?: 'global' | 'tenant';
  threads?: any[];
  onAction?: () => void;
  onCreateGroup?: () => void;
}

export default function EmptyStateIllustration({ 
  type, 
  context = 'global',
  threads = [],
  onAction,
  onCreateGroup
}: EmptyStateIllustrationProps) {
  if (type === 'inbox') {
    // Check if there are any group threads
    const hasGroupThreads = threads?.some(thread => thread.type === 'group');
    const hasDirectThreads = threads?.some(thread => thread.type === 'direct');
    
    // If there are no group threads but there are direct threads, show group-specific empty state
    if (!hasGroupThreads && hasDirectThreads) {
      return (
        <div className="text-center py-12">
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Users className="w-10 h-10 text-primary/60" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold mb-2">{t('screens.messages.noGroupsYet')}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first group to collaborate with multiple people at once in your{' '}
            {context === 'global' ? 'global community' : 'professional network'}.
          </p>
          
          {onCreateGroup && (
            <Button onClick={onCreateGroup} className="gap-2">
              <Users className="w-4 h-4" />
              Create your first group
            </Button>
          )}
        </div>
      );
    }
    
    // Default empty state for no conversations at all
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
        
        <h3 className="text-lg font-semibold mb-2">{t('screens.messages.noConversationsYet')}</h3>
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
      
      <h3 className="text-lg font-medium mb-2">{t('screens.messages.noMessagesYet')}</h3>
      <p className="text-muted-foreground">
        Start the conversation! Send your first message below.
      </p>
    </div>
  );
}