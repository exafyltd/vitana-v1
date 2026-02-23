import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useCall } from '@/context/CallContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { callSounds } from '@/utils/callSounds';
import { supabase } from '@/integrations/supabase/client';
import { useUserPresence } from '@/hooks/useUserPresence';

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
      toast({
        title: "No answer",
        description: `${activeCall.recipientName || 'User'} didn't answer the call`,
        variant: "destructive",
      });
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
        toast({
          title: "Connection issue",
          description: "Unable to connect to call service. Please check your internet connection.",
          variant: "destructive",
        });
        return;
      }
      
      // Prime audio on first interaction
      if (!audioPrimed) {
        console.log('🔊 Priming audio system...');
        const primed = await callSounds.prime();
        setAudioPrimed(primed);
        if (!primed) {
          toast({
            title: "Audio blocked",
            description: "Please allow audio to hear call sounds",
            variant: "destructive"
          });
        }
      }
      
      console.log('📞 Initiating audio call to:', recipientName);
      toast({
        title: "Calling...",
        description: `Calling ${recipientName}`,
      });
      
      await startCall(recipientId, false);
      console.log('✅ Audio call started successfully');
    } catch (error) {
      console.error('❌ Error starting audio call:', error);
      toast({
        title: "Call failed",
        description: "Unable to start the call. Please try again.",
        variant: "destructive",
      });
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
        toast({
          title: "Connection issue",
          description: "Unable to connect to call service. Please check your internet connection.",
          variant: "destructive",
        });
        return;
      }
      
      // Prime audio on first interaction
      if (!audioPrimed) {
        console.log('🔊 Priming audio system...');
        const primed = await callSounds.prime();
        setAudioPrimed(primed);
        if (!primed) {
          toast({
            title: "Audio blocked",
            description: "Please allow audio to hear call sounds",
            variant: "destructive"
          });
        }
      }
      
      console.log('📞 Initiating video call to:', recipientName);
      toast({
        title: "Calling...",
        description: `Starting video call with ${recipientName}`,
      });
      
      await startCall(recipientId, true);
      console.log('✅ Video call started successfully');
    } catch (error) {
      console.error('❌ Error starting video call:', error);
      toast({
        title: "Call failed",
        description: "Unable to start the video call. Please try again.",
        variant: "destructive",
      });
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
