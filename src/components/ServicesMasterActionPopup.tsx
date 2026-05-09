import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Stethoscope, 
  Calendar, 
  TestTube, 
  Users, 
  Heart,
  FileText,
  Phone,
  Target,
  Shield,
  Microscope,
  Package
} from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ServicesMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServicesMasterActionPopup({ open, onOpenChange }: ServicesMasterActionPopupProps) {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Book Physical Exam",
      description: "Schedule your annual comprehensive health checkup",
      icon: Stethoscope,
      action: () => {
        onOpenChange(false);
        navigate('/health/services-hub');
      }
    },
    {
      title: "Order Lab Tests",
      description: "Request biomarker analysis and diagnostic tests",
      icon: TestTube,
      action: () => {
        onOpenChange(false);
        navigate('/discover');
      }
    },
    {
      title: "My Appointments",
      description: "View and manage upcoming medical appointments",
      icon: Calendar,
      action: () => {
        onOpenChange(false);
        navigate('/calendar/appointments');
      }
    },
    {
      title: "Find Specialists",
      description: "Connect with medical specialists in your area",
      icon: Users,
      action: () => {
        onOpenChange(false);
        navigate('/discover/doctors-coaches');
      }
    },
    {
      title: "Wellness Programs",
      description: "Join community health challenges and programs",
      icon: Target,
      action: () => {
        onOpenChange(false);
        navigate('/health/services-hub');
      }
    },
    {
      title: "Telemedicine",
      description: "Schedule virtual consultations with providers",
      icon: Phone,
      action: () => {
        onOpenChange(false);
        navigate('/health/services-hub');
      }
    },
    {
      title: "Health Records",
      description: "Access your complete medical history and documents",
      icon: FileText,
      action: () => {
        onOpenChange(false);
        navigate('/health/services-hub');
      }
    },
    {
      title: "Insurance Support",
      description: "Get help with claims and coverage verification",
      icon: Shield,
      action: () => {
        onOpenChange(false);
        navigate('/health/services-hub');
      }
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {t('screens.common.serviceActions')}
          </DialogTitle>
        </DialogHeader>
        
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