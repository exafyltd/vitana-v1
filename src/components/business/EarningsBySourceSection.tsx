/**
 * Earnings by Source Section
 * Vertical stacked cards showing earnings breakdown by source
 */

import { CalendarDays, Share2, Briefcase, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface EarningsBySourceSectionProps {
  bySource: {
    resellerCommissions: {
      earned: number;
      pending: number;
      inWallet: number;
      ticketsSold: number;
    };
    directSales: {
      gross: number;
      tickets: number;
      lastMonth: number;
    };
  };
  isLoading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

interface SourceRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  units: number;
  unitLabel: string;
  revenue: number;
  status?: "active" | "pending" | "coming-soon";
  onClick?: () => void;
  isLoading?: boolean;
}

function SourceRow({ icon, iconBg, label, units, unitLabel, revenue, status = "active", onClick, isLoading }: SourceRowProps) {
  const isDisabled = status === "coming-soon";
  
  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border/40 transition-all duration-200 text-left ${
        isDisabled 
          ? "opacity-60 cursor-not-allowed" 
          : "hover:shadow-md hover:border-border/60 hover:bg-card/80"
      }`}
    >
      {/* Icon */}
      <div 
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      
      {/* Label & Units */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{label}</span>
          {status === "coming-soon" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Coming Soon
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {isLoading ? (
            <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
          ) : (
            `${units} ${unitLabel}`
          )}
        </div>
      </div>
      
      {/* Revenue */}
      <div className="text-right shrink-0">
        <div className="font-bold text-foreground">
          {isLoading ? (
            <div className="h-5 w-16 bg-muted/50 rounded animate-pulse" />
          ) : (
            formatCurrency(revenue)
          )}
        </div>
        {status === "pending" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
            Pending
          </Badge>
        )}
      </div>
    </button>
  );
}

export function EarningsBySourceSection({ bySource, isLoading }: EarningsBySourceSectionProps) {
  const navigate = useNavigate();

  const sources = [
    {
      icon: <CalendarDays className="h-5 w-5 text-emerald-600" />,
      iconBg: "linear-gradient(135deg, hsl(142, 76%, 36%, 0.15), hsl(158, 64%, 52%, 0.1))",
      label: "My Events",
      units: bySource.directSales.tickets,
      unitLabel: "tickets sold",
      revenue: bySource.directSales.gross,
      status: "active" as const,
      onClick: () => navigate("/business?tab=history&source=events"),
    },
    {
      icon: <Share2 className="h-5 w-5 text-blue-600" />,
      iconBg: "linear-gradient(135deg, hsl(217, 91%, 60%, 0.15), hsl(199, 89%, 48%, 0.1))",
      label: "Reseller Earnings",
      units: bySource.resellerCommissions.ticketsSold,
      unitLabel: "tickets sold",
      revenue: bySource.resellerCommissions.earned,
      status: bySource.resellerCommissions.pending > 0 ? "pending" as const : "active" as const,
      onClick: () => navigate("/business?tab=history&source=reseller"),
    },
    {
      icon: <Briefcase className="h-5 w-5 text-purple-600" />,
      iconBg: "linear-gradient(135deg, hsl(271, 91%, 65%, 0.15), hsl(292, 84%, 61%, 0.1))",
      label: "Services",
      units: 0,
      unitLabel: "bookings",
      revenue: 0,
      status: "active" as const,
      onClick: () => navigate("/business?tab=history&source=services"),
    },
    {
      icon: <Package className="h-5 w-5 text-muted-foreground" />,
      iconBg: "linear-gradient(135deg, hsl(0, 0%, 50%, 0.1), hsl(0, 0%, 60%, 0.08))",
      label: "Products",
      units: 0,
      unitLabel: "sold",
      revenue: 0,
      status: "coming-soon" as const,
      onClick: undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground px-1">Earnings by Source</h3>
      <div className="space-y-2">
        {sources.map((source, index) => (
          <SourceRow
            key={index}
            icon={source.icon}
            iconBg={source.iconBg}
            label={source.label}
            units={source.units}
            unitLabel={source.unitLabel}
            revenue={source.revenue}
            status={source.status}
            onClick={source.onClick}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}
