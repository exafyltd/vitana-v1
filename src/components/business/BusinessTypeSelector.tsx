import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Briefcase, Ticket, Sparkles } from "lucide-react";
import { useActivateReseller } from "@/hooks/useActivateReseller";
import { useIsReseller } from "@/hooks/useIsReseller";

interface BusinessTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEvent: () => void;
  onSelectService: () => void;
}

const BUSINESS_TYPES = [
  {
    id: "event",
    icon: Calendar,
    title: "Create Event",
    subtitle: "Host workshops, classes, or gatherings",
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
  },
  {
    id: "service",
    icon: Briefcase,
    title: "Offer Service",
    subtitle: "1-on-1 consultations, coaching, sessions",
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100",
  },
  {
    id: "reseller",
    icon: Ticket,
    title: "Sell Event Tickets",
    subtitle: "Promote events and earn commissions",
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100",
    badge: "New",
  },
];

export function BusinessTypeSelector({ 
  isOpen, 
  onClose, 
  onSelectEvent,
  onSelectService 
}: BusinessTypeSelectorProps) {
  const { activateResellerForCurrentUser, isActivating } = useActivateReseller();
  const { isReseller } = useIsReseller();

  const handleSelect = async (typeId: string) => {
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
            Start a Business
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {BUSINESS_TYPES.map((type) => {
            const Icon = type.icon;
            const isResellerType = type.id === "reseller";
            const isAlreadyReseller = isResellerType && isReseller;

            return (
              <Card 
                key={type.id}
                className={`cursor-pointer transition-all ${type.bgColor} border-0 shadow-sm hover:shadow-md ${isAlreadyReseller ? 'opacity-60' : ''}`}
                onClick={() => !isAlreadyReseller && handleSelect(type.id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-2 rounded-lg bg-white/80 ${type.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{type.title}</h3>
                      {type.badge && !isAlreadyReseller && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600 text-white">
                          {type.badge}
                        </span>
                      )}
                      {isAlreadyReseller && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-600 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isAlreadyReseller ? "You're already a reseller! Check the Sell & Earn tab." : type.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
