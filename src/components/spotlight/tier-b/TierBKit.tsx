import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { I18nEmptyState } from '@/components/ui/i18n-empty-state';
import { VCardSkeleton } from '@/components/ui/vcard';
import { cn } from '@/lib/utils';

/**
 * VTID-05111 — shared pieces for the Tier B Spotlight screens (Health, Wallet,
 * AI, Settings, Calendar, Intents, Sharing). Tier B adopts ScreenFrame,
 * skeletons, VCard and the width tokens without a stage/rail re-layout, so
 * these helpers stay small: grids of one card size, an icon thumb for
 * row/compact cards, and the shared loading / empty / error states
 * (contract SR-11, SR-20, SR-25). Tokens and logical properties only.
 */

/** Standard-card grid (one size per row, SR-11). */
export const TIER_B_GRID = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3';
/** Two-column standard-card grid for narrower stages. */
export const TIER_B_GRID_2 = 'grid grid-cols-1 gap-4 md:grid-cols-2';
/** Vertical list of `row` cards. */
export const TIER_B_LIST = 'flex flex-col gap-2';

/** Square icon used as the media of a `row` / `compact` VCard. */
export function IconThumb({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-primary/10 text-primary', className)} aria-hidden="true">
      <Icon className="h-5 w-5" />
    </div>
  );
}

/** Icon + label for a VCard eyebrow. */
export function IconEyebrow({ icon: Icon, children }: { icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** A titled block of the stage (not a card — cards never nest, SR-12). */
export function TierBSection({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function TierBEmpty({
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
    <div className={cn('rounded-vcard border border-dashed bg-card', className)} data-tier-b-empty="">
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

export function TierBError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <TierBEmpty
      Icon={AlertCircle}
      titleKey="spotlightTierB.common.errorTitle"
      descriptionKey="spotlightTierB.common.errorDesc"
      actionKey={onRetry ? 'spotlightTierB.common.retry' : undefined}
      onAction={onRetry}
      className={className}
    />
  );
}

/** Loading state for one list or grid inside a screen (the page keeps its chrome). */
export function TierBListSkeleton({
  size = 'row',
  count = 4,
  className,
}: {
  size?: 'row' | 'standard' | 'compact';
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn(size === 'standard' ? TIER_B_GRID : TIER_B_LIST, className)} aria-busy="true" data-tier-b-skeleton="">
      {Array.from({ length: count }).map((_, i) => (
        <VCardSkeleton key={i} size={size} />
      ))}
    </div>
  );
}
