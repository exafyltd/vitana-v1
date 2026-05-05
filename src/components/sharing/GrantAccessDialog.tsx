import React from "react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { notify, t } from '@/lib/i18n-toast';

interface GrantAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrantAccessDialog({ open, onOpenChange }: GrantAccessDialogProps) {
  const [entityEmail, setEntityEmail] = React.useState("");
  const [permissionLevel, setPermissionLevel] = React.useState("");
  const [expirationDate, setExpirationDate] = React.useState("");
  const [dataScope, setDataScope] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    notify('toasts.sharing.accessGranted');
    setEntityEmail("");
    setPermissionLevel("");
    setExpirationDate("");
    setDataScope("");
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('screens.sharing.grantDataAccess')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('screens.sharing.allowEntityAccessSpecificDataWith')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogBody>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entityEmail">{t('screens.sharing.entityEmailId')}</Label>
                <Input
                  id="entityEmail"
                  type="email"
                  placeholder={t('screens.sharing.userExampleComOrgid123')}
                  value={entityEmail}
                  onChange={(e) => setEntityEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permissionLevel">{t('screens.sharing.permissionLevel')}</Label>
                <Select value={permissionLevel} onValueChange={setPermissionLevel}>
                  <SelectTrigger id="permissionLevel">
                    <SelectValue placeholder={t('screens.sharing.selectPermissionLevel')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">{t('screens.sharing.viewOnly')}</SelectItem>
                    <SelectItem value="edit">{t('screens.sharing.viewEdit')}</SelectItem>
                    <SelectItem value="manage">{t('screens.sharing.fullManagement')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dataScope">{t('screens.sharing.dataScope')}</Label>
                <Select value={dataScope} onValueChange={setDataScope}>
                  <SelectTrigger id="dataScope">
                    <SelectValue placeholder={t('screens.sharing.whatDataShare')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health">{t('screens.sharing.healthRecords')}</SelectItem>
                    <SelectItem value="calendar">{t('screens.sharing.calendarEvents')}</SelectItem>
                    <SelectItem value="messages">{t('screens.sharing.messages')}</SelectItem>
                    <SelectItem value="documents">{t('screens.sharing.documents')}</SelectItem>
                    <SelectItem value="all">{t('screens.sharing.allData')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expirationDate">{t('screens.sharing.expirationDateOptional')}</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                />
              </div>
            </div>
          </ResponsiveDialogBody>
          <ResponsiveDialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('screens.sharing.cancel')}
            </Button>
            <Button type="submit">{t('screens.sharing.grantAccess')}</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
