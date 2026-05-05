import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, RotateCcw, MapPin, MessageSquare, Clock, Bell, Star, CreditCard } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { notify } from '@/lib/i18n-toast';

interface DiscoverBookActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DiscoverBookActionPopup = ({ open, onOpenChange }: DiscoverBookActionPopupProps) => {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    notify('toasts.discover.actionSelected');
    onOpenChange(false);
  };

  const actions = [
    { icon: Calendar, label: "Book Appointment", color: "bg-primary/10 text-primary", action: "Book Appointment" },
    { icon: RotateCcw, label: "Rebook Previous", color: "bg-blue-500/10 text-blue-600", action: "Rebook Previous" },
    { icon: MapPin, label: "Find Near Me", color: "bg-green-500/10 text-green-600", action: "Find Near Me" },
    { icon: MessageSquare, label: "Message Provider", color: "bg-purple-500/10 text-purple-600", action: "Message Provider" },
    { icon: Clock, label: "View My Bookings", color: "bg-orange-500/10 text-orange-600", action: "View My Bookings" },
    { icon: Bell, label: "Set Reminders", color: "bg-yellow-500/10 text-yellow-600", action: "Set Reminders" },
    { icon: Star, label: "Leave Review", color: "bg-pink-500/10 text-pink-600", action: "Leave Review" },
    { icon: CreditCard, label: "Payment History", color: "bg-red-500/10 text-red-600", action: "Payment History" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Quick Book Actions</DialogTitle>
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
