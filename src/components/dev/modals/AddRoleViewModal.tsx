import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from '@/hooks/use-toast';
import { devConfig } from "@/config/dev-config";
import { notify } from '@/lib/i18n-toast';

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
          <DialogTitle className="text-xl font-semibold">Add Role View</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="patient">Patient</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="view-name">View Name</Label>
            <Input 
              id="view-name" 
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="e.g., Dashboard Layout, Settings Access"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="permissions">Permissions</Label>
            <Input 
              id="permissions" 
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              placeholder="e.g., read, write, admin"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this role view configuration and its purpose"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={devConfig.readonly}
            title={devConfig.readonly ? "Available in Phase 2" : undefined}
          >
            Add Role View
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
