import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { RewardDot } from "@/components/ui/reward-dot";
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
import { t } from '@/lib/i18n-toast';

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
  // New detailed transaction props
  transaction?: {
    transaction_type: string;
    from_currency?: string;
    to_currency?: string;
    fees?: number;
    exchange_rate?: number;
    from_user_name?: string;
    from_user_avatar?: string;
    to_user_name?: string;
    to_user_avatar?: string;
    from_user_id?: string;
    to_user_id?: string;
    metadata?: any;
  };
  currentUserId?: string;
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
  onClick,
  transaction,
  currentUserId
}: WalletTransactionCardProps) {
  
  // Determine transaction flow based on actual data
  const getTransactionFlow = () => {
    if (!transaction || !currentUserId) return { fromUser: null, toUser: null, isIncoming: false };
    
    const isIncoming = transaction.to_user_id === currentUserId;
    const isOutgoing = transaction.from_user_id === currentUserId;
    
    return {
      fromUser: {
        id: transaction.from_user_id,
        name: transaction.from_user_name || 'Unknown User',
        avatar: transaction.from_user_avatar
      },
      toUser: {
        id: transaction.to_user_id, 
        name: transaction.to_user_name || 'Unknown User',
        avatar: transaction.to_user_avatar
      },
      isIncoming,
      isOutgoing
    };
  };

  const transactionFlow = getTransactionFlow();
  
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

  // Get reward points based on transaction type
  const getRewardPoints = () => {
    switch (type) {
      case "reward":
        return 2; // Earn credits for reviewing rewards
      case "incoming":
        return 3; // Earn credits for sharing referral success
      case "conversion":
        return 5; // Earn credits for sharing conversion strategies
      case "purchase":
        return 1; // Earn credits for subscription feedback
      default:
        return 2;
    }
  };

  const getRewardDescription = () => {
    switch (type) {
      case "reward":
        return "Share reward feedback";
      case "incoming":
        return "Tell your success story";
      case "conversion":
        return "Share conversion tips";
      case "purchase":
        return "Rate your purchase";
      default:
        return "Engage with transaction";
    }
  };

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 relative",
        type === "incoming" || type === "reward" ? "border-l-green-500" : 
        type === "outgoing" || type === "purchase" ? "border-l-red-500" : "border-l-blue-500",
        className
      )}
      onClick={onClick}
    >
      <RewardDot 
        points={getRewardPoints()} 
        description={getRewardDescription()}
        position="bottom-right"
        size="sm"
      />
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
                
                {/* Enhanced transaction details */}
                {transaction && (
                  <div className="mt-1 space-y-1">
                    {/* Transaction flow */}
                    {transactionFlow.fromUser && transactionFlow.toUser && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={transactionFlow.fromUser.avatar} />
                          <AvatarFallback className="text-[8px]">
                            {transactionFlow.fromUser.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[60px]">{transactionFlow.fromUser.name}</span>
                        <ArrowRightLeft className="h-3 w-3" />
                        <span className="truncate max-w-[60px]">{transactionFlow.toUser.name}</span>
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={transactionFlow.toUser.avatar} />
                          <AvatarFallback className="text-[8px]">
                            {transactionFlow.toUser.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    
                    {/* Currency info for exchanges */}
                    {transaction.transaction_type === 'exchange' && transaction.from_currency && transaction.to_currency && (
                      <div className="text-xs text-muted-foreground">
                        {transaction.from_currency} → {transaction.to_currency}
                        {transaction.exchange_rate && (
                          <span className="ml-1">@ {transaction.exchange_rate}</span>
                        )}
                      </div>
                    )}
                    
                    {/* Fees info */}
                    {transaction.fees !== undefined && (
                      <div className="text-xs">
                        {transaction.fees > 0 ? (
                          <span className="text-orange-600">Fee: {transaction.fees}</span>
                        ) : (
                          <span className="text-green-600">{t('screens.wallet.noFees')}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={cn("font-bold text-lg", getAmountColor())}>
                {amount}
              </div>
              {transaction?.from_currency && (
                <div className="text-xs text-muted-foreground">
                  {transaction.from_currency}
                </div>
              )}
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
              <span className="text-xs text-muted-foreground">
                {transaction?.transaction_type || type}
              </span>
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