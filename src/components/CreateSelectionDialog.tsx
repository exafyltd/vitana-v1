import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Card } from "@/components/ui/card";
import { Calendar, Users } from "lucide-react";

interface CreateSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectEvent: () => void;
  onSelectMeetup: () => void;
}

export function CreateSelectionDialog({
  open,
  onOpenChange,
  onSelectEvent,
  onSelectMeetup,
}: CreateSelectionDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Create New</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Choose the type of gathering you want to create
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        
        <ResponsiveDialogBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <h3 className="text-xl font-semibold mb-2">Event</h3>
                  <p className="text-sm text-muted-foreground">
                    Formal gatherings with scheduled times and structured programs
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
                  <h3 className="text-xl font-semibold mb-2">MeetUp</h3>
                  <p className="text-sm text-muted-foreground">
                    Casual gatherings for networking and community building
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
