import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mic,
  Camera,
  PenTool,
  FileText,
  Video,
  Calendar,
  Tags,
  Upload
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface DiaryMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiaryMasterActionPopup({ open, onOpenChange }: DiaryMasterActionPopupProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const diaryActions = [
    {
      key: "recordVoiceEntry",
      icon: Mic,
      onClick: () => {
        console.log("Start voice recording");
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      key: "addPhotoEntry",
      icon: Camera,
      onClick: () => {
        console.log("Open photo upload");
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      key: "writeTextEntry",
      icon: PenTool,
      onClick: () => {
        console.log("Open text editor");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      key: "quickNote",
      icon: FileText,
      onClick: () => {
        console.log("Create quick note");
        onOpenChange(false);
      },
      color: "bg-muted/20 text-muted-foreground hover:bg-muted/30"
    },
    {
      key: "videoDiary",
      icon: Video,
      onClick: () => {
        console.log("Start video recording");
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      key: "scheduleEntry",
      icon: Calendar,
      onClick: () => {
        navigate('/calendar');
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      key: "tagMemories",
      icon: Tags,
      onClick: () => {
        console.log("Open tag manager");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      key: "importFiles",
      icon: Upload,
      onClick: () => {
        console.log("Open file import");
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
            {translate('diaryActions.title', 'Diary Entry Actions')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {diaryActions.map((action, index) => {
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
                    {translate(`diaryActions.items.${action.key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {translate(`diaryActions.items.${action.key}.description`)}
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
