import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VisibilityForm } from "../editor/VisibilityForm";
import { t } from '@/lib/i18n-toast';

interface VisibilityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VisibilityDrawer({ open, onOpenChange }: VisibilityDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.profile.privacyVisibility')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <VisibilityForm />
          
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