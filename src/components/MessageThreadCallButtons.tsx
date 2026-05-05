import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useCall } from '@/context/CallContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { callSounds } from '@/utils/callSounds';
import { supabase } from '@/integrations/supabase/client';
import { useUserPresence } from '@/hooks/useUserPresence';
import { notify, notifyError } from '@/lib/i18n-toast';

interface MessageThreadCallButtonsProps {
  userId: string;
  recipientId: string;
  recipientName: string;
}

export const MessageThreadCallButtons = ({
  userId,
  recipientId,
  recipientName,
}: MessageThreadCallButtonsProps) => {
  const { startCall, activeCall } = useCall();
  const { toast } = useToast();
  const { getUserPresence, getStatusColor } = useUserPresence();
  const [isCalling, setIsCalling] = useState(false);
  const [audioPrimed, setAudioPrimed] = useState(false);
  
  const recipientPresence = getUserPresence(recipientId);
  const isRecipientOnline = recipientPresence?.status === 'online';
  
  console.log('📞 MessageThreadCallButtons: Rendered', { recipientId, recipientPresence, activeCall: activeCall?.state });

  // Show notification when call times out (no answer)
  useEffect(() => {
    if (activeCall?.state === 'no-answer') {
      notifyError('toasts.common.noAnswer');
    }
  }, [activeCall?.state, activeCall?.recipientName, toast]);

  const handleAudioCall = async () => {
    try {
      console.log('🎯 Audio call button clicked');
      setIsCalling(true);
      
      // Check Realtime connection health
      const channelName = `connection-test-${Date.now()}`;
      const testChannel = supabase.channel(channelName);
      
      const isConnected = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ Connection test timeout');
          resolve(false);
        }, 3000);
        
        testChannel.subscribe((status) => {
          console.log('📡 Connection test status:', status);
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            resolve(true);
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            resolve(false);
          }
        });
      });
      
      if (!isConnected) {
        notifyError('toasts.common.connectionIssue', 'toasts.common.unableConnectCallServicePleaseCheck');
        return;
      }
      
      // Prime audio on first interaction
      if (!audioPrimed) {
        console.log('🔊 Priming audio system...');
        const primed = await callSounds.prime();
        setAudioPrimed(primed);
        if (!primed) {
          notifyError('toasts.common.audioBlocked', 'toasts.common.pleaseAllowAudioHearCallSounds');
        }
      }
      
      console.log('📞 Initiating audio call to:', recipientName);
      notify('toasts.common.calling');
      
      await startCall(recipientId, false);
      console.log('✅ Audio call started successfully');
    } catch (error) {
      console.error('❌ Error starting audio call:', error);
      notifyError('toasts.common.callFailed', 'toasts.common.unableStartCallPleaseTryAgain');
    } finally {
      setIsCalling(false);
    }
  };

  const handleVideoCall = async () => {
    try {
      console.log('🎯 Video call button clicked');
      setIsCalling(true);
      
      // Check Realtime connection health
      const channelName = `connection-test-${Date.now()}`;
      const testChannel = supabase.channel(channelName);
      
      const isConnected = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ Connection test timeout');
          resolve(false);
        }, 3000);
        
        testChannel.subscribe((status) => {
          console.log('📡 Connection test status:', status);
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            resolve(true);
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            resolve(false);
          }
        });
      });
      
      if (!isConnected) {
        notifyError('toasts.common.connectionIssue', 'toasts.common.unableConnectCallServicePleaseCheck');
        return;
      }
      
      // Prime audio on first interaction
      if (!audioPrimed) {
        console.log('🔊 Priming audio system...');
        const primed = await callSounds.prime();
        setAudioPrimed(primed);
        if (!primed) {
          notifyError('toasts.common.audioBlocked', 'toasts.common.pleaseAllowAudioHearCallSounds');
        }
      }
      
      console.log('📞 Initiating video call to:', recipientName);
      notify('toasts.common.calling');
      
      await startCall(recipientId, true);
      console.log('✅ Video call started successfully');
    } catch (error) {
      console.error('❌ Error starting video call:', error);
      notifyError('toasts.common.callFailed', 'toasts.common.unableStartVideoCallPleaseTry');
    } finally {
      setIsCalling(false);
    }
  };

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleAudioCall}
        disabled={isCalling || !!activeCall}
        className="h-8 w-8"
        title={activeCall?.state === 'calling' ? 'Calling...' : 'Audio call'}
      >
        <Phone className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleVideoCall}
        disabled={isCalling || !!activeCall}
        className="h-8 w-8"
        title={activeCall?.state === 'calling' ? 'Calling...' : 'Video call'}
      >
        <Video className="h-4 w-4" />
      </Button>
    </div>
  );
};
