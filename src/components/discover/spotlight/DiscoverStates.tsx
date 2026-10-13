import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { I18nEmptyState } from '@/components/ui/i18n-empty-state';
import { VCardSkeleton } from '@/components/ui/vcard';
import { cn } from '@/lib/utils';
import { DISCOVER_GRID } from './storefront-model';

/**
 * VTID-05109 — loading / empty / error states for every Discover Spotlight
 * list (contract SR-20, SR-25). Built on the shared `I18nEmptyState` and
 * `VCardSkeleton`, so no section ever shows a spinner or a blank panel.
 */

export function DiscoverGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn(DISCOVER_GRID, className)} data-discover-skeleton="">
      {Array.from({ length: count }).map((_, i) => (
        <VCardSkeleton key={i} size="standard" />
      ))}
    </div>
  );
}

export function DiscoverEmpty({
  titleKey,
  descriptionKey,
  Icon,
  actionKey,
  onAction,
  className,
}: {
  titleKey: string;
  descriptionKey?: string;
  Icon?: LucideIcon;
  actionKey?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('rounded-vcard border border-dashed bg-card', className)} data-discover-empty="">
      <I18nEmptyState
        titleKey={titleKey}
        descriptionKey={descriptionKey}
        Icon={Icon}
        actionKey={actionKey}
        onAction={onAction}
        className="px-6 py-8"
      />
    </div>
  );
}

export function DiscoverError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <DiscoverEmpty
      Icon={AlertCircle}
      titleKey="spotlightDiscover.storefront.error.title"
      descriptionKey="spotlightDiscover.storefront.error.desc"
      actionKey="spotlightDiscover.storefront.error.retry"
      onAction={onRetry}
      className={className}
    />
  );
}
