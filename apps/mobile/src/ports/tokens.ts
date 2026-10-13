/**
 * VTID-05186 (N3, Interfaces I-N1.4) — design tokens through one port. Until
 * `@vitana/tokens` (N1) merges, the values come from the branch-only
 * `./tokens.stub`; the swap changes the import line (and, if N1's shapes
 * differ, the two small adapters below), never a shell file.
 */
import { resolved, gradients, radius, type ColorScheme } from './tokens.stub';

export type { ColorScheme };
export { radius };

export type ShellColors = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
};

export function shellColors(scheme: ColorScheme): ShellColors {
  const c = (name: string) => resolved[scheme][name].hsl;
  return {
    background: c('background'),
    foreground: c('foreground'),
    card: c('card'),
    primary: c('primary'),
    primaryForeground: c('primary-foreground'),
    muted: c('muted'),
    mutedForeground: c('muted-foreground'),
    accent: c('accent'),
    destructive: c('destructive'),
    destructiveForeground: c('destructive-foreground'),
    border: c('border'),
  };
}

/** The Maxina top bar (`.maxina-topbar`), the same in both schemes. */
export const maxinaTopbar = { backgroundImage: gradients['maxina-topbar'].css, color: gradients['maxina-topbar'].color };
