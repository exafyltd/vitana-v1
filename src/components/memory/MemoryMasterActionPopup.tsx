import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BookOpen,
  Mic,
  Clock,
  Search,
  Brain,
  Camera
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface MemoryMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemoryMasterActionPopup({ open, onOpenChange }: MemoryMasterActionPopupProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const quickActions = [
    {
      key: "recordVoiceDiary",
      icon: Mic,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-green-500/10 text-green-600 hover:bg-green-500/20"
    },
    {
      key: "addMemoryNote",
      icon: BookOpen,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"
    },
    {
      key: "viewTimeline",
      icon: Clock,
      onClick: () => {
        navigate('/memory/timeline');
        onOpenChange(false);
      },
      color: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20"
    },
    {
      key: "searchMemories",
      icon: Search,
      onClick: () => {
        navigate('/memory/recall');
        onOpenChange(false);
      },
      color: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
    },
    {
      key: "photoMemory",
      icon: Camera,
      onClick: () => {
        navigate('/memory/diary');
        onOpenChange(false);
      },
      color: "bg-pink-500/10 text-pink-600 hover:bg-pink-500/20"
    },
    {
      key: "aiMemoryAnalysis",
      icon: Brain,
      onClick: () => {
        console.log("AI Memory Analysis");
        onOpenChange(false);
      },
      color: "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-4">
            {translate('memoryActions.title', 'Memory Actions')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => {
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
                    {translate(`memoryActions.items.${action.key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {translate(`memoryActions.items.${action.key}.description`)}
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
