import { Button } from '@/components/ui/button';
import { Phone, Video } from 'lucide-react';
import { useCallState } from '@/hooks/useCallState';

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
  const { startCall } = useCallState(userId);

  const handleAudioCall = async () => {
    await startCall(recipientId, false);
  };

  const handleVideoCall = async () => {
    await startCall(recipientId, true);
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleAudioCall}
        className="gap-2"
      >
        <Phone className="h-4 w-4" />
        Call
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleVideoCall}
        className="gap-2"
      >
        <Video className="h-4 w-4" />
        Video Call
      </Button>
    </div>
  );
};
