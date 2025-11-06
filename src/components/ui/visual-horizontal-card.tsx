import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { horizontalCardAnalytics } from '@/lib/horizontal-cards-analytics';
import { useRTL } from '@/components/RTLProvider';

export interface VisualHorizontalCardProps {
  id: string;
  screenId: string;
  imageUrl: string;
  imageAlt: string;
  category: {
    icon: string;
    label: string;
    color: string;
  };
  title: string;
  description: string;
  motivationalHook?: string;
  metadata?: Array<{
    icon: React.ReactNode;
    text: string;
  }>;
  statusBadge?: {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    icon?: React.ReactNode;
  };
  timestamp?: string | Date;
  statusDot?: 'success' | 'warning' | 'error' | 'info';
  rewardPoints?: number;
  privacyBadge?: {
    label: string;
    color: string;
  };
  expandedContent?: React.ReactNode;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  density?: 'compact' | 'comfy';
  className?: string;
  onClick?: () => void;
  analyticsCategory?: string;
}

export const VisualHorizontalCard = React.forwardRef<HTMLDivElement, VisualHorizontalCardProps>(
  (props, ref) => {
    const {
      id,
      screenId,
      imageUrl,
      imageAlt,
      category,
      title,
      description,
      motivationalHook,
      metadata,
      statusBadge,
      timestamp,
      statusDot,
      rewardPoints,
      privacyBadge,
      expandedContent,
      isExpanded,
      onToggleExpand,
      density = 'comfy',
      className,
      onClick,
      analyticsCategory
    } = props;

    const { isRTL } = useRTL();
    const cardRef = useRef<HTMLDivElement>(null);
    const hasLoggedView = useRef(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      if (!hasLoggedView.current && cardRef.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              horizontalCardAnalytics.cardView({
                screenId,
                cardId: id,
                variant: 'visual',
                density
              });
              hasLoggedView.current = true;
              observer.disconnect();
            }
          },
          { threshold: 0.5 }
        );
        observer.observe(cardRef.current);
        return () => observer.disconnect();
      }
    }, [screenId, id, density]);

    const handleExpand = () => {
      const newExpanded = !isExpanded;
      onToggleExpand?.(id);
      
      horizontalCardAnalytics.cardExpand({
        screenId,
        cardId: id,
        variant: 'visual',
        expanded: newExpanded
      });
    };

    const getStatusDotColor = () => {
      const colors = {
        success: 'bg-green-500',
        warning: 'bg-amber-500',
        error: 'bg-red-500',
        info: 'bg-blue-500'
      };
      return colors[statusDot || 'info'];
    };

    const formatTimestamp = () => {
      if (!timestamp) return '';
      if (typeof timestamp === 'string') return timestamp;
      return timestamp.toLocaleDateString();
    };

    return (
      <article
        ref={ref || cardRef}
        className={cn(
          "group relative overflow-hidden",
          "bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl shadow-lg",
          "hover:shadow-xl transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
          density === 'compact' ? 'min-h-[120px]' : 'min-h-[140px]',
          className
        )}
        onClick={onClick}
        role="article"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleExpand();
          }
        }}
        style={{
          backgroundImage: `linear-gradient(to right, ${category.color}10, transparent)`
        }}
      >
        <div className="grid items-stretch grid-cols-[40%_1fr_80px]">
          <div className="relative overflow-hidden">
            {!imageError ? (
              <>
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-300",
                    "group-hover:scale-105",
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-4xl">{category.icon}</span>
              </div>
            )}
            
            <Badge 
              variant="secondary" 
              className="absolute top-2 left-2 bg-white/25 backdrop-blur-sm border border-white/40"
            >
              {category.icon} {category.label}
            </Badge>

            {rewardPoints && rewardPoints > 0 && (
              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                {rewardPoints}
              </div>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col justify-center space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base line-clamp-2 mb-1" dir={isRTL ? 'rtl' : 'ltr'}>
                  {title}
                </h3>
                {privacyBadge && (
                  <Badge variant="outline" className={cn("text-xs mb-1", privacyBadge.color)}>
                    🔒 {privacyBadge.label}
                  </Badge>
                )}
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2" dir={isRTL ? 'rtl' : 'ltr'}>
              {description}
            </p>
            
            {motivationalHook && (
              <p className="text-sm text-primary font-medium">
                {motivationalHook}
              </p>
            )}
            
            {metadata && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                {metadata.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-between p-3 bg-muted/30">
            {statusBadge && (
              <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                {statusBadge.icon}
                <span className="text-xs">{statusBadge.label}</span>
              </Badge>
            )}
            
            {timestamp && (
              <span className="text-xs text-center text-muted-foreground">
                {formatTimestamp()}
              </span>
            )}
            
            {statusDot && (
              <div className={cn("w-3 h-3 rounded-full", getStatusDotColor())} />
            )}
          </div>
        </div>

        {isExpanded && expandedContent && (
          <div className="px-4 pb-4 pt-2 border-t border-white/20 animate-in fade-in slide-in-from-top-2">
            {expandedContent}
          </div>
        )}
      </article>
    );
  }
);

VisualHorizontalCard.displayName = 'VisualHorizontalCard';
