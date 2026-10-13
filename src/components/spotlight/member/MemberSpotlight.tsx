import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, Info } from 'lucide-react';
import { I18nEmptyState } from '@/components/ui/i18n-empty-state';
import { VCardSkeleton, type VCardSize } from '@/components/ui/vcard';
import { cn } from '@/lib/utils';

/**
 * VTID-05117 — shared building blocks for the remaining member screens on the
 * Spotlight contract (Phase 7.5). Tokens only, logical properties only, no
 * spinners: loading is a skeleton in the shape of what is coming (SR-20),
 * every list has an empty and an error state (SR-25).
 */

/** `standard` VCard grid: 2 columns, 4 from xl (same grid as Discover). */
export const MEMBER_GRID = 'grid grid-cols-2 gap-4 xl:grid-cols-4';

/** `row` VCard list. */
export const MEMBER_ROWS = 'flex flex-col gap-2';

export function SpotlightGridSkeleton({ count = 8, size = 'standard', className }: { count?: number; size?: VCardSize; className?: string }) {
  const stacked = size === 'standard' || size === 'spotlight';
  return (
    <div className={cn(stacked ? MEMBER_GRID : MEMBER_ROWS, className)} aria-busy="true" data-member-skeleton="">
      {Array.from({ length: count }).map((_, i) => (
        <VCardSkeleton key={i} size={size} />
      ))}
    </div>
  );
}

export function SpotlightRowsSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return <SpotlightGridSkeleton count={count} size="row" className={className} />;
}

export function SpotlightEmpty({
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
    <div className={cn('rounded-vcard border border-dashed bg-card', className)} data-member-empty="">
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

export function SpotlightError({ onRetry, className }: { onRetry: () => void; className?: string }) {
  return (
    <SpotlightEmpty
      Icon={AlertCircle}
      titleKey="spotlightMember.common.error.title"
      descriptionKey="spotlightMember.common.error.desc"
      actionKey="spotlightMember.common.error.retry"
      onAction={onRetry}
      className={className}
    />
  );
}

/**
 * A titled panel for a composer, a settings group or a form section — an
 * operator-style surface, not a content card (content items use VCard).
 */
export function SpotlightPanel({
  Icon,
  title,
  description,
  actions,
  children,
  className,
  ...rest
}: {
  Icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, 'title'>) {
  return (
    <section className={cn('rounded-vcard border bg-card p-5 text-card-foreground shadow-vcard', className)} data-member-panel="" {...rest}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {Icon && <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />}
            <span className="min-w-0">{title}</span>
          </h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

const NOTICE_TONE = {
  info: 'border-status-info/30 bg-status-info-subtle text-status-info',
  success: 'border-status-success/30 bg-status-success-subtle text-status-success',
  warning: 'border-status-warning/30 bg-status-warning-subtle text-status-warning',
} as const;

/** A one-line explanatory note (replaces the legacy blue/purple banner boxes). */
export function SpotlightNotice({
  tone = 'info',
  Icon = Info,
  children,
  className,
}: {
  tone?: keyof typeof NOTICE_TONE;
  Icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border px-4 py-3 text-sm', NOTICE_TONE[tone], className)} role="note">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 text-foreground">{children}</div>
    </div>
  );
}
