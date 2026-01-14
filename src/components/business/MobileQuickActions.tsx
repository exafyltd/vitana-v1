/**
 * Mobile Quick Actions - 2x2 compact grid of business actions
 * Replaces BusinessAcceleratorCenterCTA for mobile
 */

import { Calendar, Package, Briefcase, Megaphone } from "lucide-react";

interface MobileQuickActionsProps {
  onCreateEvent: () => void;
  onAddToInventory: () => void;
  onCreateService: () => void;
  onCreatePromotion: () => void;
}

interface ActionCardProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  onClick: () => void;
  gradientFrom: string;
  gradientTo: string;
}

function ActionCard({ icon, label, sublabel, onClick, gradientFrom, gradientTo }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-3 rounded-xl border border-border/40 bg-card/80 hover:bg-accent/30 hover:border-border/60 transition-all duration-200 text-left active:scale-[0.98]"
    >
      <div 
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
        style={{ 
          background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}15)` 
        }}
      >
        <div style={{ color: gradientFrom }}>
          {icon}
        </div>
      </div>
      <span className="text-sm font-medium text-foreground leading-tight">{label}</span>
      <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{sublabel}</span>
    </button>
  );
}

export function MobileQuickActions({
  onCreateEvent,
  onAddToInventory,
  onCreateService,
  onCreatePromotion,
}: MobileQuickActionsProps) {
  const actions = [
    {
      icon: <Calendar className="h-4 w-4" />,
      label: "Create Event",
      sublabel: "Host & sell tickets",
      onClick: onCreateEvent,
      gradientFrom: "hsl(271, 91%, 65%)",
      gradientTo: "hsl(292, 84%, 61%)",
    },
    {
      icon: <Package className="h-4 w-4" />,
      label: "Add to Inventory",
      sublabel: "Resell & earn",
      onClick: onAddToInventory,
      gradientFrom: "hsl(217, 91%, 60%)",
      gradientTo: "hsl(199, 89%, 48%)",
    },
    {
      icon: <Briefcase className="h-4 w-4" />,
      label: "Create Service",
      sublabel: "Offer bookings",
      onClick: onCreateService,
      gradientFrom: "hsl(142, 76%, 36%)",
      gradientTo: "hsl(158, 64%, 52%)",
    },
    {
      icon: <Megaphone className="h-4 w-4" />,
      label: "Create Promotion",
      sublabel: "Boost visibility",
      onClick: onCreatePromotion,
      gradientFrom: "hsl(38, 92%, 50%)",
      gradientTo: "hsl(45, 93%, 47%)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {actions.map((action, index) => (
        <ActionCard
          key={index}
          icon={action.icon}
          label={action.label}
          sublabel={action.sublabel}
          onClick={action.onClick}
          gradientFrom={action.gradientFrom}
          gradientTo={action.gradientTo}
        />
      ))}
    </div>
  );
}
