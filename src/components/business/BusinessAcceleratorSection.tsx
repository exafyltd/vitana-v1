/**
 * Business Accelerator Section
 * Action cards for growing business - replaces onboarding steps
 */

import { CalendarPlus, Package, Briefcase, Megaphone } from "lucide-react";

interface BusinessAcceleratorSectionProps {
  onCreateEvent: () => void;
  onAddToInventory: () => void;
  onCreateService: () => void;
  onCreatePromotion: () => void;
}

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  gradientFrom: string;
  gradientTo: string;
  title: string;
  description: string;
  onClick: () => void;
}

function ActionCard({ icon, iconBg, gradientFrom, gradientTo, title, description, onClick }: ActionCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-start p-4 bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden text-left transition-all duration-200 hover:shadow-md hover:border-border/60 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Gradient top bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ 
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` 
        }}
      />
      
      {/* Icon bubble */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      
      {/* Title */}
      <div className="font-semibold text-foreground mb-1">
        {title}
      </div>
      
      {/* Description */}
      <div className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </div>
    </button>
  );
}

export function BusinessAcceleratorSection({
  onCreateEvent,
  onAddToInventory,
  onCreateService,
  onCreatePromotion,
}: BusinessAcceleratorSectionProps) {
  const actions = [
    {
      icon: <CalendarPlus className="h-5 w-5 text-emerald-600" />,
      iconBg: "linear-gradient(135deg, hsl(142, 76%, 36%, 0.15), hsl(158, 64%, 52%, 0.1))",
      gradientFrom: "hsl(142, 76%, 36%)",
      gradientTo: "hsl(158, 64%, 52%)",
      title: "Create an Event",
      description: "Sell tickets directly and build your revenue stream",
      onClick: onCreateEvent,
    },
    {
      icon: <Package className="h-5 w-5 text-blue-600" />,
      iconBg: "linear-gradient(135deg, hsl(217, 91%, 60%, 0.15), hsl(199, 89%, 48%, 0.1))",
      gradientFrom: "hsl(217, 91%, 60%)",
      gradientTo: "hsl(199, 89%, 48%)",
      title: "Add to Inventory",
      description: "Earn commissions by sharing curated experiences",
      onClick: onAddToInventory,
    },
    {
      icon: <Briefcase className="h-5 w-5 text-purple-600" />,
      iconBg: "linear-gradient(135deg, hsl(271, 91%, 65%, 0.15), hsl(292, 84%, 61%, 0.1))",
      gradientFrom: "hsl(271, 91%, 65%)",
      gradientTo: "hsl(292, 84%, 61%)",
      title: "Create a Service",
      description: "Offer bookable sessions and grow your client base",
      onClick: onCreateService,
    },
    {
      icon: <Megaphone className="h-5 w-5 text-amber-600" />,
      iconBg: "linear-gradient(135deg, hsl(38, 92%, 50%, 0.15), hsl(45, 93%, 47%, 0.1))",
      gradientFrom: "hsl(38, 92%, 50%)",
      gradientTo: "hsl(45, 93%, 47%)",
      title: "Create a Promotion",
      description: "Reach your audience with targeted campaigns",
      onClick: onCreatePromotion,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground px-1">Grow your business with VITANA</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <ActionCard
            key={index}
            icon={action.icon}
            iconBg={action.iconBg}
            gradientFrom={action.gradientFrom}
            gradientTo={action.gradientTo}
            title={action.title}
            description={action.description}
            onClick={action.onClick}
          />
        ))}
      </div>
    </div>
  );
}
