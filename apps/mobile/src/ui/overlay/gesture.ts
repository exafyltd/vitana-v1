/** VTID-05176 — pure drag-to-dismiss rule shared by every sheet (tested with numbers). */

/** Fraction of the panel's size past which a release dismisses (plan row 18: 30 %). */
export const DISMISS_FRACTION = 0.3;
/** A release faster than this (px/s, toward the dismiss edge) dismisses — a fling. */
export const FLING_VELOCITY = 1000;

/**
 * `distance` and `velocity` are measured toward the panel's dismiss edge
 * (positive = closing). `size` is the panel's extent along that axis.
 */
export function shouldDismiss(distance: number, velocity: number, size: number): boolean {
  if (velocity >= FLING_VELOCITY) return true;
  if (size <= 0) return distance > 0;
  return distance > size * DISMISS_FRACTION;
}
