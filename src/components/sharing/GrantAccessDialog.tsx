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
import { notify } from '@/lib/i18n-toast';

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
          <ResponsiveDialogTitle>Grant Data Access</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Allow an entity to access specific data with defined permissions
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form onSubmit={handleSubmit}>
          <ResponsiveDialogBody>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entityEmail">Entity (Email or ID)</Label>
                <Input
                  id="entityEmail"
                  type="email"
                  placeholder="user@example.com or org-id-123"
                  value={entityEmail}
                  onChange={(e) => setEntityEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="permissionLevel">Permission Level</Label>
                <Select value={permissionLevel} onValueChange={setPermissionLevel}>
                  <SelectTrigger id="permissionLevel">
                    <SelectValue placeholder="Select permission level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="edit">View & Edit</SelectItem>
                    <SelectItem value="manage">Full Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dataScope">Data Scope</Label>
                <Select value={dataScope} onValueChange={setDataScope}>
                  <SelectTrigger id="dataScope">
                    <SelectValue placeholder="What data to share" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="health">Health Records</SelectItem>
                    <SelectItem value="calendar">Calendar Events</SelectItem>
                    <SelectItem value="messages">Messages</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="all">All Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expirationDate">Expiration Date (Optional)</Label>
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
              Cancel
            </Button>
            <Button type="submit">Grant Access</Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
