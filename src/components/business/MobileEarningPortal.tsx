import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Calendar, Package, Briefcase, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface MobileEarningPortalProps {
  onCreateEvent: () => void;
  onAddToInventory: () => void;
  onCreateService: () => void;
  onCreatePromotion: () => void;
}

interface EarningOption {
  icon: React.ElementType;
  title: string;
  description: string;
  action: () => void;
  gradient: string;
}

export function MobileEarningPortal({
  onCreateEvent,
  onAddToInventory,
  onCreateService,
  onCreatePromotion,
}: MobileEarningPortalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const earningOptions: EarningOption[] = [
    {
      icon: Calendar,
      title: "Create Event",
      description: "Host & sell tickets",
      action: () => {
        setIsOpen(false);
        onCreateEvent();
      },
      gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
      icon: Package,
      title: "Add to Inventory",
      description: "Resell & earn",
      action: () => {
        setIsOpen(false);
        onAddToInventory();
      },
      gradient: "from-emerald-500/20 to-teal-500/20",
    },
    {
      icon: Briefcase,
      title: "Create Service",
      description: "Offer bookings",
      action: () => {
        setIsOpen(false);
        onCreateService();
      },
      gradient: "from-purple-500/20 to-pink-500/20",
    },
    {
      icon: Megaphone,
      title: "Create Promotion",
      description: "Boost visibility",
      action: () => {
        setIsOpen(false);
        onCreatePromotion();
      },
      gradient: "from-orange-500/20 to-amber-500/20",
    },
  ];

  return (
    <>
      {/* Portal CTA Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        <div className="relative p-5 text-center space-y-3">
          <h3 className="text-lg font-semibold text-foreground">
            Ready to earn with VITANA?
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose a path and we'll guide you to your first income stream.
          </p>
          
          <Button
            onClick={() => setIsOpen(true)}
            className="mt-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md"
          >
            <Rocket className="w-4 h-4 mr-2" />
            Start Earning
          </Button>
        </div>
      </motion.div>

      {/* Earning Options Drawer */}
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="text-center pb-2">
            <DrawerTitle className="text-xl">How do you want to earn?</DrawerTitle>
            <DrawerDescription>
              Pick one — you can explore others later
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {earningOptions.map((option, index) => (
                <motion.button
                  key={option.title}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  onClick={option.action}
                  className={`
                    relative flex flex-col items-center justify-center p-4 rounded-xl
                    border border-border/50 bg-gradient-to-br ${option.gradient}
                    hover:border-primary/30 hover:shadow-md
                    active:scale-[0.98] transition-all duration-200
                    min-h-[100px]
                  `}
                >
                  <option.icon className="w-7 h-7 text-foreground mb-2" />
                  <span className="text-sm font-medium text-foreground">
                    {option.title}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {option.description}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
