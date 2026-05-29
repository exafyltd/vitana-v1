import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { horizontalCardAnalytics } from '@/lib/horizontal-cards-analytics';
import { useRTL } from '@/components/RTLProvider';

import { fmtDate, fmtTime } from '@/lib/locale-format';
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
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'ghost' | 'outline';
  };
  secondaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'ghost' | 'outline';
  };
  expandedContent?: React.ReactNode;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  density?: 'compact' | 'comfy';
  className?: string;
  onClick?: () => void;
  enableCompactDensity?: boolean;
  analyticsCategory?: string;
  layoutMode?: 'stack' | 'rail';
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
      primaryAction,
      secondaryAction,
      expandedContent,
      isExpanded,
      onToggleExpand,
      density = 'compact',
    className,
    onClick,
    analyticsCategory,
    layoutMode = 'rail',
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
      
      // Format with full date and time
      const dateStr = fmtDate(timestamp, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      const timeStr = fmtTime(timestamp, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      return `${dateStr} at ${timeStr}`;
    };

    const handleCardClick = () => {
      if (expandedContent) {
        handleExpand();
      } else if (onClick) {
        onClick();
      }
    };

    const handleCardKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && (onClick || expandedContent)) {
        e.preventDefault();
        handleCardClick();
      }
    };

    return (
      <article
        ref={ref || cardRef}
        className={cn(
          "group relative overflow-hidden",
          "rounded-2xl border border-border/40",
          "bg-card",
          "hover:border-[hsl(var(--accent))]/40",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
          
          // Stack mode - full width with shadow
          layoutMode === 'stack' && [
            "w-full",
            "shadow-[0_2px_10px_rgba(0,0,0,0.06)]",
            "hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)]",
            "hover:scale-[1.005]",
          ],
          
          // Rail mode - fixed width
          layoutMode === 'rail' && [
            "shadow-[0_1px_6px_rgba(0,0,0,0.05)]",
            "hover:scale-[1.01]",
          ],
          
          // Height adjustments
          "min-h-[160px] xl:min-h-[152px]",
          
          // Accent rail
          "before:absolute before:top-0 before:bottom-0 before:w-[2px]",
          "before:bg-transparent before:transition-all before:duration-200",
          "before:left-0 before:rounded-l-2xl hover:before:bg-current focus-within:before:bg-current",
          
          // Clickable styling
          (onClick || expandedContent) && "cursor-pointer",
          
          className
        )}
        style={{
          color: category.color || undefined
        }}
        aria-label={title}
        onClick={handleCardClick}
        onKeyDown={handleCardKeyDown}
        tabIndex={(onClick || expandedContent) ? 0 : undefined}
        role={(onClick || expandedContent) ? "button" : undefined}
      >
      <div className={cn(
        "grid items-stretch grid-cols-1",
        "lg:grid-cols-[36%_1fr_140px_112px]",
        "xl:grid-cols-[32%_1fr_128px_104px]",
        "gap-0 lg:gap-2 xl:gap-2"
      )}>
          <div className={cn(
            "relative overflow-hidden rounded-t-2xl lg:rounded-l-2xl lg:rounded-tr-none",
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
              className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-sm border border-white/30 text-white text-[11px] px-2 py-0.5 h-5 z-10"
            >
              {category.icon} {category.label}
            </Badge>

            {rewardPoints && rewardPoints > 0 && (
              <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold z-10">
                {rewardPoints}
              </div>
            )}
          </div>

          <div
            className={cn(
              "flex-1 flex flex-col justify-center gap-1.5 text-left",
              "px-4 py-3 xl:px-3.5 xl:py-2.5"
            )}
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
            
            <p className="text-[13.5px] leading-snug xl:leading-[1.25] text-foreground/70 line-clamp-2" dir={isRTL ? 'rtl' : 'ltr'}>
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
          </div>

          {/* CTA Column - Dedicated fixed-width space for primary action */}
          {primaryAction && (
            <div className={cn(
              "flex items-center justify-center",
              "px-3 py-3 xl:px-2 xl:py-2",
              "w-full lg:w-[140px] xl:w-[128px]",
              "shrink-0"
            )}>
              <Button
                variant={primaryAction.variant || 'default'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  primaryAction.onClick();
                  horizontalCardAnalytics.ctaClick({
                    screenId,
                    cardId: id,
                    variant: 'visual',
                    ctaLabel: primaryAction.label,
                    ctaPosition: 'primary'
                  });
                }}
                className={cn(
                  "font-semibold w-full h-9",
                  primaryAction.label?.toLowerCase().includes('join')
                    ? "rounded-full font-bold text-white border-0 shadow-lg transition-all duration-300 hover:scale-105 bg-gradient-to-r from-gradient-join-start to-gradient-join-end hover:shadow-gradient-join-start/50 hover:shadow-2xl px-4"
                    : "shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-primary to-primary/90 px-3"
                )}
              >
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            </div>
          )}

          {/* Right Badge Zone - Fixed width, single medal + cadence text */}
        <div className={cn(
          "flex flex-col items-end justify-center bg-muted/50",
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
            className="px-4 pb-3 pt-3 mt-1 border-t border-border/30 bg-background/[0.02]"
            style={{ 
              animation: 'accordion-down 200ms ease-out',
              transition: 'all 0.25s ease-in-out'
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
