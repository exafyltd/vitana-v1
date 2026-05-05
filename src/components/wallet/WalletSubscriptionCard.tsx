import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Pause, 
  Play, 
  Settings, 
  CreditCard,
  Crown,
  Shield,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface WalletSubscriptionCardProps {
  id: string;
  name: string;
  description: string;
  price?: string;
  billing?: string;
  status: "active" | "paused" | "available";
  features?: string[];
  imageUrl?: string;
  tier?: "basic" | "premium" | "enterprise";
  discount?: string;
  className?: string;
  onClick?: () => void;
  onAction?: () => void;
}

export function WalletSubscriptionCard({
  id,
  name,
  description,
  price,
  billing,
  status,
  features = [],
  imageUrl,
  tier = "basic",
  discount,
  className,
  onClick,
  onAction
}: WalletSubscriptionCardProps) {
  
  const getStatusConfig = () => {
    switch (status) {
      case "active":
        return {
          badge: "Active",
          badgeColor: "bg-green-100 text-green-700",
          icon: CheckCircle,
          actionLabel: "Manage",
          actionIcon: Settings
        };
      case "paused":
        return {
          badge: "Paused",
          badgeColor: "bg-yellow-100 text-yellow-700",
          icon: Pause,
          actionLabel: "Resume",
          actionIcon: Play
        };
      case "available":
        return {
          badge: "Subscribe Now",
          badgeColor: "bg-blue-100 text-blue-700",
          icon: Zap,
          actionLabel: "Subscribe",
          actionIcon: CreditCard
        };
      default:
        return {
          badge: "Unknown",
          badgeColor: "bg-gray-100 text-gray-700",
          icon: Shield,
          actionLabel: "View",
          actionIcon: Settings
        };
    }
  };

  const getTierConfig = () => {
    switch (tier) {
      case "premium":
        return {
          gradient: "bg-gradient-to-br from-purple-500/10 to-pink-600/20",
          border: "border-purple-500/20",
          tierIcon: Crown,
          tierColor: "text-purple-600"
        };
      case "enterprise":
        return {
          gradient: "bg-gradient-to-br from-orange-500/10 to-red-600/20",
          border: "border-orange-500/20",
          tierIcon: Shield,
          tierColor: "text-orange-600"
        };
      default:
        return {
          gradient: "bg-gradient-to-br from-blue-500/10 to-indigo-600/20",
          border: "border-blue-500/20",
          tierIcon: Shield,
          tierColor: "text-blue-600"
        };
    }
  };

  const statusConfig = getStatusConfig();
  const tierConfig = getTierConfig();
  const StatusIcon = statusConfig.icon;
  const ActionIcon = statusConfig.actionIcon;
  const TierIcon = tierConfig.tierIcon;

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden",
        tierConfig.gradient,
        tierConfig.border,
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {imageUrl && (
          <div className="relative h-32 mb-4 rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt={name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
            {discount && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-red-500 text-white">
                  {discount}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-background/50", tierConfig.tierColor)}>
                <TierIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{t('screens.wallet.tierPlan', { tier })}</p>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className={cn("flex items-center gap-1", statusConfig.badgeColor)}
            >
              <StatusIcon className="h-3 w-3" />
              {statusConfig.badge}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Price */}
          {price && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{price}</span>
              {billing && (
                <span className="text-sm text-muted-foreground">/{billing}</span>
              )}
            </div>
          )}

          {/* Features */}
          {features.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{t('screens.wallet.features')}</h4>
              <ul className="space-y-1">
                {features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {feature}
                  </li>
                ))}
                {features.length > 3 && (
                  <li className="text-sm text-muted-foreground">{t('screens.wallet.value0MoreFeatures', { value0: features.length - 3 })}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onAction?.();
              }}
            >
              <ActionIcon className="h-4 w-4 mr-1" />
              {statusConfig.actionLabel}
            </Button>
            {status !== "available" && (
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4 mr-1" />
                {t('screens.wallet.settings')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}