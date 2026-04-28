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
import { useTranslation } from "@/hooks/useTranslation";

interface PermissionsMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PermissionsMasterActionPopup({ open, onOpenChange }: PermissionsMasterActionPopupProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();

  const permissionActions = [
    {
      key: "privacySettings",
      icon: Shield,
      onClick: () => {
        navigate('/settings/privacy');
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      key: "manageAccess",
      icon: Users,
      onClick: () => {
        console.log("Open access management");
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      key: "securitySettings",
      icon: Lock,
      onClick: () => {
        console.log("Open security settings");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      key: "apiKeysAccess",
      icon: Key,
      onClick: () => {
        navigate('/settings/connected-apps');
        onOpenChange(false);
      },
      color: "bg-muted/20 text-muted-foreground hover:bg-muted/30"
    },
    {
      key: "dataRights",
      icon: FileText,
      onClick: () => {
        console.log("Open data rights center");
        onOpenChange(false);
      },
      color: "bg-primary/10 text-primary hover:bg-primary/20"
    },
    {
      key: "auditLogs",
      icon: Eye,
      onClick: () => {
        console.log("Show audit logs");
        onOpenChange(false);
      },
      color: "bg-accent/10 text-accent-foreground hover:bg-accent/20"
    },
    {
      key: "permissionSettings",
      icon: Settings,
      onClick: () => {
        console.log("Open detailed permissions");
        onOpenChange(false);
      },
      color: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20"
    },
    {
      key: "exportData",
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
            {translate('permissionsActions.title', 'Privacy & Permission Actions')}
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
                  <CardTitle className="text-lg">
                    {translate(`permissionsActions.items.${action.key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {translate(`permissionsActions.items.${action.key}.description`)}
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
