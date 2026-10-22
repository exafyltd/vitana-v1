import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Clock } from 'lucide-react';
import { useCalendarEvents, CalendarInviteResponse } from '@/hooks/useCalendarEvents';
import { realtimeChannel, removeRealtimeChannel } from '@/integrations/supabase/realtime';
import { useAuth } from '@/context/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { InviteResponseSummary } from './InviteResponseSummary';
import { notify, t } from '@/lib/i18n-toast';

interface CalendarInviteStatusProps {
  messageId: string;
  actionButtons?: any[];
  onActionClick?: (action: any) => void;
  messageData?: any;
  senderId?: string;
}


export const CalendarInviteStatus: React.FC<CalendarInviteStatusProps> = ({ 
  messageId, 
  actionButtons, 
  onActionClick, 
  messageData,
  senderId 
}) => {
  const { getInviteResponse, getAllInviteResponses } = useCalendarEvents();
  const { user } = useAuth();
  const { toast } = useToast();
  const [response, setResponse] = useState<CalendarInviteResponse | null>(null);
  const [allResponses, setAllResponses] = useState<CalendarInviteResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const isMessageSender = (senderId && senderId === user?.id) || (messageData?.sender_id === user?.id);
    
    const fetchResponse = async () => {
      try {
        if (isMessageSender) {
          // For senders, fetch all responses to show summary
          console.log('📅 Fetching all responses for message:', messageId);
          const responses = await getAllInviteResponses(messageId);
          console.log('📅 Found responses for sender:', responses);
          setAllResponses(responses);
        } else {
          // For recipients, fetch their own response
          console.log('📅 Fetching own response for message:', messageId);
          const existingResponse = await getInviteResponse(messageId);
          console.log('📅 Found own response:', existingResponse);
          setResponse(existingResponse);
        }
      } catch (error) {
        console.error('Error fetching invite response:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResponse();

    // Set up real-time subscription for this specific message's responses
    const channel = realtimeChannel(`invite-response-${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'calendar_invite_responses',
        filter: `message_id=eq.${messageId}`
      }, (payload) => {
        console.log('📨 Invite response updated:', payload);
        
        // Show toast notification to sender when someone responds
        if (isMessageSender && payload.eventType === 'INSERT') {
          const newResponse = payload.new as any;
          if (newResponse.user_id !== user?.id) {
            notify('toasts.messages.newResponse');
          }
        }
        
        fetchResponse(); // Refresh response data
      })
      .subscribe();

    return () => {
      removeRealtimeChannel(channel);
    };
  }, [messageId, getInviteResponse, getAllInviteResponses, senderId, messageData, user?.id, toast]);

  if (loading) return null;

  const getStatusBadge = () => {
    if (!response) return null;
    
    const resp = response.response;
    
    switch (resp) {
      case 'accepted':
        return (
          <Badge variant="secondary" className="bg-status-success-subtle text-status-success border-status-success/25">
            <CheckCircle className="w-3 h-3 me-1" />
            {t('screens.messages.accepted')}
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="secondary" className="bg-status-error-subtle text-status-error border-status-error/25">
            <X className="w-3 h-3 me-1" />
            {t('screens.messages.declined')}
          </Badge>
        );
      case 'maybe':
        return (
          <Badge variant="secondary" className="bg-status-warning-subtle text-status-warning border-status-warning/25">
            <Clock className="w-3 h-3 me-1" />
            {t('screens.messages.maybe')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderActionButtons = () => {
    if (response || !actionButtons) return null;
    
    // Check if current user is the sender (use senderId prop or fallback to messageData)
    const isMessageSender = (senderId && senderId === user?.id) || (messageData?.sender_id === user?.id);
    
    // Don't show action buttons to the sender of the invite
    if (isMessageSender) {
      return (
        <div className="mt-3">
          <Badge variant="secondary" className="bg-category-3/15 text-category-3 border-category-3/25">
            {t('screens.messages.invitationSent')}
          </Badge>
        </div>
      );
    }
    
    return (
      <div className="flex gap-2 mt-3">
        {actionButtons.map((button: any, index: number) => (
          <Button
            key={index}
            size="sm"
            disabled={isSubmitting}
            variant={
              button.action === 'calendar_accept' ? 'default' :
              button.action === 'calendar_decline' ? 'outline' :
              button.action === 'calendar_maybe' ? 'secondary' :
              button.variant || 'default'
            }
            className={
              button.action === 'calendar_accept' ? 'bg-status-success hover:bg-status-success' :
              button.action === 'calendar_decline' ? 'text-status-error border-status-error/25 hover:bg-status-error-subtle' :
              ''
            }
            onClick={async () => {
              console.log('📅 Calendar invite action clicked:', { 
                action: button.action, 
                label: button.label, 
                messageId, 
                messageData 
              });
              
              setIsSubmitting(true);
              try {
                await onActionClick?.({
                  ...button,
                  messageData,
                  messageId
                });
                
                console.log('✅ Calendar invite action completed successfully');
              } catch (error) {
                console.error('❌ Calendar invite action failed:', error);
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {button.action === 'calendar_accept' && <CheckCircle className="w-3 h-3 me-1" />}
            {button.action === 'calendar_decline' && <X className="w-3 h-3 me-1" />}
            {button.action === 'calendar_maybe' && <Clock className="w-3 h-3 me-1" />}
            {button.label}
          </Button>
        ))}
      </div>
    );
  };

  // Check if current user is the sender
  const isMessageSender = (senderId && senderId === user?.id) || (messageData?.sender_id === user?.id);

  return (
    <div className="mt-2">
      {isMessageSender ? (
        <InviteResponseSummary responses={allResponses} />
      ) : (
        <>
          {getStatusBadge()}
          {renderActionButtons()}
        </>
      )}
    </div>
  );
};