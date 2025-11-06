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
          "rounded-2xl border border-white/20",
          "shadow-[0_2px_12px_rgba(0,0,0,0.15)]",
          "hover:border-[hsl(var(--accent))]/40 hover:shadow-xl",
          "transition-all duration-200 ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/45 focus-visible:ring-offset-2",
          density === 'compact' ? 'min-h-[120px]' : 'min-h-[140px]',
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
          background: `linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%), linear-gradient(to right, ${category.color}10, transparent)`,
          backdropFilter: 'blur(8px)'
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

          <div className="flex-1 px-5 py-4 flex flex-col justify-center space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight line-clamp-2 mb-1" dir={isRTL ? 'rtl' : 'ltr'}>
                  {title}
                </h3>
                {privacyBadge && (
                  <Badge variant="outline" className={cn("text-[12px] font-medium mb-1", privacyBadge.color)}>
                    🔒 {privacyBadge.label}
                  </Badge>
                )}
              </div>
            </div>
            
            <p className="text-[14px] text-white/90 leading-snug line-clamp-2" dir={isRTL ? 'rtl' : 'ltr'}>
              {description}
            </p>
            
            {motivationalHook && (
              <p className="text-[14px] text-primary font-medium">
                {motivationalHook}
              </p>
            )}
            
            {metadata && (
              <div className="flex items-center gap-3 text-[13px] text-white/70 pt-1">
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
              <Badge variant={statusBadge.variant} className="flex items-center gap-1 text-[12px] font-medium">
                {statusBadge.icon}
                <span>{statusBadge.label}</span>
              </Badge>
            )}
            
            {timestamp && (
              <span className="text-[13px] text-center text-white/70">
                {formatTimestamp()}
              </span>
            )}
            
            {statusDot && (
              <div className={cn("w-3 h-3 rounded-full", getStatusDotColor())} />
            )}
          </div>
        </div>

        {isExpanded && expandedContent && (
          <div 
            role="region"
            aria-label="Expanded card content"
            aria-live="polite"
            className="px-5 pb-5 pt-3 border-t border-white/10 overflow-hidden transition-all duration-200 ease-out"
          >
            {expandedContent}
          </div>
        )}
      </article>
    );
  }
);

VisualHorizontalCard.displayName = 'VisualHorizontalCard';
