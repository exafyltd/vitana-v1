import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * VTID-05105 — VCard, the one card system for Spotlight screens.
 *
 * Four sizes with fixed media ratios so rows never leave holes
 * (docs/plans/desktop-spotlight, contract SR-09…SR-13):
 *   spotlight — the one dominant item on a screen; media 16:9 or 4:5
 *   standard  — shelves and grids; media 4:3
 *   compact   — context rail / "up next"; 64 px square thumb
 *   row       — lists (orders, members, results); 48 px square thumb
 *
 * Slots: media, eyebrow, title (2-line clamp), meta, body, actions, badge.
 * `data-vcard-size` lets staging checks read structure, not pixels.
 * Logical properties only, so the card mirrors correctly in RTL.
 */
export type VCardSize = 'spotlight' | 'standard' | 'compact' | 'row';
export type VCardMediaRatio = 'landscape' | 'portrait';

export interface VCardMedia {
  /** null → a neutral placeholder in the same ratio (keeps rows even). */
  src: string | null;
  alt?: string;
  /** spotlight only: 'landscape' = 16:9 (default), 'portrait' = 4:5. */
  ratio?: VCardMediaRatio;
}

export interface VCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  size: VCardSize;
  /** Omit for a text-only card; pass `{ src: null }` for a placeholder. */
  media?: VCardMedia;
  /** Custom media (e.g. a video player) rendered inside the ratio box. */
  mediaSlot?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  /** spotlight / standard only. */
  body?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  /** Load the image eagerly (the first spotlight card above the fold). */
  priority?: boolean;
  /** Neighbour of the focused card in a focus feed: media is softened, text keeps full contrast. */
  dimmed?: boolean;
  focused?: boolean;
  as?: 'article' | 'div' | 'li';
}

const ROOT: Record<VCardSize, string> = {
  spotlight: 'flex flex-col overflow-hidden rounded-vcard border bg-card text-card-foreground shadow-vcard-raised',
  standard: 'flex flex-col overflow-hidden rounded-vcard border bg-card text-card-foreground shadow-vcard',
  compact: 'flex min-h-vcard-compact items-center gap-3 rounded-vcard-sm border bg-card p-2.5 text-card-foreground shadow-vcard',
  row: 'flex items-center gap-3 rounded-vcard-sm border bg-card px-3 py-2 text-card-foreground shadow-vcard',
};

const TITLE: Record<VCardSize, string> = {
  spotlight: 'text-lg font-bold leading-snug',
  standard: 'text-sm font-bold leading-snug',
  compact: 'text-sm font-semibold leading-snug',
  row: 'text-sm font-semibold leading-snug',
};

function mediaBoxClass(size: VCardSize, ratio: VCardMediaRatio | undefined): string {
  switch (size) {
    case 'spotlight':
      return ratio === 'portrait' ? 'aspect-portrait w-full' : 'aspect-video w-full';
    case 'standard':
      return 'aspect-landscape w-full';
    case 'compact':
      return 'aspect-square size-vcard-thumb shrink-0 rounded-lg';
    case 'row':
      return 'aspect-square size-vcard-row-thumb shrink-0 rounded-md';
  }
}

export const VCard = React.forwardRef<HTMLElement, VCardProps>(function VCard(
  {
    size,
    media,
    mediaSlot,
    eyebrow,
    title,
    meta,
    body,
    actions,
    badge,
    priority = false,
    dimmed = false,
    focused = false,
    as = 'article',
    className,
    ...rest
  },
  ref,
) {
  const Root = as as React.ElementType;
  const hasMedia = media !== undefined || mediaSlot !== undefined;
  const isStacked = size === 'spotlight' || size === 'standard';

  const mediaNode = hasMedia ? (
    <div
      className={cn('relative overflow-hidden bg-muted', mediaBoxClass(size, media?.ratio), dimmed && 'opacity-60 transition-opacity')}
      data-vcard-media=""
    >
      {mediaSlot ??
        (media?.src ? (
          <img
            src={media.src}
            alt={media.alt ?? ''}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-muted" data-vcard-placeholder="" aria-hidden="true" />
        ))}
      {badge && isStacked && <div className="absolute start-3 top-3">{badge}</div>}
    </div>
  ) : null;

  return (
    <Root
      ref={ref}
      data-vcard-size={size}
      data-focused={focused ? '' : undefined}
      data-dimmed={dimmed ? '' : undefined}
      className={cn(ROOT[size], focused && 'ring-2 ring-ring/40', className)}
      {...rest}
    >
      {mediaNode}
      <div className={cn('flex min-w-0 flex-1 flex-col', isStacked ? (size === 'spotlight' ? 'gap-2 p-5' : 'gap-1.5 p-4') : 'gap-0.5')}>
        {eyebrow && <div className="text-xs font-bold uppercase tracking-wide text-primary">{eyebrow}</div>}
        <div className={cn('line-clamp-2', TITLE[size])}>{title}</div>
        {meta && <div className="truncate text-xs text-muted-foreground">{meta}</div>}
        {body && isStacked && <div className="text-sm text-muted-foreground">{body}</div>}
        {actions && isStacked && <div className="mt-auto flex items-center gap-2 pt-2">{actions}</div>}
      </div>
      {actions && !isStacked && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {badge && !isStacked && <div className="shrink-0">{badge}</div>}
    </Root>
  );
});
