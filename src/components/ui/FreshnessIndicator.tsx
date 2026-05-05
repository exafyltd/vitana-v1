/**
 * Freshness Indicator Component
 * 
 * Shows how fresh the displayed data is.
 * Subtle and unobtrusive - premium feel.
 */

import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n-toast';

interface FreshnessIndicatorProps {
  dataUpdatedAt: number | undefined;
  isFetching: boolean;
  className?: string;
  showIcon?: boolean;
}

export function FreshnessIndicator({
  dataUpdatedAt,
  isFetching,
  className,
  showIcon = false,
}: FreshnessIndicatorProps) {
  if (isFetching) {
    return (
      <div className={cn('flex items-center gap-1 text-xs text-muted-foreground', className)}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>{t('screens.ui.updating')}</span>
      </div>
    );
  }

  if (!dataUpdatedAt) return null;

  const age = Date.now() - dataUpdatedAt;
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(age / 60000);
  const hours = Math.floor(age / 3600000);

  let text: string;
  let colorClass: string;

  if (seconds < 30) {
    text = 'Just now';
    colorClass = 'text-green-500 dark:text-green-400';
  } else if (minutes < 1) {
    text = `${seconds}s ago`;
    colorClass = 'text-green-500 dark:text-green-400';
  } else if (minutes < 5) {
    text = `${minutes}m ago`;
    colorClass = 'text-muted-foreground';
  } else if (minutes < 60) {
    text = `${minutes}m ago`;
    colorClass = 'text-amber-500 dark:text-amber-400';
  } else if (hours < 24) {
    text = `${hours}h ago`;
    colorClass = 'text-amber-500 dark:text-amber-400';
  } else {
    text = 'Stale';
    colorClass = 'text-destructive';
  }

  return (
    <div className={cn('flex items-center gap-1 text-xs', colorClass, className)}>
      {showIcon && <RefreshCw className="h-3 w-3" />}
      <span>{text}</span>
    </div>
  );
}
