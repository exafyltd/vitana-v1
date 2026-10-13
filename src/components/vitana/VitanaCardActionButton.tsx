/**
 * VTID-05085 — the one action button of the Unified Card System.
 *
 * Three shapes so members learn a card by colour + button shape:
 *   round          — icon only (the label is the aria-label)
 *   pill           — icon + visible label
 *   rounded-square — icon only (the label is the aria-label)
 *
 * Every shape is at least 36 px (h-9) so it is a comfortable tap target.
 * The fill comes from `ACCENT_CLASSES` (design tokens only). The click never
 * bubbles to the card (the card body has its own open action).
 */
import { type KeyboardEvent, type MouseEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENT_CLASSES, type CardAccent, type CardButtonShape } from '@/components/vitana/vitana-card-catalog';

const SHAPE_CLASSES: Record<CardButtonShape, string> = {
  round: 'h-9 w-9 rounded-full justify-center',
  pill: 'h-9 max-w-full rounded-full px-3 gap-1.5',
  'rounded-square': 'h-9 w-9 rounded-lg justify-center',
};

export interface VitanaCardActionButtonProps {
  shape: CardButtonShape;
  icon: LucideIcon;
  /** Already-translated label. Visible on the pill, aria-label on every shape. */
  label: string;
  accent: CardAccent;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  /** Extra icon classes (e.g. `rtl:-scale-x-100` for a direction-bearing icon). */
  iconClassName?: string;
  'data-testid'?: string;
}

export function VitanaCardActionButton({
  shape,
  icon: Icon,
  label,
  accent,
  onClick,
  disabled,
  className,
  iconClassName,
  'data-testid': testId,
}: VitanaCardActionButtonProps) {
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled) onClick();
  };
  // Enter/Space on the button must not also fire the card's own key handler.
  const stopKeys = (e: KeyboardEvent<HTMLButtonElement>) => e.stopPropagation();

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={stopKeys}
      disabled={disabled}
      aria-label={label}
      title={shape === 'pill' ? undefined : label}
      data-shape={shape}
      data-testid={testId}
      className={cn(
        'inline-flex shrink-0 items-center text-xs font-semibold text-primary-foreground shadow-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        SHAPE_CLASSES[shape],
        ACCENT_CLASSES[accent].button,
        className,
      )}
    >
      <Icon className={cn('h-4 w-4 shrink-0', iconClassName)} aria-hidden="true" />
      {shape === 'pill' && <span className="truncate">{label}</span>}
    </button>
  );
}
