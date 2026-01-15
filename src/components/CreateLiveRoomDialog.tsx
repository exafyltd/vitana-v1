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
import { Video, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CreateLiveRoomDialogProps {
  userId: string;
  onRoomCreated: (roomId: string, roomName: string) => void;
}

export const CreateLiveRoomDialog = ({ userId, onRoomCreated }: CreateLiveRoomDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Room name required",
        description: "Please enter a name for your live room",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Generate unique room ID
      const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Here you would typically save room details to database
      // For now, just create the room locally
      
      onRoomCreated(roomId, roomName);
      setIsOpen(false);
      setRoomName('');
      
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

            <div className="text-sm text-muted-foreground">
              Create a multi-participant video room for events, coaching sessions, or meetups.
            </div>

            <Button
              onClick={handleCreateRoom}
              disabled={isLoading}
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
