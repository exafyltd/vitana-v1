import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { horizontalCardAnalytics } from '@/lib/horizontal-cards-analytics';
import { useRTL } from '@/components/RTLProvider';
import { t } from '@/lib/i18n-toast';

export interface StandardHorizontalCardProps {
  id: string;
  screenId: string;
  icon: React.ReactNode | string;
  title: string;
  description: string;
  badges?: Array<{ 
    label: string; 
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    icon?: React.ReactNode;
  }>;
  metadata?: Array<{ 
    icon: React.ReactNode; 
    text: string; 
    color?: string;
  }>;
  timestamp?: string | Date;
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
    icon?: React.ReactNode;
    disabled?: boolean;
    requiresConsent?: boolean;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'ghost' | 'outline';
  }>;
  expandedContent?: React.ReactNode;
  expandOnPrimaryClick?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  density?: 'compact' | 'comfy';
  accentColor?: string;
  className?: string;
  enableCompactDensity?: boolean;
  privacyBadge?: {
    label: string;
    color: string;
  };
  requiresConsent?: boolean;
  onConsentRequired?: () => void;
  onClick?: () => void;
  analyticsCategory?: string;
  layoutMode?: 'stack' | 'rail';
}

export const StandardHorizontalCard = React.forwardRef<HTMLDivElement, StandardHorizontalCardProps>(
  (props, ref) => {
    const {
      id,
      screenId,
      icon,
      title,
      description,
      badges,
      metadata,
      timestamp,
      primaryAction,
      secondaryActions,
      expandedContent,
      expandOnPrimaryClick = false,
      isExpanded,
      onToggleExpand,
      density = 'compact',
      accentColor,
      className,
      privacyBadge,
      requiresConsent,
      onConsentRequired,
      onClick,
      analyticsCategory,
      layoutMode = 'rail',
    } = props;

    const { isRTL } = useRTL();
    const cardRef = useRef<HTMLDivElement>(null);
    const hasLoggedView = useRef(false);

    useEffect(() => {
      if (!hasLoggedView.current && cardRef.current) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting) {
              horizontalCardAnalytics.cardView({
                screenId,
                cardId: id,
                variant: 'standard',
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

    // Auto-scroll to card when expanded
    useEffect(() => {
      if (isExpanded && cardRef.current) {
        // Small delay to ensure expansion animation has started
        setTimeout(() => {
          cardRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
          });
        }, 100);
      }
    }, [isExpanded]);

    const handlePrimaryAction = (e: React.MouseEvent) => {
      e.stopPropagation();
      console.log('[HC] primaryAction click start', id, primaryAction?.label);
      
      // Check consent first
      if (primaryAction?.requiresConsent && requiresConsent) {
        onConsentRequired?.();
        return;
      }
      
      // Execute analytics
      horizontalCardAnalytics.ctaClick({
        screenId,
        cardId: id,
        variant: 'standard',
        ctaLabel: primaryAction?.label || 'primary',
        ctaPosition: 'primary'
      });
      
      // Execute the primary action FIRST (isolated from expansion)
      try {
        console.log('[HC] executing primaryAction.onClick', id);
        primaryAction?.onClick();
        console.log('[HC] primaryAction.onClick completed', id);
      } catch (error) {
        console.error('[HC] primaryAction.onClick error', id, error);
      }
      
      // Then expand if configured (isolated from action)
      if (expandOnPrimaryClick && expandedContent) {
        try {
          console.log('[HC] expanding after primary action', id);
          handleExpand(e);
        } catch (error) {
          console.error('[HC] expansion error', id, error);
        }
      }
      
      console.log('[HC] primaryAction click end', id, primaryAction?.label);
    };

    const handleExpand = (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation();
      const newExpanded = !isExpanded;
      console.log('[HC] expand toggle', id, { expanded: newExpanded });
      onToggleExpand?.(id);
      
      horizontalCardAnalytics.cardExpand({
        screenId,
        cardId: id,
        variant: 'standard',
        expanded: newExpanded
      });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleExpand(e);
      } else if (e.key === 'Escape' && isExpanded) {
        e.preventDefault();
        handleExpand(e);
      }
    };

    const renderIcon = () => {
      if (typeof icon === 'string') {
        return (
          <div className={cn(
            "flex items-center justify-center rounded-full",
            "w-9 h-9 text-lg shadow-sm",
            accentColor ? `bg-${accentColor}/10` : 'bg-muted/50'
          )}>
            <span role="img" aria-label={t('screens.ui.icon')}>{icon}</span>
          </div>
        );
      }
      return icon;
    };

    const formatTimestamp = () => {
      if (!timestamp) return '';
      if (typeof timestamp === 'string') return timestamp;
      
      // Format with date and 24-hour time
      const dateStr = timestamp.toLocaleDateString();
      const timeStr = timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      return `${dateStr}, ${timeStr}`;
    };

    const panelId = `card-panel-${id}`;

    return (
      <article
        ref={ref || cardRef}
        className={cn(
          "group relative overflow-hidden z-20",
          "rounded-xl border border-white/10",
          "bg-background/60 backdrop-blur-sm",
          "hover:border-[hsl(var(--accent))]/40",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
          
          // Stack mode - full width
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
          
          // Height
          "min-h-[88px] xl:min-h-[84px]",
          
          // Accent rail
          "before:absolute before:top-0 before:bottom-0 before:w-[2px]",
          "before:bg-transparent before:transition-all before:duration-200",
          isRTL 
            ? "before:right-0 before:rounded-r-xl hover:before:bg-current focus-within:before:bg-current" 
            : "before:left-0 before:rounded-l-xl hover:before:bg-current focus-within:before:bg-current",
          
          className
        )}
        style={{
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(6px)',
          color: accentColor || undefined
        }}
      >

        <div 
          className={cn(
            "w-full grid items-center",
            "min-h-[88px] xl:min-h-[84px]",
            "gap-3 xl:gap-2.5",
            "px-4 py-3 xl:px-3.5 xl:py-2.5",
            layoutMode === 'stack' ? "grid-cols-[40px_1fr_minmax(120px,auto)]" : "grid-cols-[36px_1fr_minmax(100px,auto)]",
            "rounded-xl transition-all duration-200",
            (expandedContent || onClick) && "cursor-pointer"
          )}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('[role="button"]') || target.closest('a')) {
              return;
            }
            if (expandedContent) {
              console.log('[HC] container click -> expand', id);
              handleExpand(e);
            } else {
              console.log('[HC] container click -> onClick', id);
              onClick?.();
            }
          }}
        >
          <div className={cn(
            "flex items-center justify-center",
            isRTL && "order-last"
          )}>
            {renderIcon()}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-baseline gap-2 flex-nowrap">
              <h3 id={`card-title-${id}`} className="text-[15px] font-semibold leading-tight xl:leading-[1.2] tracking-tight truncate flex-shrink min-w-0 text-foreground" dir={isRTL ? 'rtl' : 'ltr'}>
                {title}
              </h3>
              {badges?.map((badge, idx) => (
                <Badge key={idx} variant={badge.variant} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 h-5 flex-shrink-0 opacity-80">
                  {badge.icon}
                  <span>{badge.label}</span>
                </Badge>
              ))}
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
            {metadata && (
              <div className="flex items-center gap-1 text-[12px] leading-normal xl:leading-[1.1] text-muted-foreground/70">
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
            )}
          </div>

          <div 
            className={cn(
              "flex items-center justify-end gap-1.5 relative z-30 pointer-events-auto",
              "pr-2",
              "focus-within:xl:opacity-100",
              isRTL && "justify-start order-first pl-2 pr-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {primaryAction && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handlePrimaryAction}
                onPointerDown={(e) => { 
                  e.stopPropagation(); 
                  console.log('[HC] primaryAction pointerdown', id, primaryAction.label);
                }}
                disabled={primaryAction.disabled}
                className={cn(
                  "h-9 text-[13px] transition-all duration-200",
                  "relative z-30 pointer-events-auto",
                  "whitespace-nowrap group/btn",
                  // Earning CTAs - soft emerald emphasis, harmonized with card
                  primaryAction.label?.toLowerCase().includes('earn')
                    ? "rounded-full font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/30 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 px-4"
                    // Join CTAs - green gradient
                    : primaryAction.label?.toLowerCase().includes('join')
                      ? "rounded-full font-bold text-white border-0 shadow-lg hover:scale-105 bg-gradient-to-r from-gradient-join-start to-gradient-join-end hover:shadow-gradient-join-start/50 hover:shadow-2xl px-4"
                      : "font-medium opacity-80 hover:opacity-100 hover:bg-accent hover:text-accent-foreground px-3"
                )}
                aria-label={primaryAction.label}
                title={primaryAction.label}
              >
                <span>{primaryAction.label}</span>
                {primaryAction.icon && (
                  <span className="ml-1.5 transition-transform duration-200 group-hover/btn:translate-x-0.5">
                    {primaryAction.icon}
                  </span>
                )}
              </Button>
            )}

            {secondaryActions && secondaryActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "h-8 w-8 p-0"
                    )}
                    aria-label={t('screens.ui.moreActions')}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                  {secondaryActions.map((action, idx) => (
                    <DropdownMenuItem
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('[HC] secondaryAction click', id, action.label);
                        horizontalCardAnalytics.ctaClick({
                          screenId,
                          cardId: id,
                          variant: 'standard',
                          ctaLabel: action.label,
                          ctaPosition: 'secondary'
                        });
                        action.onClick();
                      }}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {isExpanded && expandedContent && (
          <div 
            id={panelId}
            role="region"
            aria-labelledby={`card-title-${id}`}
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

StandardHorizontalCard.displayName = 'StandardHorizontalCard';
