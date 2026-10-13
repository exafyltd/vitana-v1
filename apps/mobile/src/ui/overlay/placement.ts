/**
 * VTID-05176 — anchored placement for Popover and the Tooltip hint (plan row 19).
 * Pure: window coordinates in, a logical position out. The content goes on
 * `side` of the anchor (Radix sides are physical), flips to the opposite side
 * when it does not fit there and the other side has more room, then is clamped
 * into the safe area. `align` start/end follow the reading direction.
 */

export type Side = 'top' | 'bottom' | 'left' | 'right';
export type Align = 'start' | 'center' | 'end';
export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };
/** Safe-area insets, physical (as react-native-safe-area-context reports them). */
export type Insets = { top: number; bottom: number; left: number; right: number }; // physical-ok: safe-area insets are physical

export type PlacementInput = {
  anchor: Rect;
  content: Size;
  window: Size;
  insets: Insets;
  side?: Side;
  align?: Align;
  sideOffset?: number;
  rtl?: boolean;
  /** Minimum gap to the safe-area edge. */
  padding?: number;
};

export type Placement = {
  side: Side;
  /** Physical x / y of the content's top-left corner in window coordinates. */
  x: number;
  y: number;
  /** The logical inline-start offset to style with (`start: …`). */
  start: number;
  top: number;
};

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }; // physical-ok: Radix sides

function clamp(v: number, lo: number, hi: number): number {
  if (hi < lo) return lo;
  return Math.min(Math.max(v, lo), hi);
}

export function computePlacement({
  anchor,
  content,
  window,
  insets,
  side = 'bottom',
  align = 'center',
  sideOffset = 4,
  rtl = false,
  padding = 8,
}: PlacementInput): Placement {
  const minX = insets.left + padding;
  const maxX = window.width - insets.right - padding;
  const minY = insets.top + padding;
  const maxY = window.height - insets.bottom - padding;

  const room: Record<Side, number> = {
    top: anchor.y - sideOffset - minY,
    bottom: maxY - (anchor.y + anchor.height + sideOffset),
    left: anchor.x - sideOffset - minX, // physical-ok: room per Radix side (geometry, not a style)
    right: maxX - (anchor.x + anchor.width + sideOffset), // physical-ok: room per Radix side
  };
  const need = (s: Side) => (s === 'top' || s === 'bottom' ? content.height : content.width);
  let final: Side = side;
  if (room[side] < need(side) && room[OPPOSITE[side]] > room[side]) final = OPPOSITE[side];

  const vertical = final === 'top' || final === 'bottom';
  // Main axis.
  let x = 0;
  let y = 0;
  if (final === 'bottom') y = anchor.y + anchor.height + sideOffset;
  if (final === 'top') y = anchor.y - sideOffset - content.height;
  if (final === 'right') x = anchor.x + anchor.width + sideOffset;
  if (final === 'left') x = anchor.x - sideOffset - content.width;

  // Cross axis; start/end follow the reading direction on the horizontal axis.
  if (vertical) {
    const physicalStart = rtl ? align === 'end' : align === 'start';
    const physicalEnd = rtl ? align === 'start' : align === 'end';
    if (physicalStart) x = anchor.x;
    else if (physicalEnd) x = anchor.x + anchor.width - content.width;
    else x = anchor.x + anchor.width / 2 - content.width / 2;
  } else if (align === 'start') y = anchor.y;
  else if (align === 'end') y = anchor.y + anchor.height - content.height;
  else y = anchor.y + anchor.height / 2 - content.height / 2;

  x = clamp(x, minX, maxX - content.width);
  y = clamp(y, minY, maxY - content.height);

  return { side: final, x, y, top: y, start: rtl ? window.width - (x + content.width) : x };
}
