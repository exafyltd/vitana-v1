import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { devConfig } from "@/config/dev-config";
import { notifyError, t } from '@/lib/i18n-toast';

interface ExportLogsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExportLogsModal({ open, onOpenChange, onSuccess }: ExportLogsModalProps) {
  const [format, setFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState("all");
  const [includeRawLogs, setIncludeRawLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!dateFrom || !dateTo) {
      notifyError('toasts.dev.pleaseSelectDateRange');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    toast.success(`Logs exported as ${format.toUpperCase()}`);
    onOpenChange(false);
    onSuccess?.();
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>{t('screens.dev.exportCommandHistory')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="export-format">{t('screens.dev.format')}</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger id="export-format">
                <SelectValue placeholder={t('screens.dev.selectFormat')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">{t('screens.dev.fromDate')}</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">{t('screens.dev.date')}</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-status">{t('screens.dev.statusFilter')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="export-status">
                <SelectValue placeholder={t('screens.dev.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="success">{t('screens.dev.successOnly')}</SelectItem>
                <SelectItem value="failed">{t('screens.dev.failedOnly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="raw-logs-toggle">{t('screens.dev.includeRawLogs')}</Label>
            <Switch
              id="raw-logs-toggle"
              checked={includeRawLogs}
              onCheckedChange={setIncludeRawLogs}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (devConfig.readonly && true)}
            title={devConfig.readonly ? "Available in Phase 2" : ""}
          >
            {isSubmitting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
