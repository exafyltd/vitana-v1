import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneOff, User } from 'lucide-react';
import { useState, useEffect } from 'react';

interface CallingScreenProps {
  recipientName: string;
  recipientAvatar?: string;
  isVideoCall: boolean;
  onEndCall: () => void;
}

export const CallingScreen = ({
  recipientName,
  recipientAvatar,
  isVideoCall,
  onEndCall,
}: CallingScreenProps) => {
  const [dots, setDots] = useState('');

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 p-8">
        <Avatar className="h-32 w-32">
          <AvatarImage src={recipientAvatar} />
          <AvatarFallback>
            <User className="h-16 w-16" />
          </AvatarFallback>
        </Avatar>

        <div className="text-center">
          <h2 className="text-3xl font-semibold mb-2">{recipientName}</h2>
          <p className="text-muted-foreground text-lg">
            {isVideoCall ? 'Video calling' : 'Calling'}{dots}
          </p>
        </div>

        <Button
          variant="destructive"
          size="lg"
          onClick={onEndCall}
          className="rounded-full h-16 w-16 mt-4"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};
