import type { CSSProperties } from "react";

export function avatarPositionStyle(offsetX?: number, offsetY?: number): CSSProperties {
  return { objectPosition: `${offsetX ?? 50}% ${offsetY ?? 50}%` };
}
