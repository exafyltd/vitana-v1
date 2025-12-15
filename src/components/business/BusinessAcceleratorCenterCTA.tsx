/**
 * Business Accelerator Center CTA
 * Single premium CTA that opens a modal with 4 earning options
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Package, Briefcase, Megaphone, Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface EarningOption {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
}

interface BusinessAcceleratorCenterCTAProps {
  onCreateEvent: () => void;
  onAddToInventory: () => void;
  onCreateService: () => void;
  onCreatePromotion: () => void;
}

export function BusinessAcceleratorCenterCTA({
  onCreateEvent,
  onAddToInventory,
  onCreateService,
  onCreatePromotion,
}: BusinessAcceleratorCenterCTAProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleOptionSelect = (action: () => void) => {
    setIsModalOpen(false);
    action();
  };

  const earningOptions: EarningOption[] = [
    {
      id: "create-event",
      icon: <Calendar className="h-6 w-6" />,
      title: "Create an Event",
      description: "Host your own event and sell tickets.",
      action: onCreateEvent,
    },
    {
      id: "add-inventory",
      icon: <Package className="h-6 w-6" />,
      title: "Add Events to Inventory",
      description: "Resell curated events and earn commission.",
      action: onAddToInventory,
    },
    {
      id: "create-service",
      icon: <Briefcase className="h-6 w-6" />,
      title: "Create a Service",
      description: "Offer sessions people can book.",
      action: onCreateService,
    },
    {
      id: "create-promotion",
      icon: <Megaphone className="h-6 w-6" />,
      title: "Create a Promotion",
      description: "Boost visibility and share to social.",
      action: onCreatePromotion,
    },
  ];

  return (
    <>
      {/* Center CTA Card */}
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Ready to earn with VITANA?
          </h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Choose a path and we'll guide you to your first income stream.
          </p>
          <Button
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="mt-2 px-8 py-6 text-base font-medium rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
          >
            <Rocket className="h-5 w-5 mr-2" />
            Start earning
          </Button>
        </div>
      </div>

      {/* Modal Popup */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center pb-2">
            <DialogTitle className="text-xl font-semibold">
              How do you want to earn?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Pick one — you can always do the others later.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {earningOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.action)}
                className="flex flex-col items-start p-4 rounded-xl border border-border/60 bg-card hover:bg-accent/50 hover:border-primary/30 transition-all duration-200 text-left group"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3 group-hover:bg-primary/20 transition-colors">
                  {option.icon}
                </div>
                <h3 className="font-medium text-foreground text-sm mb-1">
                  {option.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
