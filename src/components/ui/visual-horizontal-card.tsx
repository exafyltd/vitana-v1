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
  mediaAspect?: '16:9' | '4:3';
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
      mediaAspect = '16:9',
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
          "rounded-xl border border-white/10",
          "hover:border-[hsl(var(--accent))]/40 hover:shadow-xl",
          "transition-all duration-200 ease-out",
          "min-h-[100px]",
          "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:rounded-l-xl",
          "before:bg-transparent before:transition-all before:duration-200",
          "hover:before:bg-current",
          isRTL && "before:left-auto before:right-0 before:rounded-l-none before:rounded-r-xl",
          className
        )}
        style={{
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(6px)',
          color: category.color || undefined
        }}
        aria-label={title}
      >
        <div className="grid items-stretch grid-cols-1 lg:grid-cols-[36%_1fr_80px]">
          <div 
            className="relative overflow-hidden h-[100px] rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none"
          >
            {!imageError ? (
              <>
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover transition-transform duration-300",
                    "group-hover:scale-105",
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <span className="text-3xl">{category.icon}</span>
              </div>
            )}
            
            <Badge 
              variant="secondary" 
              className="absolute top-1.5 left-1.5 bg-white/25 backdrop-blur-sm border border-white/40 text-[11px] px-2 py-0.5 h-5 z-10"
            >
              {category.icon} {category.label}
            </Badge>

            {rewardPoints && rewardPoints > 0 && (
              <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold z-10">
                {rewardPoints}
              </div>
            )}
          </div>

          <button
            className="flex-1 px-4 py-3 flex flex-col justify-center gap-1.5 text-left focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/60 focus:ring-inset"
            onClick={() => {
              if (expandedContent) {
                handleExpand();
              } else if (onClick) {
                onClick();
              }
            }}
            tabIndex={0}
          >
            <div className="flex items-baseline gap-2 flex-nowrap">
              <h3 className="text-[15px] font-semibold leading-tight tracking-tight line-clamp-2 flex-1 min-w-0 text-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
                {title}
              </h3>
              {privacyBadge && (
                <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0.5 h-5 flex-shrink-0 opacity-80", privacyBadge.color)}>
                  🔒 {privacyBadge.label}
                </Badge>
              )}
              {timestamp && (
                <span className="text-[12px] text-muted-foreground/60 ml-auto flex-shrink-0">
                  {formatTimestamp()}
                </span>
              )}
            </div>
            
            <p className="text-[13.5px] leading-snug text-foreground/85 line-clamp-2" dir={isRTL ? 'rtl' : 'ltr'}>
              {description}
            </p>
            
            {(motivationalHook || (metadata && metadata.length > 0)) && (
              <div className="flex items-center gap-1 text-[12px]">
                {motivationalHook && (
                  <p className="text-primary font-medium line-clamp-1 flex-shrink min-w-0">
                    {motivationalHook}
                  </p>
                )}
                {metadata && metadata.length > 0 && (
                  <>
                    {motivationalHook && <span className="text-muted-foreground/40 mx-0.5">•</span>}
                    <div className="flex items-center gap-1 text-muted-foreground/70">
                      {metadata.map((item, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="text-muted-foreground/40 mx-0.5">•</span>}
                          <div className="flex items-center gap-1">
                            {item.icon}
                            <span>{item.text}</span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </button>

          <div className="flex flex-col items-center justify-center p-2 bg-muted/20 gap-2">
            {statusBadge && (
              <Badge variant={statusBadge.variant} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 h-5 opacity-80">
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </Badge>
            )}
            
            {statusDot && (
              <div className={cn("w-2.5 h-2.5 rounded-full", getStatusDotColor())} />
            )}
          </div>
        </div>

        {isExpanded && expandedContent && (
          <div 
            id={`card-content-${id}`}
            role="region"
            aria-labelledby={`card-header-${id}`}
            aria-live="polite"
            className="px-4 pb-2 pt-1.5 border-t border-white/10"
            style={{ 
              animation: 'accordion-down 200ms ease-out'
            }}
          >
            {expandedContent}
          </div>
        )}
      </article>
    );
  }
);

VisualHorizontalCard.displayName = 'VisualHorizontalCard';
