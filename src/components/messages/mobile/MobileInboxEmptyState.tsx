import { MessageSquare, Users, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface MobileInboxEmptyStateProps {
  context?: 'global' | 'tenant';
  onNewMessage?: () => void;
  onCreateGroup?: () => void;
}

/**
 * Mobile-optimized empty state for Inbox
 * Friendly, encouraging design with clear CTAs
 */
export function MobileInboxEmptyState({
  context = 'global',
  onNewMessage,
  onCreateGroup
}: MobileInboxEmptyStateProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Illustration */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <MessageSquare className="w-10 h-10 text-primary/60" />
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center shadow-lg">
          <Users className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Message */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {translate('inbox.emptyState.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-[280px]">
        {context === 'global' 
          ? translate('inbox.emptyState.globalDescription')
          : translate('inbox.emptyState.tenantDescription')}
      </p>

      {/* CTAs */}
      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        {onNewMessage && (
          <Button onClick={onNewMessage} className="w-full gap-2">
            <MessageSquare className="w-4 h-4" />
            {translate('inbox.emptyState.startConversation')}
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/community')}
          className="w-full gap-2"
        >
          <Compass className="w-4 h-4" />
          {translate('inbox.emptyState.discoverPeople')}
        </Button>
      </div>
    </div>
  );
}
