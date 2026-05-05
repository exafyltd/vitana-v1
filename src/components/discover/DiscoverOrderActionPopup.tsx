import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCcw, Package, Mail, Undo2, Star, FileText, AlertCircle, CreditCard } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { notify } from '@/lib/i18n-toast';

interface DiscoverOrderActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DiscoverOrderActionPopup = ({ open, onOpenChange }: DiscoverOrderActionPopupProps) => {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    notify('toasts.discover.actionSelected');
    onOpenChange(false);
  };

  const actions = [
    { icon: RotateCcw, label: "Reorder", color: "bg-primary/10 text-primary", action: "Reorder" },
    { icon: Package, label: "Track Shipment", color: "bg-blue-500/10 text-blue-600", action: "Track Shipment" },
    { icon: Mail, label: "Contact Seller", color: "bg-green-500/10 text-green-600", action: "Contact Seller" },
    { icon: Undo2, label: "Request Return", color: "bg-orange-500/10 text-orange-600", action: "Request Return" },
    { icon: Star, label: "Leave Review", color: "bg-yellow-500/10 text-yellow-600", action: "Leave Review" },
    { icon: FileText, label: "View Invoice", color: "bg-purple-500/10 text-purple-600", action: "View Invoice" },
    { icon: AlertCircle, label: "Report Issue", color: "bg-red-500/10 text-red-600", action: "Report Issue" },
    { icon: CreditCard, label: "Payment Details", color: "bg-pink-500/10 text-pink-600", action: "Payment Details" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Order Actions</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto py-6 px-4 flex flex-col items-center gap-3 hover:bg-accent/50 transition-colors"
                onClick={() => handleAction(action.action)}
              >
                <div className={`p-3 rounded-full ${action.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-center">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
