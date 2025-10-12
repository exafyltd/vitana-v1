import { useEffect } from 'react';
import { useCallState } from '@/hooks/useCallState';
import { MessengerCall } from './MessengerCall';
import { IncomingCallModal } from './IncomingCallModal';
import { useToast } from '@/hooks/use-toast';
import { callSounds } from '@/utils/callSounds';

interface CallManagerProps {
  userId: string;
  userName: string;
}

export const CallManager = ({ userId, userName }: CallManagerProps) => {
  const { toast } = useToast();
  const { activeCall, incomingCall, acceptCall, rejectCall, endCall } = useCallState(userId);

  // Handle incoming call - play ringtone and show notification
  useEffect(() => {
    if (incomingCall) {
      console.log('🔔 Playing incoming ringtone for call from:', incomingCall.callerName);
      callSounds.playIncomingRingtone();
      
      toast({
        title: "Incoming call",
        description: `${incomingCall.isVideoCall ? 'Video' : 'Audio'} call from ${incomingCall.callerName || 'Unknown'}`,
      });
    } else {
      callSounds.stopAll();
    }

    return () => {
      callSounds.stopAll();
    };
  }, [incomingCall, toast]);

  // Handle outgoing call - play ringing tone
  useEffect(() => {
    if (activeCall?.state === 'calling') {
      console.log('📞 Playing outgoing ringtone, calling:', activeCall.recipientName);
      callSounds.playOutgoingRingtone();
    } else if (activeCall?.state === 'active') {
      console.log('✅ Call connected, playing beep');
      callSounds.playConnectedBeep();
    }
  }, [activeCall?.state, activeCall?.recipientName]);

  // Handle call end
  useEffect(() => {
    return () => {
      if (activeCall?.state === 'ended') {
        console.log('📴 Call ended, playing end beep');
        callSounds.playEndedBeep();
      }
    };
  }, [activeCall?.state]);

  const handleAcceptCall = () => {
    if (incomingCall) {
      console.log('✅ User accepting call');
      callSounds.stopAll(); // Stop ringtone immediately
      acceptCall(incomingCall);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      console.log('❌ User rejecting call');
      callSounds.stopAll(); // Stop ringtone immediately
      rejectCall(incomingCall);
    }
  };

  const handleEndCall = () => {
    console.log('📴 User ending call');
    callSounds.playEndedBeep();
    endCall();
  };

  return (
    <>
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={true}
          callerName={incomingCall.callerName || 'Unknown User'}
          callerAvatar={incomingCall.callerAvatar}
          isVideoCall={incomingCall.isVideoCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Active Call */}
      {activeCall?.state === 'active' && (
        <MessengerCall
          callId={activeCall.callId}
          userId={userId}
          recipientId={
            activeCall.callerId === userId
              ? activeCall.recipientId
              : activeCall.callerId
          }
          recipientName={
            activeCall.callerId === userId
              ? activeCall.recipientName || 'Unknown User'
              : activeCall.callerName || 'Unknown User'
          }
          isVideoCall={activeCall.isVideoCall}
          onEndCall={handleEndCall}
        />
      )}
    </>
  );
};
