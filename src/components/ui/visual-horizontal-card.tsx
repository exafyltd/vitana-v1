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
  secondaryLabel?: string;
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
      secondaryLabel,
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
          "min-h-[160px] xl:min-h-[152px]",
          "before:absolute before:top-0 before:bottom-0 before:w-[2px]",
          "before:bg-transparent before:transition-all before:duration-200",
          "before:left-0 before:rounded-l-xl hover:before:bg-current focus-within:before:bg-current",
          className
        )}
        style={{
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(6px)',
          color: category.color || undefined
        }}
        aria-label={title}
      >
      <div className={cn(
        "grid items-stretch grid-cols-1",
        "lg:grid-cols-[36%_auto_112px]",
        "xl:grid-cols-[32%_auto_104px]",
        "gap-0 lg:gap-3 xl:gap-2.5"
      )}>
          <div className={cn(
            "relative overflow-hidden rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none",
            "h-[160px] xl:h-[152px]"
          )}>
            {!imageError ? (
              <>
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  className={cn(
                    "absolute inset-0 w-full h-full object-cover object-[center_20%] transition-transform duration-300",
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
            className={cn(
              "flex-1 flex flex-col justify-center gap-1.5 text-left",
              "px-4 py-3 xl:px-3.5 xl:py-2.5",
              "focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent))]/60 focus:ring-inset"
            )}
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
              <h3 className="text-[15px] font-semibold leading-tight xl:leading-[1.2] tracking-tight line-clamp-2 flex-1 min-w-0 text-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
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
            
            <p className="text-[13.5px] leading-snug xl:leading-[1.25] text-foreground/85 line-clamp-2" dir={isRTL ? 'rtl' : 'ltr'}>
              {description}
            </p>
            
            {(motivationalHook || (metadata && metadata.length > 0)) && (
              <div className="flex items-center gap-1 text-[12px] leading-normal xl:leading-[1.1]">
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

          {/* Right Badge Zone - Fixed width, single medal + cadence text */}
        <div className={cn(
          "flex flex-col items-end justify-center bg-muted/20",
          "px-3 py-3 xl:px-2.5 xl:py-2.5",
          "shrink-0 w-full lg:w-[112px] xl:w-[104px] min-w-[100px]",
          "lg:mt-0 mt-2"
        )}>
            {statusBadge && (
              <div 
                className={cn(
                  "flex items-center gap-1 text-[13px] font-semibold leading-none pr-1",
                  statusBadge.label === '1st Place' && "drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]"
                )}
                aria-label={`Rank ${statusBadge.label}`}
                title={`${statusBadge.icon} ${statusBadge.label}`}
              >
                {statusBadge.icon && (
                  <span aria-hidden="true">{statusBadge.icon}</span>
                )}
                <span className="truncate max-w-[90px]">{statusBadge.label}</span>
              </div>
            )}
            
            {secondaryLabel && (
              <div 
                className="mt-1 text-[11px] text-muted-foreground leading-none"
                title={secondaryLabel}
              >
                {secondaryLabel}
              </div>
            )}
            
            {statusDot && (
              <div className={cn("w-2.5 h-2.5 rounded-full mt-1", getStatusDotColor())} />
            )}
          </div>
        </div>

        {isExpanded && expandedContent && (
          <div 
            id={`card-content-${id}`}
            role="region"
            aria-labelledby={`card-header-${id}`}
            aria-live="polite"
            className="px-4 pb-3 pt-3 border-t border-border/30"
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
