import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { devConfig } from "@/config/dev-config";
import { notify, t } from '@/lib/i18n-toast';

interface AddRoleViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddRoleViewModal({ open, onOpenChange }: AddRoleViewModalProps) {
  const { toast } = useToast();
  const [role, setRole] = useState("");
  const [viewName, setViewName] = useState("");
  const [permissions, setPermissions] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = () => {
    notify('toasts.dev.roleViewAdded');
    onOpenChange(false);
    setRole("");
    setViewName("");
    setPermissions("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 dark:bg-card/95 backdrop-blur-xl border-white/20 rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">{t('screens.dev.addRoleView')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">{t('screens.dev.role')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder={t('screens.dev.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">{t('screens.dev.patient')}</SelectItem>
                <SelectItem value="professional">{t('screens.dev.professional')}</SelectItem>
                <SelectItem value="staff">{t('screens.dev.staff')}</SelectItem>
                <SelectItem value="admin">{t('screens.dev.admin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="view-name">{t('screens.dev.viewName')}</Label>
            <Input 
              id="view-name" 
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder={t('screens.dev.eGDashboardLayoutSettingsAccess')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="permissions">{t('screens.dev.permissions')}</Label>
            <Input 
              id="permissions" 
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              placeholder={t('screens.dev.eGReadWriteAdmin')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('screens.dev.description')}</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('screens.dev.describeThisRoleViewConfigurationIts')}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('screens.dev.cancel')}
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={devConfig.readonly}
            title={devConfig.readonly ? "Available in Phase 2" : undefined}
          >
            {t('screens.dev.addRoleView')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
