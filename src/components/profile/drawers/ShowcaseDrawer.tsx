import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShowcaseForm } from "../editor/ShowcaseForm";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

interface ShowcaseDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShowcaseDrawer({ open, onOpenChange }: ShowcaseDrawerProps) {
  const { translate } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{translate('editProfile.autopilot.editHighlights')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <ShowcaseForm />
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              {t('screens.profile.cancel')}
            </Button>
            <Button className="flex-1">
              {t('screens.profile.saveChanges')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}