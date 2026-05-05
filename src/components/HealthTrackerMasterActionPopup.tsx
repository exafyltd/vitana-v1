import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import VoiceDiaryRecorder from "@/components/memory/VoiceDiaryRecorder";
import { useNavigate } from "react-router-dom";
import { 
  Activity, 
  Plus,
  TrendingUp,
  Target,
  Calendar,
  Apple,
  Droplets,
  Dumbbell,
  Moon,
  Brain,
  FileText,
  Mic
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface HealthTrackerMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HealthTrackerMasterActionPopup({ open, onOpenChange }: HealthTrackerMasterActionPopupProps) {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Quick Health Log",
      description: "Log nutrition, exercise, sleep, or wellness data",
      icon: Plus,
      action: () => {
        onOpenChange(false);
        navigate('/health/my-health-tracker');
      }
    },
    {
      title: "Set Health Goal",
      description: "Create new wellness objectives and milestones",
      icon: Target,
      action: () => {
        onOpenChange(false);
        navigate('/health/my-health-tracker');
      }
    },
    {
      title: "Track Nutrition",
      description: "Log meals, supplements, and dietary intake",
      icon: Apple,
      action: () => {
        onOpenChange(false);
        navigate('/health/my-health-tracker');
      }
    },
    {
      title: "Log Exercise",
      description: "Record workouts, activities, and fitness metrics",
      icon: Dumbbell,
      action: () => {
        onOpenChange(false);
        navigate('/health/my-health-tracker');
      }
    },
    {
      title: "Track Sleep",
      description: "Monitor sleep quality, duration, and patterns",
      icon: Moon,
      action: () => {
        onOpenChange(false);
        navigate('/health/my-health-tracker');
      }
    },
    {
      title: "Mental Wellness",
      description: "Log mood, stress levels, and mindfulness practices",
      icon: Brain,
      action: () => {
        onOpenChange(false);
        navigate('/health/my-health-tracker');
      }
    },
    {
      title: "View Progress",
      description: "Analyze trends and track your health journey",
      icon: TrendingUp,
      action: () => {
        onOpenChange(false);
        navigate('/health/my-health-tracker');
      }
    },
    {
      title: "Health Calendar",
      description: "Schedule health activities and appointments",
      icon: Calendar,
      action: () => {
        onOpenChange(false);
        // Universal calendar managed separately
        onOpenChange(false);
      }
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('screens.common.healthTrackerActions')}
          </DialogTitle>
        </DialogHeader>
        
        {/* Voice Recording Section */}
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" />
              {t('screens.common.voiceHealthDiary')}
            </CardTitle>
            <CardDescription>
              {t('screens.common.recordYourDailyHealthUpdatesSymptoms')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VoiceDiaryRecorder />
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <Card 
              key={index} 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 bg-gradient-to-br from-card via-card to-muted/20"
              onClick={action.action}
            >
              <CardHeader className="pb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <action.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{action.title}</CardTitle>
                <CardDescription className="text-sm">
                  {action.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('screens.common.close')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}