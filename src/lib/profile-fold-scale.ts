/**
 * VTID-04526 — proportional sizing for the mobile profile's first screen.
 *
 * The Vitana Index card is stretched to end at the fold (VTID-04489). On a
 * tall phone that left its fixed-size content floating in a white card. Two
 * 0..1 factors grow the content instead:
 *
 *   header — from the viewport height (the header sits above the card and
 *            decides how much room the card gets);
 *   card   — from the height the card actually has, measured the same way
 *            the fold is measured, so a phone with a taller app bar or a
 *            shorter header gets the size that fits it.
 *
 * Sizes are emitted as `calc(min + range * var(--x))` so the browser does the
 * interpolation and nothing re-renders while a factor settles.
 */

/** Viewport height (px) at which the header is at its smallest / largest. */
export const HEADER_SCALE_FROM = 667;
export const HEADER_SCALE_TO = 900;

/** Card height (px) at which the card content is at its smallest / largest. */
export const CARD_SCALE_FROM = 300;
export const CARD_SCALE_TO = 460;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** 0 at HEADER_SCALE_FROM and below, 1 at HEADER_SCALE_TO and above. */
export function headerScale(viewportHeight: number): number {
  return clamp01((viewportHeight - HEADER_SCALE_FROM) / (HEADER_SCALE_TO - HEADER_SCALE_FROM));
}

/** 0 when the card has CARD_SCALE_FROM px or less, 1 at CARD_SCALE_TO or more. */
export function cardScale(cardHeight: number | undefined): number {
  if (cardHeight === undefined) return 0;
  return clamp01((cardHeight - CARD_SCALE_FROM) / (CARD_SCALE_TO - CARD_SCALE_FROM));
}

/** CSS length that grows from `min` to `max` px as the CSS variable goes 0 → 1. */
export function lerpPx(min: number, max: number, cssVar: "--hx" | "--ix"): string {
  return `calc(${min}px + ${max - min}px * var(${cssVar}, 0))`;
}
