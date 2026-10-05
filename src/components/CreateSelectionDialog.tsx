import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Card } from "@/components/ui/card";
import { Calendar, Radio, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface CreateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEvent: () => void;
  onSelectMeetup: () => void;
  /**
   * Third option "Live Room" (VTID-04907): opens the Go Live popup (instant or
   * scheduled). Omitted → only Event / MeetUp are offered.
   */
  onSelectLiveRoom?: () => void;
}

export function CreateSelectionDialog({
  open,
  onOpenChange,
  onSelectEvent,
  onSelectMeetup,
  onSelectLiveRoom,
}: CreateSelectionDialogProps) {
  const { translate } = useTranslation();

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {translate('createSelection.title', 'Create New')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {translate('createSelection.description', 'Choose the type of gathering you want to create')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        
        <ResponsiveDialogBody>
          <div className={cn("grid grid-cols-1 gap-4", onSelectLiveRoom ? "md:grid-cols-3" : "md:grid-cols-2")}>
            {/* Event Option */}
            <Card
              className="p-6 cursor-pointer transition-all hover:border-primary hover:shadow-lg border-2"
              onClick={onSelectEvent}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Calendar className="h-12 w-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {translate('createSelection.event', 'Event')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {translate('createSelection.eventDescription', 'Formal gatherings with scheduled times and structured programs')}
                  </p>
                </div>
              </div>
            </Card>

            {/* MeetUp Option */}
            <Card
              className="p-6 cursor-pointer transition-all hover:border-primary hover:shadow-lg border-2"
              onClick={onSelectMeetup}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-secondary/10">
                  <Users className="h-12 w-12 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {translate('createSelection.meetup', 'MeetUp')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {translate('createSelection.meetupDescription', 'Casual gatherings for networking and community building')}
                  </p>
                </div>
              </div>
            </Card>

            {/* Live Room Option */}
            {onSelectLiveRoom && (
              <Card
                className="p-6 cursor-pointer transition-all hover:border-primary hover:shadow-lg border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onSelectLiveRoom}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectLiveRoom();
                  }
                }}
                role="button"
                tabIndex={0}
                data-testid="create-option-live-room"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-4 rounded-full bg-destructive/10">
                    <Radio className="h-12 w-12 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {translate('createSelection.liveRoom', 'Live Room')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {translate('createSelection.liveRoomDescription', 'Go live now or schedule an audio or video session')}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
