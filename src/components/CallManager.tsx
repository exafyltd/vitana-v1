import { useEffect } from 'react';
import { useCall } from '@/context/CallContext';
import { MessengerCall } from './MessengerCall';
import { IncomingCallModal } from './IncomingCallModal';
import { CallingScreen } from './CallingScreen';
import { useToast } from '@/hooks/use-toast';
import { callSounds } from '@/utils/callSounds';
import { notify } from '@/lib/i18n-toast';

interface CallManagerProps {
  userId: string;
  userName: string;
}

export const CallManager = ({ userId, userName }: CallManagerProps) => {
  const { toast } = useToast();
  const { activeCall, incomingCall, acceptCall, rejectCall, endCall } = useCall();
  
  console.log('📱 CallManager: Rendered', { activeCall: activeCall?.state, incomingCall: !!incomingCall });

  // Handle incoming call - play ringtone and show notification
  useEffect(() => {
    if (incomingCall) {
      console.log('🔔 Playing incoming ringtone for call from:', incomingCall.callerName);
      callSounds.playIncomingRingtone();
      
      notify('toasts.common.incomingCall');
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

      {/* Calling Screen */}
      {activeCall?.state === 'calling' && (
        <CallingScreen
          recipientName={activeCall.recipientName || 'Unknown User'}
          recipientAvatar={activeCall.recipientAvatar}
          isVideoCall={activeCall.isVideoCall}
          onEndCall={handleEndCall}
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
