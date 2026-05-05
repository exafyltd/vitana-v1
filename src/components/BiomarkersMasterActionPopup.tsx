import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Download, Share2, TrendingUp, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

interface BiomarkersMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BiomarkersMasterActionPopup({ open, onOpenChange }: BiomarkersMasterActionPopupProps) {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "Order New Lab Test",
      description: "Schedule comprehensive health screening",
      icon: Calendar,
      action: () => {
        navigate('/health/services-hub');
        onOpenChange(false);
      },
      color: "from-blue-500/20 to-cyan-500/20"
    },
    {
      title: "Download All Results", 
      description: "Export your complete lab history",
      icon: Download,
      action: () => {
        // Implement download functionality
        console.log("Downloading all results...");
        onOpenChange(false);
      },
      color: "from-green-500/20 to-emerald-500/20"
    },
    {
      title: "Share with Doctor",
      description: "Send results to your healthcare provider",
      icon: Share2,
      action: () => {
        // Implement sharing functionality
        console.log("Sharing with doctor...");
        onOpenChange(false);
      },
      color: "from-purple-500/20 to-indigo-500/20"
    },
    {
      title: "Track Trends",
      description: "View biomarker trends over time",
      icon: TrendingUp,
      action: () => {
        navigate('/health-tracker');
        onOpenChange(false);
      },
      color: "from-orange-500/20 to-red-500/20"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="bg-gradient-to-r from-blue-500/10 via-green-500/10 to-purple-500/10 -m-6 p-6 mb-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-6 h-6 text-blue-500" />
            {t('screens.common.biomarkerActions')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
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

        <div className="flex justify-end gap-3 px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('screens.common.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}