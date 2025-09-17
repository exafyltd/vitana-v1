import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RewardDot } from "@/components/ui/reward-dot";
import { TrendingUp, DollarSign, Coins, Shield, ArrowUpRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

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
  onClick
}: WalletBalanceCardProps) {
  
  const getIcon = () => {
    switch (type) {
      case "cash":
        return DollarSign;
      case "credits":
        return Shield;
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

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-lg transition-all duration-300 relative",
        getGradient(),
        className
      )}
      onClick={onClick}
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
            {status && (
              <Badge variant="secondary" className="bg-background/50">
                {status}
              </Badge>
            )}
          </div>

          {/* Balance Display */}
          <div className="space-y-2">
            <div className="text-3xl font-bold text-foreground">
              {balance}
            </div>
            {subBalance && (
              <div className="text-sm text-muted-foreground">
                {subBalance}
              </div>
            )}
            {change && (
              <div className={cn("text-sm flex items-center gap-1", getChangeColor())}>
                {changeType === "increase" && <TrendingUp className="h-3 w-3" />}
                {changeType === "decrease" && <TrendingUp className="h-3 w-3 rotate-180" />}
                {change}
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button size="sm" className="flex-1">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Manage
            </Button>
            <Button size="sm" variant="outline">
              <Eye className="h-4 w-4 mr-1" />
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}