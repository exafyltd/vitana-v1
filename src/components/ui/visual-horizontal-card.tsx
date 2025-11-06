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
  enableCompactDensity?: boolean;
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
      density = 'compact',
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
          "rounded-xl border border-white/20",
          "shadow-[0_1px_4px_rgba(0,0,0,0.04)]",
          "hover:border-[hsl(var(--accent))]/40 hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)]",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/45 focus-visible:ring-offset-2",
          "min-h-[88px]",
          className
        )}
        onClick={onClick}
        role="article"
        aria-expanded={isExpanded}
        aria-label={`${title} - ${isExpanded ? 'Expanded' : 'Collapsed'}. Press Enter to ${isExpanded ? 'collapse' : 'expand'}`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleExpand();
          }
        }}
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(2px)'
        }}
      >
        <div className="grid items-stretch grid-cols-[35%_1fr_72px]">
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
                <span className="text-3xl">{category.icon}</span>
              </div>
            )}
            
            <Badge 
              variant="secondary" 
              className="absolute top-1.5 left-1.5 bg-white/25 backdrop-blur-sm border border-white/40 text-[11.5px] px-2 py-0.5"
            >
              {category.icon} {category.label}
            </Badge>

            {rewardPoints && rewardPoints > 0 && (
              <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
                {rewardPoints}
              </div>
            )}
          </div>

          <div className="flex-1 px-4 py-2.5 flex flex-col justify-center space-y-0.5">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[15px] font-semibold leading-5 tracking-tight line-clamp-1" dir={isRTL ? 'rtl' : 'ltr'}>
                {title}
              </h3>
              {privacyBadge && (
                <Badge variant="outline" className={cn("text-[11.5px] font-medium px-2 py-0.5", privacyBadge.color)}>
                  🔒 {privacyBadge.label}
                </Badge>
              )}
            </div>
            
            <p className="text-[13.5px] leading-5 text-white/90 line-clamp-1" dir={isRTL ? 'rtl' : 'ltr'}>
              {description}
            </p>
            
            {motivationalHook && (
              <p className="text-[13px] text-primary font-medium line-clamp-1">
                {motivationalHook}
              </p>
            )}
            
            {metadata && (
              <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                {metadata.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-between p-2 bg-muted/20">
            {statusBadge && (
              <Badge variant={statusBadge.variant} className="flex items-center gap-1 text-[11.5px] font-medium px-2 py-0.5">
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </Badge>
            )}
            
            {timestamp && (
              <span className="text-[12.5px] text-center text-muted-foreground">
                {formatTimestamp()}
              </span>
            )}
            
            {statusDot && (
              <div className={cn("w-2.5 h-2.5 rounded-full", getStatusDotColor())} />
            )}
          </div>
        </div>

        {isExpanded && expandedContent && (
          <div 
            role="region"
            aria-label="Expanded card content"
            aria-live="polite"
            className="px-4 pb-3 pt-2 border-t border-white/10 overflow-hidden transition-all duration-200 ease-out"
          >
            {expandedContent}
          </div>
        )}
      </article>
    );
  }
);

VisualHorizontalCard.displayName = 'VisualHorizontalCard';
