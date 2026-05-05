import { Heart, Users, BookOpen, Activity, Stethoscope, Upload, FlaskConical, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface HealthMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadOpen?: () => void;
  onOrderOpen?: () => void;
}

export function HealthMasterActionPopup({ open, onOpenChange, onUploadOpen, onOrderOpen }: HealthMasterActionPopupProps) {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Upload Lab Results",
      description: "Add your latest test results and biomarkers",
      icon: Upload,
      action: () => {
        onOpenChange(false);
        onUploadOpen?.();
      },
      gradient: "from-cyan-500/20 to-blue-500/20",
    },
    {
      title: "Order Blood Test",
      description: "Schedule lab tests from certified providers",
      icon: FlaskConical,
      action: () => {
        onOpenChange(false);
        onOrderOpen?.();
      },
      gradient: "from-teal-500/20 to-cyan-500/20",
    },
    {
      title: "Book Health Screening",
      description: "Schedule your annual health checkup",
      icon: Stethoscope,
      action: () => {
        navigate('/health/services-hub');
        onOpenChange(false);
      },
      gradient: "from-green-500/20 to-emerald-500/20",
    },
    {
      title: "Join Wellness Group",
      description: "Connect with health-focused community",
      icon: Users,
      action: () => {
        navigate('/comm/groups');
        onOpenChange(false);
      },
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      title: "Track Today's Health",
      description: "Log your daily wellness metrics",
      icon: Activity,
      action: () => {
        navigate('/health-tracker');
        onOpenChange(false);
      },
      gradient: "from-purple-500/20 to-indigo-500/20",
    },
    {
      title: "Health Education",
      description: "Learn about nutrition and wellness",
      icon: BookOpen,
      action: () => {
        navigate('/health/education');
        onOpenChange(false);
      },
      gradient: "from-orange-500/20 to-red-500/20",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-4 sm:p-6 rounded-lg"
      >
        {/* Standard unframed X close, top-right. Wrapped in a span so it isn't
            a direct <button> child of DialogContent — that's what the framework's
            [&>button]:sr-only selector hides. */}
        <span className="absolute right-3 top-3 z-10">
          <DialogClose
            aria-label="Close"
            style={{ boxShadow: 'none' }}
            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </span>

        <DialogHeader className="pr-8">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-green-500 shrink-0" />
            <DialogTitle className="text-xl sm:text-2xl break-words">
              Health Actions
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="grid gap-2.5 sm:gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.title}
                onClick={action.action}
                className={cn(
                  "flex items-start gap-3 p-3 sm:p-4 rounded-lg border-2 text-left transition-all w-full min-w-0",
                  "hover:border-primary hover:shadow-md",
                  `bg-gradient-to-r ${action.gradient}`
                )}
              >
                <Icon className="h-5 w-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base break-words">
                    {action.title}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground break-words">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
