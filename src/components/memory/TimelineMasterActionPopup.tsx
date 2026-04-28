import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarCheck,
  Trophy,
  Heart,
  Camera,
  Mic,
  TrendingUp,
  Activity,
  Target
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface TimelineMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TimelineMasterActionPopup({ open, onOpenChange }: TimelineMasterActionPopupProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const timelineActions = [
    {
      key: "logHealthEvent",
      icon: CalendarCheck,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      key: "markAchievement",
      icon: Trophy,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      key: "recordLifeMoment",
      icon: Heart,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      key: "addPhotoMemory",
      icon: Camera,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-muted/20 text-muted-foreground hover:bg-muted/30"
    },
    {
      key: "voiceTimelineEntry",
      icon: Mic,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      key: "trackProgress",
      icon: TrendingUp,
      onClick: () => {
        navigate('/health-tracker');
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      key: "activityCheckIn",
      icon: Activity,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      key: "setTimelineGoal",
      icon: Target,
      onClick: () => {
        console.log("Set Timeline Goal");
        onOpenChange(false);
      },
      color: "bg-muted/20 text-muted-foreground hover:bg-muted/30"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            {translate('timelineActions.title', 'Timeline Actions')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timelineActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Card
                key={index}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/20"
                onClick={action.onClick}
              >
                <CardHeader className="pb-3">
                  <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center mb-3`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">
                    {translate(`timelineActions.items.${action.key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {translate(`timelineActions.items.${action.key}.description`)}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('buttons.close', 'Close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
