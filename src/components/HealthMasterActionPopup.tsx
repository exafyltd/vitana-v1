import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Users, BookOpen, Activity, Stethoscope, Upload, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface HealthMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadOpen?: () => void;
  onOrderOpen?: () => void;
}

export function HealthMasterActionPopup({ open, onOpenChange, onUploadOpen, onOrderOpen }: HealthMasterActionPopupProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const quickActions = [
    {
      title: "Upload Lab Results",
      description: "Add your latest test results and biomarkers",
      icon: Upload,
      action: () => {
        onOpenChange(false);
        onUploadOpen?.();
      },
      color: "from-cyan-500/20 to-blue-500/20"
    },
    {
      title: "Order Blood Test",
      description: "Schedule lab tests from certified providers",
      icon: FlaskConical,
      action: () => {
        onOpenChange(false);
        onOrderOpen?.();
      },
      color: "from-teal-500/20 to-cyan-500/20"
    },
    {
      title: "Book Health Screening",
      description: "Schedule your annual health checkup",
      icon: Stethoscope,
      action: () => {
        navigate('/health/services-hub');
        onOpenChange(false);
      },
      color: "from-green-500/20 to-emerald-500/20"
    },
    {
      title: "Join Wellness Group",
      description: "Connect with health-focused community",
      icon: Users,
      action: () => {
        navigate('/comm/groups');
        onOpenChange(false);
      },
      color: "from-blue-500/20 to-cyan-500/20"
    },
    {
      title: "Track Today's Health",
      description: "Log your daily wellness metrics",
      icon: Activity,
      action: () => {
        navigate('/health-tracker');
        onOpenChange(false);
      },
      color: "from-purple-500/20 to-indigo-500/20"
    },
    {
      title: "Health Education",
      description: "Learn about nutrition and wellness",
      icon: BookOpen,
      action: () => {
        navigate('/health/education');
        onOpenChange(false);
      },
      color: "from-orange-500/20 to-red-500/20"
    }
  ];

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent
        className={cn(
          !isMobile && "max-w-2xl p-0 overflow-hidden",
          isMobile && "p-0"
        )}
      >
        <ResponsiveDialogHeader
          className={cn(
            "bg-gradient-to-r from-green-500/10 via-blue-500/10 to-purple-500/10",
            !isMobile && "p-6"
          )}
        >
          <ResponsiveDialogTitle className="flex items-center gap-2 text-xl">
            <Heart className="w-6 h-6 text-green-500" />
            Health Actions
          </ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody
          className={cn(
            !isMobile && "p-6"
          )}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {quickActions.map((action) => (
              <Card
                key={action.title}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 group"
                onClick={action.action}
              >
                <CardHeader className="pb-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 text-foreground" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </ResponsiveDialogBody>

        <ResponsiveDialogFooter className={cn(!isMobile && "px-6 pb-6")}>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className={cn(isMobile && "w-full")}
          >
            Close
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
