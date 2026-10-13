import type { ReactNode } from 'react';
import { ScreenFrame, type ScreenFrameProps } from './ScreenFrame';

/**
 * VTID-05117 — wraps a page body in `<ScreenFrame>` only while Spotlight is on.
 *
 * - `on` false → the children exactly as they are today (no extra DOM).
 * - `on` true  → `<ScreenFrame archetype …>` around the same children.
 *
 * For pages whose chrome comes from their own shell (the Commerce Portal's
 * CommerceShell, a public page without the app sidebar), so there is no member
 * header or utility row to pass. The page calls `useSpotlightEnabled()` once
 * and passes the result as `on`.
 */
export interface FrameWhenProps extends Omit<ScreenFrameProps, 'children'> {
  on: boolean;
  children: ReactNode;
}

export function FrameWhen({ on, children, ...frame }: FrameWhenProps) {
  if (!on) return <>{children}</>;
  return <ScreenFrame {...frame}>{children}</ScreenFrame>;
}
