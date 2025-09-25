import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, Clock } from 'lucide-react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthProvider';

interface CalendarInviteStatusProps {
  messageId: string;
  actionButtons?: any[];
  onActionClick?: (action: any) => void;
  messageData?: any;
  senderId?: string;
}

interface CalendarInviteResponse {
  id: string;
  message_id: string;
  user_id: string;
  response: string;
  event_id?: string;
  responded_at: string;
}

export const CalendarInviteStatus: React.FC<CalendarInviteStatusProps> = ({ 
  messageId, 
  actionButtons, 
  onActionClick, 
  messageData,
  senderId 
}) => {
  const { getInviteResponse } = useCalendarEvents();
  const { user } = useAuth();
  const [response, setResponse] = useState<CalendarInviteResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResponse = async () => {
      try {
        const existingResponse = await getInviteResponse(messageId);
        setResponse(existingResponse);
      } catch (error) {
        console.error('Error fetching invite response:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResponse();

    // Set up real-time subscription for this specific message's responses
    const channel = supabase
      .channel(`invite-response-${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public', 
        table: 'calendar_invite_responses',
        filter: `message_id=eq.${messageId}`
      }, (payload) => {
        console.log('📨 Invite response updated:', payload);
        fetchResponse(); // Refresh response data
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId, getInviteResponse]);

  if (loading) return null;

  const getStatusBadge = () => {
    if (!response) return null;
    
    const resp =
      response.response === 'accept' ? 'accepted' :
      response.response === 'decline' ? 'declined' :
      response.response;
    
    switch (resp) {
      case 'accepted':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Accepted
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
            <X className="w-3 h-3 mr-1" />
            Declined
          </Badge>
        );
      case 'maybe':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Maybe
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
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            Invitation sent
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
            variant={
              button.action === 'calendar_accept' ? 'default' :
              button.action === 'calendar_decline' ? 'outline' :
              button.action === 'calendar_maybe' ? 'secondary' :
              button.variant || 'default'
            }
            className={
              button.action === 'calendar_accept' ? 'bg-green-600 hover:bg-green-700' :
              button.action === 'calendar_decline' ? 'text-red-600 border-red-200 hover:bg-red-50' :
              ''
            }
            onClick={() => onActionClick?.({
              ...button,
              messageData,
              messageId
            })}
          >
            {button.action === 'calendar_accept' && <CheckCircle className="w-3 h-3 mr-1" />}
            {button.action === 'calendar_decline' && <X className="w-3 h-3 mr-1" />}
            {button.action === 'calendar_maybe' && <Clock className="w-3 h-3 mr-1" />}
            {button.label}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-2">
      {getStatusBadge()}
      {renderActionButtons()}
    </div>
  );
};