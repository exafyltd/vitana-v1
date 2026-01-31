import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Briefcase, Ticket, Sparkles } from "lucide-react";
import { useActivateReseller } from "@/hooks/useActivateReseller";
import { useIsReseller } from "@/hooks/useIsReseller";
import { useTranslation } from "@/hooks/useTranslation";

interface BusinessTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: () => void;
  onSelectService: () => void;
}

// Stable IDs for logic - never changes with language
const BUSINESS_TYPE_IDS = ["event", "service", "reseller"] as const;
type BusinessTypeId = typeof BUSINESS_TYPE_IDS[number];

// Static config (icons, colors) - not translated
const BUSINESS_TYPE_CONFIG: Record<BusinessTypeId, {
  icon: typeof Calendar;
  color: string;
  bgColor: string;
  hasBadge?: boolean;
}> = {
  event: {
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  service: {
    icon: Briefcase,
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  reseller: {
    icon: Ticket,
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100",
    hasBadge: true,
  },
};

export function BusinessTypeSelector({ 
  isOpen, 
  onClose, 
  onSelectEvent,
  onSelectService 
}: BusinessTypeSelectorProps) {
  const { activateResellerForCurrentUser, isActivating } = useActivateReseller();
  const { isReseller } = useIsReseller();
  const { translate } = useTranslation();

  // Helper for namespaced keys
  const t = (key: string, fallback?: string) => 
    translate(`business.typeSelector.${key}`, fallback);

  // Build translated business types inside component
  const businessTypes = [
    {
      id: "event" as BusinessTypeId,
      title: t('createEvent', 'Create Event'),
      subtitle: t('createEventDesc', 'Host workshops, classes, or gatherings'),
    },
    {
      id: "service" as BusinessTypeId,
      title: t('offerService', 'Offer Service'),
      subtitle: t('offerServiceDesc', '1-on-1 consultations, coaching, sessions'),
    },
    {
      id: "reseller" as BusinessTypeId,
      title: t('sellTickets', 'Sell Event Tickets'),
      subtitle: t('sellTicketsDesc', 'Promote events and earn commissions'),
    },
  ];

  const handleSelect = async (typeId: BusinessTypeId) => {
    switch (typeId) {
      case "event":
        onClose();
        onSelectEvent();
        break;
      case "service":
        onClose();
        onSelectService();
        break;
      case "reseller":
        onClose();
        await activateResellerForCurrentUser();
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('title', 'Start a Business')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {businessTypes.map((type) => {
            const config = BUSINESS_TYPE_CONFIG[type.id];
            const Icon = config.icon;
            const isResellerType = type.id === "reseller";
            const isAlreadyReseller = isResellerType && isReseller;

            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all ${config.bgColor} border-0 shadow-sm hover:shadow-md ${isAlreadyReseller ? 'opacity-60' : ''}`}
                onClick={() => !isAlreadyReseller && handleSelect(type.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-2 rounded-lg bg-white/80 ${config.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{type.title}</h3>
                      {config.hasBadge && !isAlreadyReseller && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600 text-white">
                          {t('badgeNew', 'New')}
                        </span>
                      )}
                      {isAlreadyReseller && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-600 text-white">
                          {t('badgeActive', 'Active')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAlreadyReseller 
                        ? t('alreadyReseller', "You're already a reseller! Check the Sell & Earn tab.") 
                        : type.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
