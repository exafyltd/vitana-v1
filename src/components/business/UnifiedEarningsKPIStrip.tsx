/**
 * Unified Earnings KPI Strip
 * Premium KPI cards with gradient bar, icon bubble, large value display
 */

import { DollarSign, TrendingUp, Clock, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UnifiedEarningsKPIStripProps {
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

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradientFrom: string;
  gradientTo: string;
  onClick?: () => void;
  isLoading?: boolean;
}

function KPICard({ icon, label, value, gradientFrom, gradientTo, onClick, isLoading }: KPICardProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex-1 min-w-[140px] bg-card rounded-2xl border border-border/40 shadow-sm overflow-hidden text-left transition-all duration-200 hover:shadow-md hover:border-border/60 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Gradient top bar */}
      <div 
        className="h-1.5 w-full"
        style={{ 
          background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` 
        }}
      />
      
      <div className="p-4 pt-3">
        {/* Icon bubble */}
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
          style={{ 
            background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}15)` 
          }}
        >
          <div style={{ color: gradientFrom }}>
            {icon}
          </div>
        </div>
        
        {/* Value */}
        <div className="text-2xl font-bold text-foreground mb-0.5">
          {isLoading ? (
            <div className="h-8 w-20 bg-muted/50 rounded animate-pulse" />
          ) : (
            formatCurrency(value)
          )}
        </div>
        
        {/* Label */}
        <div className="text-xs text-muted-foreground font-medium">
          {label}
        </div>
      </div>
    </button>
  );
}

export function UnifiedEarningsKPIStrip({
  totalEarnings,
  earnings30Days,
  pendingPayout,
  inWallet,
  isLoading,
}: UnifiedEarningsKPIStripProps) {
  const navigate = useNavigate();

  const kpiCards = [
    {
      icon: <DollarSign className="h-5 w-5" />,
      label: "Total Earnings",
      value: totalEarnings,
      gradientFrom: "hsl(142, 76%, 36%)", // emerald
      gradientTo: "hsl(158, 64%, 52%)",
      onClick: () => navigate("/business?tab=history"),
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      label: "Last 30 Days",
      value: earnings30Days,
      gradientFrom: "hsl(217, 91%, 60%)", // blue
      gradientTo: "hsl(199, 89%, 48%)",
      onClick: () => navigate("/business?tab=history&range=30d"),
    },
    {
      icon: <Clock className="h-5 w-5" />,
      label: "Pending Payout",
      value: pendingPayout,
      gradientFrom: "hsl(38, 92%, 50%)", // amber
      gradientTo: "hsl(45, 93%, 47%)",
      onClick: () => navigate("/wallet?filter=pending"),
    },
    {
      icon: <Wallet className="h-5 w-5" />,
      label: "In Wallet",
      value: inWallet,
      gradientFrom: "hsl(271, 91%, 65%)", // purple
      gradientTo: "hsl(292, 84%, 61%)",
      onClick: () => navigate("/wallet"),
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {kpiCards.map((card, index) => (
        <KPICard
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
