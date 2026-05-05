import React from "react";
import { UnifiedEventCard } from "@/types/community";
import { NewsCard, NewsCardProps } from "@/components/crossover/NewsCard";
import { eventCardToNewsCardProps } from "@/lib/eventCardTransformers";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { t } from '@/lib/i18n-toast';

interface EventImageCardProps {
  event: UnifiedEventCard;
  variant?: 'full' | 'compact' | 'mini';
  showMatchScore?: boolean;
  onRSVP?: (eventId: string) => void;
  onClick?: (event: UnifiedEventCard) => void;
  className?: string;
}

export const EventImageCard: React.FC<EventImageCardProps> = ({
  event,
  variant = 'full',
  showMatchScore = false,
  onRSVP,
  onClick,
  className,
}) => {
  const newsCardProps = eventCardToNewsCardProps(
    event,
    variant,
    onClick ? () => onClick(event) : undefined
  );

  // Add match score badge if enabled
  const utilityTopRight = showMatchScore && event.match_score !== undefined ? (
    <Badge className="bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white border-0 text-xs font-medium px-2 py-1">{t('screens.events.value0Match', { value0: Math.round(event.match_score * 100) })}
    </Badge>
  ) : undefined;

  // Variant-specific styling
  const variantClasses = {
    full: "min-h-[320px] md:min-h-[360px]",
    compact: "min-h-[240px] aspect-square",
    mini: "min-h-[120px]",
  };

  return (
    <NewsCard
      {...newsCardProps}
      utilityTopRight={utilityTopRight}
      className={cn(
        "rounded-2xl overflow-hidden",
        "transition-all duration-300",
        "hover:scale-[1.05]",
        "hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]",
        variantClasses[variant],
        className
      )}
    />
  );
};
