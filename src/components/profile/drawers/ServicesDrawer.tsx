import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ServicesForm } from "../editor/ServicesForm";
import { t } from '@/lib/i18n-toast';

interface ServicesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServicesDrawer({ open, onOpenChange }: ServicesDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('screens.profile.servicesPricing')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <ServicesForm />
          
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}