import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, FileText, Settings } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ManageConsentPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageConsentPopup({ isOpen, onClose }: ManageConsentPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('screens.common.manageConsentSettings')}
          </DialogTitle>
          <DialogDescription>
            {t('screens.common.controlYourDataSharingPreferencesManage')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {t('screens.common.grantNewAccess')}
                </CardTitle>
                <CardDescription className="text-sm">
                  Allow new organizations to access your health data
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="outline" className="text-xs">{t('screens.common.text3PendingRequests')}</Badge>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  {t('screens.common.createDataPackage')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('screens.common.bundleShareSpecificDataSets')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="secondary" className="text-xs">{t('screens.common.new')}</Badge>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  {t('screens.common.privacySettings')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('screens.common.configureDefaultSharingPreferences')}
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('screens.common.reviewConsents')}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t('screens.common.viewManageAllActivePermissions')}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              {t('screens.common.cancel')}
            </Button>
            <Button>
              {t('screens.common.continue')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}