import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useCall } from '@/context/CallContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { callSounds } from '@/utils/callSounds';

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
  const [isCalling, setIsCalling] = useState(false);
  const [audioPrimed, setAudioPrimed] = useState(false);
  
  console.log('📞 MessageThreadCallButtons: Rendered', { recipientId, activeCall: activeCall?.state });

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
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleAudioCall}
        disabled={isCalling || !!activeCall}
        className="gap-2"
      >
        <Phone className="h-4 w-4" />
        {activeCall?.state === 'calling' ? 'Calling...' : 'Call'}
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleVideoCall}
        disabled={isCalling || !!activeCall}
        className="gap-2"
      >
        <Video className="h-4 w-4" />
        {activeCall?.state === 'calling' ? 'Calling...' : 'Video Call'}
      </Button>
    </div>
  );
};
