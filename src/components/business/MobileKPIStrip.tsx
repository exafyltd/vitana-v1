/**
 * Mobile KPI Strip - Compact horizontally scrollable KPI cards
 * Follows the established mobile pattern with smaller footprint
 */

import { DollarSign, TrendingUp, Clock, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MobileKPIStripProps {
  totalEarnings: number;
  earnings30Days: number;
  pendingPayout: number;
  inWallet: number;
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

interface MobileKPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradientFrom: string;
  gradientTo: string;
  onClick?: () => void;
  isLoading?: boolean;
}

function MobileKPICard({ icon, label, value, gradientFrom, gradientTo, onClick, isLoading }: MobileKPICardProps) {
  return (
    <button
      onClick={onClick}
      className="relative min-w-[110px] bg-card rounded-xl border border-border/40 shadow-sm overflow-hidden text-left transition-all duration-200 hover:shadow-md hover:border-border/60 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shrink-0"
    >
      {/* Gradient top bar */}
      <div 
        className="h-1 w-full"
        style={{ 
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` 
        }}
      />
      
      <div className="p-3">
        {/* Icon bubble - smaller */}
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
          style={{ 
            background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}15)` 
          }}
        >
          <div style={{ color: gradientFrom }}>
            {icon}
          </div>
        </div>
        
        {/* Value - smaller */}
        <div className="text-lg font-bold text-foreground mb-0.5">
          {isLoading ? (
            <div className="h-6 w-16 bg-muted/50 rounded animate-pulse" />
          ) : (
            formatCurrency(value)
          )}
        </div>
        
        {/* Label */}
        <div className="text-[10px] text-muted-foreground font-medium leading-tight">
          {label}
        </div>
      </div>
    </button>
  );
}

export function MobileKPIStrip({
  totalEarnings,
  earnings30Days,
  pendingPayout,
  inWallet,
  isLoading,
}: MobileKPIStripProps) {
  const navigate = useNavigate();

  const kpiCards = [
    {
      icon: <DollarSign className="h-4 w-4" />,
      label: "Total Earnings",
      value: totalEarnings,
      gradientFrom: "hsl(142, 76%, 36%)",
      gradientTo: "hsl(158, 64%, 52%)",
      onClick: () => navigate("/business?tab=history"),
    },
    {
      icon: <TrendingUp className="h-4 w-4" />,
      label: "Last 30 Days",
      value: earnings30Days,
      gradientFrom: "hsl(217, 91%, 60%)",
      gradientTo: "hsl(199, 89%, 48%)",
      onClick: () => navigate("/business?tab=history&range=30d"),
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: "Pending",
      value: pendingPayout,
      gradientFrom: "hsl(38, 92%, 50%)",
      gradientTo: "hsl(45, 93%, 47%)",
      onClick: () => navigate("/wallet?filter=pending"),
    },
    {
      icon: <Wallet className="h-4 w-4" />,
      label: "In Wallet",
      value: inWallet,
      gradientFrom: "hsl(271, 91%, 65%)",
      gradientTo: "hsl(292, 84%, 61%)",
      onClick: () => navigate("/wallet"),
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {kpiCards.map((card, index) => (
        <MobileKPICard
          key={index}
          icon={card.icon}
          label={card.label}
          value={card.value}
          gradientFrom={card.gradientFrom}
          gradientTo={card.gradientTo}
          onClick={card.onClick}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
