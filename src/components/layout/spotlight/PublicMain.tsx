import type { ReactNode } from 'react';
import { ScreenFrame } from './ScreenFrame';
import type { Archetype } from './archetypes';

/**
 * VTID-05117 — the `<main>` of a public page that has no app shell (legal text,
 * connector docs, support): signed-out visitors see no sidebar, so there is no
 * member chrome (StandardHeader / utility row) to compose either.
 *
 * - `spotlight` off → exactly today's `<main className={legacyClassName}>`.
 * - `spotlight` on  → the page's content inside `<ScreenFrame archetype>`, which
 *   gives the archetype's width token (a `form` column for legal text) and the
 *   `data-archetype` the staging design-lint reads.
 *
 * The page calls `useSpotlightEnabled()` once and passes the result in.
 */
export interface PublicMainProps {
  spotlight: boolean;
  archetype: Archetype;
  /** Class list of the page's own `<main>` today (flag off). */
  legacyClassName: string;
  /** Extra classes for the `<main>` inside the frame (flag on), e.g. vertical rhythm. */
  className?: string;
  /** Extra classes for the ScreenFrame root (flag on), e.g. stacking above a decorative backdrop. */
  frameClassName?: string;
  children: ReactNode;
}

export function PublicMain({ spotlight, archetype, legacyClassName, className, frameClassName, children }: PublicMainProps) {
  if (!spotlight) return <main className={legacyClassName}>{children}</main>;
  return (
    <ScreenFrame archetype={archetype} className={frameClassName}>
      <main className={className}>{children}</main>
    </ScreenFrame>
  );
}
