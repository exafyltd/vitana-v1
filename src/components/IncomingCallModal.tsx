import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { t } from '@/lib/i18n-toast';

interface IncomingCallModalProps {
  isOpen: boolean;
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal = ({
  isOpen,
  callerName,
  callerAvatar,
  isVideoCall,
  onAccept,
  onReject,
}: IncomingCallModalProps) => {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center gap-6 py-8">
          <Avatar className="h-24 w-24">
            <AvatarImage src={callerAvatar} />
            <AvatarFallback>
              <User className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>

          <div className="text-center">
            <h2 className="text-2xl font-semibold">{callerName}</h2>
            <p className="text-muted-foreground mt-2">{t('screens.common.incomingValue0Call', { value0: isVideoCall ? 'video' : 'audio' })}
            </p>
          </div>

          <div className="flex gap-6 mt-4">
            <Button
              variant="destructive"
              size="lg"
              onClick={onReject}
              className="rounded-full h-16 w-16"
            >
              <PhoneOff className="h-6 w-6" />
            </Button>

            <Button
              variant="default"
              size="lg"
              onClick={onAccept}
              className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700"
            >
              {isVideoCall ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
