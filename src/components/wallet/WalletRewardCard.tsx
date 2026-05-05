import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  Gift, 
  TrendingUp, 
  Users, 
  Target,
  CheckCircle,
  Clock,
  Share,
  Download,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface WalletRewardCardProps {
  id: string;
  type: "earned" | "pending" | "referral" | "achievement";
  title: string;
  description: string;
  amount?: string;
  progress?: number;
  maxProgress?: number;
  status: "available" | "pending" | "completed";
  source?: {
    name: string;
    avatar?: string;
  };
  category?: string;
  imageUrl?: string;
  dueDate?: string;
  className?: string;
  onClick?: () => void;
  onClaim?: () => void;
}

export function WalletRewardCard({
  id,
  type,
  title,
  description,
  amount,
  progress,
  maxProgress,
  status,
  source,
  category,
  imageUrl,
  dueDate,
  className,
  onClick,
  onClaim
}: WalletRewardCardProps) {
  
  const getTypeConfig = () => {
    switch (type) {
      case "earned":
        return {
          gradient: "bg-gradient-to-br from-green-500/10 to-emerald-600/20",
          border: "border-green-500/20",
          icon: Gift,
          iconColor: "text-green-600"
        };
      case "pending":
        return {
          gradient: "bg-gradient-to-br from-yellow-500/10 to-amber-600/20",
          border: "border-yellow-500/20",
          icon: Clock,
          iconColor: "text-yellow-600"
        };
      case "referral":
        return {
          gradient: "bg-gradient-to-br from-blue-500/10 to-indigo-600/20",
          border: "border-blue-500/20",
          icon: Users,
          iconColor: "text-blue-600"
        };
      case "achievement":
        return {
          gradient: "bg-gradient-to-br from-purple-500/10 to-pink-600/20",
          border: "border-purple-500/20",
          icon: Award,
          iconColor: "text-purple-600"
        };
      default:
        return {
          gradient: "bg-gradient-to-br from-gray-500/10 to-slate-600/20",
          border: "border-gray-500/20",
          icon: Gift,
          iconColor: "text-gray-600"
        };
    }
  };

  const getStatusConfig = () => {
    switch (status) {
      case "available":
        return {
          badge: "Ready to Claim",
          badgeColor: "bg-green-100 text-green-700",
          actionLabel: "Claim Now",
          actionIcon: Download,
          actionVariant: "default" as const
        };
      case "pending":
        return {
          badge: "Processing",
          badgeColor: "bg-yellow-100 text-yellow-700",
          actionLabel: "View Status",
          actionIcon: Clock,
          actionVariant: "outline" as const
        };
      case "completed":
        return {
          badge: "Claimed",
          badgeColor: "bg-gray-100 text-gray-700",
          actionLabel: "View Details",
          actionIcon: CheckCircle,
          actionVariant: "outline" as const
        };
      default:
        return {
          badge: "Unknown",
          badgeColor: "bg-gray-100 text-gray-700",
          actionLabel: "View",
          actionIcon: Target,
          actionVariant: "outline" as const
        };
    }
  };

  const typeConfig = getTypeConfig();
  const statusConfig = getStatusConfig();
  const TypeIcon = typeConfig.icon;
  const ActionIcon = statusConfig.actionIcon;

  const progressPercentage = progress && maxProgress ? (progress / maxProgress) * 100 : 0;

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden",
        typeConfig.gradient,
        typeConfig.border,
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {imageUrl && (
          <div className="relative h-32 mb-4 rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/20" />
            {category && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-black/50 text-white">
                  {category}
                </Badge>
              </div>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-background/50", typeConfig.iconColor)}>
                <TypeIcon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{title}</h3>
                {amount && (
                  <div className="text-2xl font-bold text-foreground mt-1">
                    {amount}
                  </div>
                )}
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className={statusConfig.badgeColor}
            >
              {statusConfig.badge}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {/* Progress Bar (for achievements) */}
          {progress !== undefined && maxProgress !== undefined && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('screens.wallet.progress')}</span>
                <span className="font-medium">{progress}/{maxProgress}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}

          {/* Source Information */}
          {source && (
            <div className="flex items-center gap-2 py-2 px-3 bg-muted/30 rounded-lg">
              <Avatar className="h-6 w-6">
                <AvatarImage src={source.avatar} />
                <AvatarFallback className="text-xs">
                  {source.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{source.name}</span>
            </div>
          )}

          {/* Due Date */}
          {dueDate && (
            <div className="text-sm text-muted-foreground">{t('screens.wallet.dueDuedate', { dueDate })}</div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              size="sm" 
              variant={statusConfig.actionVariant}
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onClaim?.();
              }}
            >
              <ActionIcon className="h-4 w-4 mr-1" />
              {statusConfig.actionLabel}
            </Button>
            {type === "referral" && (
              <Button size="sm" variant="outline">
                <Share className="h-4 w-4 mr-1" />
                {t('screens.wallet.share')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}