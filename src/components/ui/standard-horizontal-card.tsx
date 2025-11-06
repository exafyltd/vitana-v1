import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';
import { horizontalCardAnalytics } from '@/lib/horizontal-cards-analytics';
import { useRTL } from '@/components/RTLProvider';

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
      isExpanded,
      onToggleExpand,
      density = 'compact',
      accentColor,
      className,
      privacyBadge,
      requiresConsent,
      onConsentRequired,
      onClick,
      analyticsCategory
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

    const handlePrimaryAction = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (primaryAction?.requiresConsent && requiresConsent) {
        onConsentRequired?.();
        return;
      }
      
      horizontalCardAnalytics.ctaClick({
        screenId,
        cardId: id,
        variant: 'standard',
        ctaLabel: primaryAction?.label || 'primary',
        ctaPosition: 'primary'
      });
      
      primaryAction?.onClick();
    };

    const handleExpand = (e?: React.MouseEvent | React.KeyboardEvent) => {
      e?.stopPropagation();
      const newExpanded = !isExpanded;
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
            <span role="img" aria-label="icon">{icon}</span>
          </div>
        );
      }
      return icon;
    };

    const formatTimestamp = () => {
      if (!timestamp) return '';
      if (typeof timestamp === 'string') return timestamp;
      return timestamp.toLocaleDateString();
    };

    const panelId = `card-panel-${id}`;

    return (
      <article
        ref={ref || cardRef}
        className={cn(
          "group relative overflow-hidden",
          "rounded-xl border border-white/20",
          "hover:border-[hsl(var(--accent))]/40 hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]",
          "transition-all duration-200 ease-out",
          "min-h-[76px]",
          className
        )}
        role="article"
        style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(4px)'
        }}
      >
        {accentColor && (
          <div className={cn(
            "absolute top-0 bottom-0 w-0.5 rounded-l-xl opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-200",
            `bg-${accentColor}`,
            isRTL ? 'right-0 rounded-l-none rounded-r-xl' : 'left-0'
          )} />
        )}

        <div 
          className={cn(
            "grid items-center gap-2 px-4 py-2 cursor-pointer min-h-[76px]",
            "grid-cols-[36px_1fr_auto]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/45 focus-visible:ring-offset-2"
          )}
          role="button"
          tabIndex={0}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          aria-label={`${title} - ${isExpanded ? 'Expanded' : 'Collapsed'}. Press Enter to ${isExpanded ? 'collapse' : 'expand'}`}
          onClick={(e) => {
            onClick?.();
            if (expandedContent) handleExpand(e);
          }}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center justify-center">
            {renderIcon()}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <h3 className="text-[15px] font-semibold leading-tight tracking-tight truncate flex-shrink min-w-0" dir={isRTL ? 'rtl' : 'ltr'}>
                {title}
              </h3>
              {badges?.map((badge, idx) => (
                <Badge key={idx} variant={badge.variant} className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 h-5 flex-shrink-0">
                  {badge.icon}
                  <span>{badge.label}</span>
                </Badge>
              ))}
              {privacyBadge && (
                <Badge variant="outline" className={cn("text-[11px] font-medium px-2 py-0.5 h-5 flex-shrink-0", privacyBadge.color)}>
                  🔒 {privacyBadge.label}
                </Badge>
              )}
              {timestamp && (
                <span className="text-[12px] text-muted-foreground/70 ml-auto flex-shrink-0">
                  {formatTimestamp()}
                </span>
              )}
            </div>
            <p className="text-[13.5px] leading-snug text-white/85 line-clamp-2" dir={isRTL ? 'rtl' : 'ltr'}>
              {description}
            </p>
            {metadata && (
              <div className="flex items-center gap-1 text-[12px] text-muted-foreground/70">
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

          <div className="flex items-center justify-end gap-1.5">
            {primaryAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrimaryAction}
                disabled={primaryAction.disabled}
                className="h-8 px-3 text-[13px] font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
              >
                {primaryAction.icon}
                {primaryAction.label}
              </Button>
            )}

            {secondaryActions && secondaryActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
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
            aria-label="Expanded card content"
            aria-live="polite"
            className="px-4 pb-2 pt-1.5 border-t border-white/10 animate-accordion-down"
            style={{ 
              animation: 'accordion-down 200ms ease-out',
              paddingLeft: '16px',
              paddingRight: '16px'
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
