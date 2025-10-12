import { useEffect } from 'react';
import { useCallState } from '@/hooks/useCallState';
import { MessengerCall } from './MessengerCall';
import { IncomingCallModal } from './IncomingCallModal';
import { useToast } from '@/hooks/use-toast';

interface CallManagerProps {
  userId: string;
  userName: string;
}

export const CallManager = ({ userId, userName }: CallManagerProps) => {
  const { toast } = useToast();
  const { activeCall, incomingCall, acceptCall, rejectCall, endCall } = useCallState(userId);

  useEffect(() => {
    if (incomingCall) {
      // Play ringtone (implement audio notification)
      toast({
        title: "Incoming call",
        description: `Call from user`,
      });
    }
  }, [incomingCall, toast]);

  const handleAcceptCall = () => {
    if (incomingCall) {
      acceptCall(incomingCall);
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      rejectCall(incomingCall);
    }
  };

  return (
    <>
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          isOpen={true}
          callerName="User"
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
          recipientName="User"
          isVideoCall={activeCall.isVideoCall}
          onEndCall={endCall}
        />
      )}
    </>
  );
};
