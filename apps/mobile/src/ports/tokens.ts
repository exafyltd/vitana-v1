/**
 * VTID-05186 (N3, Interfaces I-N1.4) — design tokens through one port, from
 * N1's `@vitana/tokens` (VTID-05183, generated from src/index.css and
 * tailwind.config.ts). Shell files read colours only through `shellColors`
 * and `maxinaTopbar`; a change in N1's shapes is absorbed here.
 */
import { color, gradients, radius as tokenRadius, type ColorScheme } from '@vitana/tokens';

export type { ColorScheme };

/** `--radius` and its steps in px (tailwind `rounded-lg/md/sm`). */
export const radius = { lg: tokenRadius.lg.px, md: tokenRadius.md.px, sm: tokenRadius.sm.px } as const;

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
  const c = (name: string) => color(name, scheme);
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

/**
 * The Maxina top bar (`.maxina-topbar`), the same in both schemes. The
 * gradient is rebuilt from the generated stops' hex colours, which React
 * Native's colour parser always reads.
 */
const topbar = gradients.maxinaTopbar;
export const maxinaTopbar = {
  backgroundImage: `linear-gradient(${topbar.angle}deg, ${topbar.stops.map((s) => `${s.color} ${s.at * 100}%`).join(', ')})`,
  color: topbar.foreground.css,
};
