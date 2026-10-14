/** VTID-05176 — extend a control's touch area to the 44 pt minimum (WCAG 2.2 AA target size, SR-29). */
import type { Insets } from 'react-native';

export const MIN_TARGET = 44;

export function hitSlopFor(width: number, height: number): Insets | undefined {
  const h = Math.max(0, Math.ceil((MIN_TARGET - width) / 2));
  const v = Math.max(0, Math.ceil((MIN_TARGET - height) / 2));
  if (!h && !v) return undefined;
  return { top: v, bottom: v, left: h, right: h }; // physical-ok: Insets has no start/end; the slop is symmetric
}
