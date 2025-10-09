import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Calendar, Zap, Package, RotateCcw, CreditCard, MapPin, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DiscoverMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DiscoverMasterActionPopup = ({ open, onOpenChange }: DiscoverMasterActionPopupProps) => {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    toast({
      title: "Action Selected",
      description: `${action} feature coming soon!`,
    });
    onOpenChange(false);
  };

  const actions = [
    { icon: ShoppingCart, label: "View Cart", color: "bg-primary/10 text-primary", action: "View Cart" },
    { icon: Calendar, label: "Book Appointment", color: "bg-blue-500/10 text-blue-600", action: "Book Appointment" },
    { icon: Zap, label: "Quick Checkout", color: "bg-green-500/10 text-green-600", action: "Quick Checkout" },
    { icon: Package, label: "Track Orders", color: "bg-orange-500/10 text-orange-600", action: "Track Orders" },
    { icon: RotateCcw, label: "Reorder Previous", color: "bg-purple-500/10 text-purple-600", action: "Reorder Previous" },
    { icon: CreditCard, label: "Manage Payment", color: "bg-yellow-500/10 text-yellow-600", action: "Manage Payment" },
    { icon: MapPin, label: "Find Services Near Me", color: "bg-pink-500/10 text-pink-600", action: "Find Services Near Me" },
    { icon: Heart, label: "View Saved Items", color: "bg-red-500/10 text-red-600", action: "View Saved Items" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Quick Actions</DialogTitle>
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
