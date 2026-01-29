import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Calendar, Zap, Package, RotateCcw, CreditCard, MapPin, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface DiscoverMasterActionPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Stable action IDs for logic - display labels from translations
const ACTION_IDS = [
  'viewCart',
  'bookAppointment', 
  'quickCheckout',
  'trackOrders',
  'reorderPrevious',
  'managePayment',
  'findServicesNearMe',
  'viewSavedItems'
] as const;

const ACTION_ICONS = [ShoppingCart, Calendar, Zap, Package, RotateCcw, CreditCard, MapPin, Heart];
const ACTION_COLORS = [
  "bg-primary/10 text-primary",
  "bg-blue-500/10 text-blue-600",
  "bg-green-500/10 text-green-600",
  "bg-orange-500/10 text-orange-600",
  "bg-purple-500/10 text-purple-600",
  "bg-yellow-500/10 text-yellow-600",
  "bg-pink-500/10 text-pink-600",
  "bg-red-500/10 text-red-600"
];

export const DiscoverMasterActionPopup = ({ open, onOpenChange }: DiscoverMasterActionPopupProps) => {
  const { toast } = useToast();
  const { translate } = useTranslation();

  const handleAction = (actionId: string) => {
    const actionLabel = translate(`discover.quickActions.${actionId}`);
    toast({
      title: translate('discover.toast.actionSelected'),
      description: translate('discover.toast.comingSoon').replace('{action}', actionLabel),
    });
    onOpenChange(false);
  };

  // Build actions with translated labels
  const actions = ACTION_IDS.map((id, index) => ({
    id,
    icon: ACTION_ICONS[index],
    label: translate(`discover.quickActions.${id}`),
    color: ACTION_COLORS[index]
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {translate('discover.quickActions.title')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto py-6 px-4 flex flex-col items-center gap-3 hover:bg-accent/50 transition-colors"
                onClick={() => handleAction(action.id)}
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
