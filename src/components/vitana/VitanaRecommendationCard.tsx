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
import { type ReactNode, type KeyboardEvent, type SyntheticEvent } from 'react';
import { X } from 'lucide-react';
import { VitanaRecommendationHeader, type VitanaFeature } from '@/components/vitana/VitanaRecommendationHeader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Fixed card height, identical across every card in this family. Content
 * that would otherwise vary the height (a wrapped headline, a locale with
 * longer strings) is vertically centered into this box instead — callers
 * cap their own headline/subtext with `line-clamp` so nothing ever forces
 * the box to grow.
 */
const CARD_HEIGHT_CLASS = 'h-[138px]';

const DISMISS_CLASS =
  'absolute top-2 end-2 z-10 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background/40 transition-colors';

const stop = (e: SyntheticEvent) => e.stopPropagation();

export interface VitanaRecommendationCardProps {
  /** Destination feature — drives the header badge icon + label. */
  feature: VitanaFeature;
  /** Uppercase eyebrow label (slot 5). */
  eyebrow: string;
  /** Right-column destination-preview visual (slot 9). Purely decorative. */
  widget?: ReactNode;
  /**
   * Free-floating visual pinned to the card's bottom-right corner, absolutely
   * positioned over the card rather than laid out in the content row (e.g. the
   * match-quality badge). Purely decorative. Callers using this should reserve
   * room for it in their own `children` (e.g. padding-right) since it overlaps
   * normal flow.
   */
  cornerBadge?: ReactNode;
  /** Card tap/Enter/Space — navigates to the destination. */
  onOpen: () => void;
  /**
   * X button handler — dismisses the card. Optional (VTID-05143): a card
   * without a dismiss (a feature card shared in a chat) renders no X.
   */
  onDismiss?: () => void;
  dismissLabel?: string;
  /**
   * VTID-05143: pacing choices behind the same X (the "Did you know" tour:
   * this tip / not today / stop the tour). When given, the X opens a small
   * menu with these items instead of calling `onDismiss`; the X keeps its
   * position, size and icon, so the header stays identical on every card.
   */
  dismissMenu?: ReadonlyArray<{ label: string; onSelect: () => void }>;
  /**
   * VTID-05143 Unified Card System: the card's accent tint (a start-edge
   * border from `ACCENT_CLASSES`). Added to the shell's own classes; the
   * shell, its height and its type stay the same for every card.
   */
  accentClassName?: string;
  /**
   * VTID-05143: the widget holds a real control (the card's action button),
   * so it must stay in the accessibility tree. Default: decorative.
   */
  widgetInteractive?: boolean;
  /** Left-column content: headline, subtext, CTA (slots 6–8). */
  children: ReactNode;
}

export function VitanaRecommendationCard({
  feature,
  eyebrow,
  widget,
  cornerBadge,
  onOpen,
  onDismiss,
  dismissLabel,
  dismissMenu,
  accentClassName,
  widgetInteractive,
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
        accentClassName,
      )}
    >
      {dismissMenu && dismissMenu.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={stop}
            onKeyDown={stop}
            className={DISMISS_CLASS}
            aria-label={dismissLabel}
          >
            <X className="w-3.5 h-3.5" />
          </DropdownMenuTrigger>
          {/* Portal content still bubbles React events to the card: stop them. */}
          <DropdownMenuContent align="end" onClick={stop} onKeyDown={stop}>
            {dismissMenu.map((item) => (
              <DropdownMenuItem key={item.label} onSelect={item.onSelect}>
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        onDismiss && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss();
            }}
            className={DISMISS_CLASS}
            aria-label={dismissLabel}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )
      )}

      <VitanaRecommendationHeader feature={feature} className="pe-6 mb-1" />

      <span className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">
        {eyebrow}
      </span>

      <div className="mt-0.5 flex flex-1 min-h-0 items-center gap-2.5">
        <div className="min-w-0 flex-1">{children}</div>
        {widget && (
          <div className="shrink-0 flex items-center justify-center" aria-hidden={widgetInteractive ? undefined : true}>
            {widget}
          </div>
        )}
      </div>

      {cornerBadge}
    </div>
  );
}
