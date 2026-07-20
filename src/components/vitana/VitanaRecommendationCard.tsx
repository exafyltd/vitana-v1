/**
 * VitanaRecommendationCard — shared layout shell for every proactive
 * News-feed card (Vitana Index, Longevity Journey, Match/Performer).
 *
 * Enforces one skeleton across every card so they read as one family: ORB +
 * "Vitana" + feature badge + dismiss (X) in the header row, an eyebrow
 * label, a left-column headline/subtext/CTA, and a right-column visual
 * widget that echoes the destination screen. Only the content in each slot
 * differs per card — position, spacing, and card height stay identical
 * because every caller feeds the same number of text rows into `children`.
 */
import { type ReactNode, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { VitanaRecommendationHeader, type VitanaFeature } from '@/components/vitana/VitanaRecommendationHeader';
import { cn } from '@/lib/utils';

/**
 * Fixed card height, identical across every card in this family. Content
 * that would otherwise vary the height (a wrapped headline, a locale with
 * longer strings) is vertically centered into this box instead — callers
 * cap their own headline/subtext with `line-clamp` so nothing ever forces
 * the box to grow.
 */
const CARD_HEIGHT_CLASS = 'h-[138px]';

export interface VitanaRecommendationCardProps {
  /** Destination feature — drives the header badge icon + label. */
  feature: VitanaFeature;
  /** Uppercase eyebrow label (slot 5). */
  eyebrow: string;
  /** Right-column destination-preview visual (slot 9). Purely decorative. */
  widget: ReactNode;
  /** Card tap/Enter/Space — navigates to the destination. */
  onOpen: () => void;
  /** X button handler — dismisses the card locally. */
  onDismiss: () => void;
  dismissLabel: string;
  /** Left-column content: headline, subtext, CTA (slots 6–8). */
  children: ReactNode;
}

export function VitanaRecommendationCard({
  feature,
  eyebrow,
  widget,
  onOpen,
  onDismiss,
  dismissLabel,
  children,
}: VitanaRecommendationCardProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border border-sys-vitana-card-border bg-sys-vitana-card p-2.5 shadow-sm cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-fade-in',
        CARD_HEIGHT_CLASS,
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="absolute top-2 right-2 z-10 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors"
        aria-label={dismissLabel}
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <VitanaRecommendationHeader feature={feature} className="pr-6 mb-1" />

      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
        {eyebrow}
      </span>

      <div className="mt-0.5 flex flex-1 min-h-0 items-center gap-2.5">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="shrink-0 flex items-center justify-center" aria-hidden="true">
          {widget}
        </div>
      </div>
    </div>
  );
}
