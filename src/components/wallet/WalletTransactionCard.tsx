import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft, 
  Gift, 
  CreditCard,
  Coins,
  Clock,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletTransactionCardProps {
  id: string;
  type: "incoming" | "outgoing" | "conversion" | "reward" | "purchase";
  title: string;
  description: string;
  amount: string;
  status: "completed" | "pending" | "failed";
  timestamp: string;
  source?: {
    name: string;
    avatar?: string;
  };
  category?: string;
  imageUrl?: string;
  className?: string;
  onClick?: () => void;
}

export function WalletTransactionCard({
  id,
  type,
  title,
  description,
  amount,
  status,
  timestamp,
  source,
  category,
  imageUrl,
  className,
  onClick
}: WalletTransactionCardProps) {
  
  const getIcon = () => {
    switch (type) {
      case "incoming":
        return ArrowDownLeft;
      case "outgoing":
        return ArrowUpRight;
      case "conversion":
        return ArrowRightLeft;
      case "reward":
        return Gift;
      case "purchase":
        return CreditCard;
      default:
        return ArrowRightLeft;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return CheckCircle;
      case "pending":
        return Clock;
      case "failed":
        return XCircle;
      default:
        return Clock;
    }
  };

  const getAmountColor = () => {
    switch (type) {
      case "incoming":
      case "reward":
        return "text-green-600";
      case "outgoing":
      case "purchase":
        return "text-red-600";
      case "conversion":
        return "text-blue-600";
      default:
        return "text-foreground";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "pending":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const Icon = getIcon();
  const StatusIcon = getStatusIcon();

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4",
        type === "incoming" || type === "reward" ? "border-l-green-500" : 
        type === "outgoing" || type === "purchase" ? "border-l-red-500" : "border-l-blue-500",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {imageUrl && (
          <div className="relative h-20 mb-3 rounded-lg overflow-hidden">
            <img 
              src={imageUrl} 
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2">
              <Badge className="bg-black/50 text-white">
                {category}
              </Badge>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-lg bg-muted/50">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base truncate">{title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
              </div>
            </div>
            <div className="text-right">
              <div className={cn("font-bold text-lg", getAmountColor())}>
                {amount}
              </div>
            </div>
          </div>

          {/* Status and Source */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="h-4 w-4 text-muted-foreground" />
              <Badge 
                variant="secondary" 
                className={cn("text-xs", getStatusColor())}
              >
                {status}
              </Badge>
            </div>
            
            {source && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={source.avatar} />
                  <AvatarFallback className="text-xs">
                    {source.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground">{source.name}</span>
              </div>
            )}
          </div>

          {/* Timestamp and Action */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-xs text-muted-foreground">{timestamp}</span>
            <Button size="sm" variant="ghost">
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}