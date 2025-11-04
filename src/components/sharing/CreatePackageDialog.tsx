import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";

interface CreatePackageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePackageDialog({ open, onOpenChange }: CreatePackageDialogProps) {
  const [packageName, setPackageName] = React.useState("");
  const [exportFormat, setExportFormat] = React.useState("");
  const [encrypted, setEncrypted] = React.useState(false);
  const [dataTypes, setDataTypes] = React.useState({
    health: false,
    calendar: false,
    messages: false,
    documents: false,
    contacts: false,
  });

  const handleDataTypeChange = (type: keyof typeof dataTypes) => {
    setDataTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTypes = Object.entries(dataTypes)
      .filter(([_, selected]) => selected)
      .map(([type]) => type);

    // Placeholder for actual implementation
    toast({
      title: "Data package created",
      description: `"${packageName}" package created with ${selectedTypes.length} data types`,
    });

    // Reset form
    setPackageName("");
    setExportFormat("");
    setEncrypted(false);
    setDataTypes({
      health: false,
      calendar: false,
      messages: false,
      documents: false,
      contacts: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Data Package</DialogTitle>
          <DialogDescription>
            Bundle and export your data for sharing or backup
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="packageName">Package Name</Label>
              <Input
                id="packageName"
                placeholder="e.g., Q1 2024 Health Report"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Data Types to Include</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="health"
                    checked={dataTypes.health}
                    onCheckedChange={() => handleDataTypeChange("health")}
                  />
                  <label htmlFor="health" className="text-sm cursor-pointer">
                    Health Records
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="calendar"
                    checked={dataTypes.calendar}
                    onCheckedChange={() => handleDataTypeChange("calendar")}
                  />
                  <label htmlFor="calendar" className="text-sm cursor-pointer">
                    Calendar Events
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="messages"
                    checked={dataTypes.messages}
                    onCheckedChange={() => handleDataTypeChange("messages")}
                  />
                  <label htmlFor="messages" className="text-sm cursor-pointer">
                    Messages
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="documents"
                    checked={dataTypes.documents}
                    onCheckedChange={() => handleDataTypeChange("documents")}
                  />
                  <label htmlFor="documents" className="text-sm cursor-pointer">
                    Documents
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contacts"
                    checked={dataTypes.contacts}
                    onCheckedChange={() => handleDataTypeChange("contacts")}
                  />
                  <label htmlFor="contacts" className="text-sm cursor-pointer">
                    Contacts
                  </label>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exportFormat">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger id="exportFormat">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="zip">ZIP Archive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="encrypted">Encrypt Package</Label>
                <p className="text-xs text-muted-foreground">
                  Protect data with AES-256 encryption
                </p>
              </div>
              <Switch
                id="encrypted"
                checked={encrypted}
                onCheckedChange={setEncrypted}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Package</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
