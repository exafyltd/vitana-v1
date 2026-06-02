import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RewardDot } from "@/components/ui/reward-dot";
import { KebabMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu-kebab";
import { TrendingUp, DollarSign, Coins, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionConfig {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

interface WalletBalanceCardProps {
  type: "cash" | "credits" | "tokens";
  title: string;
  balance: string;
  subBalance?: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  status?: string;
  description?: string;
  imageUrl?: string;
  className?: string;
  onClick?: () => void;
  primaryAction?: ActionConfig;
  secondaryActions?: ActionConfig[];
  isLoading?: boolean;
  headerAccessory?: React.ReactNode;
  /** Overrides the glyph for the `cash` card (e.g. Euro vs DollarSign). */
  icon?: React.ComponentType<{ className?: string }>;
}

export function WalletBalanceCard({
  type,
  title,
  balance,
  subBalance,
  change,
  changeType = "neutral",
  status,
  description,
  imageUrl,
  className,
  onClick,
  primaryAction,
  secondaryActions,
  isLoading = false,
  headerAccessory,
  icon
}: WalletBalanceCardProps) {

  const getIcon = () => {
    switch (type) {
      case "cash":
        return icon ?? DollarSign;
      case "credits":
        return CreditCard;
      case "tokens":
        return Coins;
      default:
        return DollarSign;
    }
  };

  const getGradient = () => {
    switch (type) {
      case "cash":
        return "bg-gradient-to-br from-green-500/10 to-emerald-600/20";
      case "credits":
        return "bg-gradient-to-br from-blue-500/10 to-indigo-600/20";
      case "tokens":
        return "bg-gradient-to-br from-purple-500/10 to-pink-600/20";
      default:
        return "bg-gradient-to-br from-gray-500/10 to-slate-600/20";
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const Icon = getIcon();

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-kebab-root]')) {
      return;
    }
    onClick?.();
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-lg transition-all duration-300 relative",
        getGradient(),
        className
      )}
      onClick={handleCardClick}
    >
      <RewardDot 
        points={type === "cash" ? 5 : type === "credits" ? 3 : 8} 
        description={`Earn more ${type === "cash" ? "cash" : type === "credits" ? "credits" : "tokens"} through activities`}
        position="top-right"
        size="md"
      />
      <CardContent className="p-6">
        {imageUrl && (
          <div className="relative h-32 mb-4 rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        )}

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/50">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {headerAccessory}
              {status && (
                <Badge variant="secondary" className="bg-background/50">
                  {status}
                </Badge>
              )}
            </div>
          </div>

          {/* Balance Display */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-foreground">
              {isLoading ? (
                <div className="h-9 w-32 bg-muted/50 animate-pulse rounded" />
              ) : (
                balance
              )}
            </div>
            {subBalance && (
              <div className="text-sm text-muted-foreground">
                {isLoading ? (
                  <div className="h-4 w-24 bg-muted/30 animate-pulse rounded" />
                ) : (
                  subBalance
                )}
              </div>
            )}
            {change && !isLoading && (
              <div className={cn("text-sm flex items-center gap-1", getChangeColor())}>
                {changeType === "increase" && <TrendingUp className="h-3 w-3" />}
                {changeType === "decrease" && <TrendingUp className="h-3 w-3 rotate-180" />}
                {change}
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed h-10 flex items-start">
              {description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {primaryAction && (
              <Button 
                size="sm" 
                className="flex-1" 
                variant={primaryAction.variant || "default"}
                onClick={primaryAction.onClick}
              >
                {React.createElement(primaryAction.icon, { className: "h-4 w-4 mr-1" })}
                {primaryAction.label}
              </Button>
            )}
            {secondaryActions && secondaryActions.length > 0 && (
              <div
                data-kebab-root
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <KebabMenu>
                  {secondaryActions.map((action, index) => (
                    <DropdownMenuItem
                      key={index}
                      onSelect={() => {
                        setTimeout(() => action.onClick(), 0);
                      }}
                    >
                      {React.createElement(action.icon, { className: "h-4 w-4 mr-2" })}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </KebabMenu>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}