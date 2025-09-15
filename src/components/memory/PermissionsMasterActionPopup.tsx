import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Shield, 
  Users, 
  Lock,
  Key,
  FileText,
  Settings,
  Eye,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PermissionsMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionsMasterActionPopup({ open, onOpenChange }: PermissionsMasterActionPopupProps) {
  const navigate = useNavigate();

  const permissionActions = [
    {
      title: "Privacy Settings",
      description: "Configure data privacy and sharing preferences",
      icon: Shield,
      onClick: () => {
        navigate('/settings/privacy');
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      title: "Manage Access",
      description: "Control who can view your health memories",
      icon: Users,
      onClick: () => {
        console.log("Open access management");
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      title: "Security Settings",
      description: "Update authentication and security preferences",
      icon: Lock,
      onClick: () => {
        console.log("Open security settings");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      title: "API Keys & Access",
      description: "Manage third-party app integrations and API access",
      icon: Key,
      onClick: () => {
        navigate('/settings/connected-apps');
        onOpenChange(false);
      },
      color: "bg-muted/20 text-muted-foreground hover:bg-muted/30"
    },
    {
      title: "Data Rights",
      description: "Exercise your rights to data portability and deletion",
      icon: FileText,
      onClick: () => {
        console.log("Open data rights center");
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      title: "Audit Logs",
      description: "Review access history and security audit trail",
      icon: Eye,
      onClick: () => {
        console.log("Show audit logs");
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      title: "Permission Settings",
      description: "Fine-tune granular permissions for different features",
      icon: Settings,
      onClick: () => {
        console.log("Open detailed permissions");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      title: "Export Data",
      description: "Download your memories and health data securely",
      icon: Download,
      onClick: () => {
        console.log("Start data export");
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
            Privacy & Permission Actions
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {permissionActions.map((action, index) => {
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
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-center pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}