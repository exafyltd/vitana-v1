import { useState } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Video, Users, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreatorStatus } from '@/hooks/useCreator';
import { Link } from 'react-router-dom';
import { isIAPRestricted } from '@/lib/appilix';

interface CreateLiveRoomDialogProps {
  userId: string;
  onRoomCreated: (roomId: string, roomName: string, accessLevel?: string, price?: number) => void;
}

export const CreateLiveRoomDialog = ({ userId, onRoomCreated }: CreateLiveRoomDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: creatorStatus } = useCreatorStatus();

  const canCreatePaidRoom = creatorStatus?.charges_enabled === true;

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a name for your live room",
        variant: "destructive",
      });
      return;
    }

    const effectiveIsPaid = isPaid && !isIAPRestricted();

    if (effectiveIsPaid && !canCreatePaidRoom) {
      toast({
        title: "Payment setup required",
        description: "Please enable payments in Settings before creating paid rooms",
        variant: "destructive",
      });
      return;
    }

    if (effectiveIsPaid && (!price || parseFloat(price) < 1)) {
      toast({
        title: "Price required",
        description: "Please enter a price of at least $1.00",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      onRoomCreated(
        roomId,
        roomName,
        effectiveIsPaid ? 'paid' : 'free',
        effectiveIsPaid ? parseFloat(price) : undefined
      );
      setIsOpen(false);
      setRoomName('');
      setIsPaid(false);
      setPrice('');
      
      toast({
        title: "Live room created",
        description: `${roomName} is ready for participants`,
      });
    } catch (error) {
      toast({
        title: "Failed to create room",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={setIsOpen}>
      <ResponsiveDialogTrigger asChild>
        <Button className="gap-2">
          <Video className="h-4 w-4" />
          Create Live Room
        </Button>
      </ResponsiveDialogTrigger>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Live Room
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        
        <ResponsiveDialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room Name</Label>
              <Input
                id="room-name"
                placeholder="e.g., Weekly Health Coaching"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>

            {!isIAPRestricted() && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="paid-toggle">Paid Room</Label>
                  <p className="text-xs text-muted-foreground">Charge participants to join</p>
                </div>
                <Switch
                  id="paid-toggle"
                  checked={isPaid}
                  onCheckedChange={setIsPaid}
                />
              </div>
            )}

            {!isIAPRestricted() && isPaid && !canCreatePaidRoom && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 p-3">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">Payment setup required</p>
                  <p className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                    <Link to="/settings/billing" className="underline" onClick={() => setIsOpen(false)}>
                      Enable Payments
                    </Link>{' '}
                    in Settings to create paid rooms.
                  </p>
                </div>
              </div>
            )}

            {!isIAPRestricted() && isPaid && canCreatePaidRoom && (
              <div className="space-y-2">
                <Label htmlFor="room-price">Price ($)</Label>
                <Input
                  id="room-price"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="9.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
                {price && parseFloat(price) >= 1 && (
                  <p className="text-xs text-muted-foreground">
                    You'll receive ${(parseFloat(price) * 0.9).toFixed(2)} (90%)
                  </p>
                )}
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Create a multi-participant video room for events, coaching sessions, or meetups.
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={isLoading || (isPaid && !canCreatePaidRoom)}
              className="w-full"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
};
