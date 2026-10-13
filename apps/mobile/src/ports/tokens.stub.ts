// STUB(N1): replace with @vitana/tokens `resolved`, `gradients`, `radius`, `themeVars` — awaits packages/tokens (VTID-05183)
/**
 * VTID-05186 (N3, Interfaces I-N1.4) — BRANCH-ONLY hand table of the colours
 * the shell uses, copied from src/index.css `:root` / `.dark` (first
 * `@layer base` rules) and `.maxina-topbar` (origin/main d7109abf2). Deleted
 * with the core stub when `@vitana/tokens` is in.
 */
export type ColorScheme = 'light' | 'dark';

type Triplet = string;

/** `--x: h s% l%` values (index.css :root and .dark). */
export const cssVars: Record<ColorScheme, Record<string, Triplet>> = {
  light: {
    '--background': '0 0% 100%',
    '--foreground': '222.2 84% 4.9%',
    '--card': '0 0% 100%',
    '--card-foreground': '222.2 84% 4.9%',
    '--primary': '222.2 47.4% 11.2%',
    '--primary-foreground': '210 40% 98%',
    '--muted': '210 40% 96.1%',
    '--muted-foreground': '215.4 16.3% 46.9%',
    '--accent': '210 40% 96.1%',
    '--accent-foreground': '222.2 47.4% 11.2%',
    '--destructive': '0 84.2% 60.2%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '214.3 31.8% 91.4%',
  },
  dark: {
    '--background': '222.2 84% 4.9%',
    '--foreground': '210 40% 98%',
    '--card': '222.2 84% 4.9%',
    '--card-foreground': '210 40% 98%',
    '--primary': '210 40% 98%',
    '--primary-foreground': '222.2 47.4% 11.2%',
    '--muted': '217.2 32.6% 17.5%',
    '--muted-foreground': '215 20.2% 65.1%',
    '--accent': '217.2 32.6% 17.5%',
    '--accent-foreground': '210 40% 98%',
    '--destructive': '0 62.8% 30.6%',
    '--destructive-foreground': '210 40% 98%',
    '--border': '217.2 32.6% 17.5%',
  },
};

const toHsl = (t: Triplet) => {
  const [h, s, l] = t.split(/\s+/);
  return `hsl(${h}, ${s}, ${l})`;
};

/** Each colour as a React-Native-parsable `hsl(h, s%, l%)` string. */
export const resolved: Record<ColorScheme, Record<string, { hsl: string }>> = {
  light: Object.fromEntries(Object.entries(cssVars.light).map(([k, v]) => [k.slice(2), { hsl: toHsl(v) }])),
  dark: Object.fromEntries(Object.entries(cssVars.dark).map(([k, v]) => [k.slice(2), { hsl: toHsl(v) }])),
};

/** `.maxina-topbar` (index.css:1462). */
export const gradients = {
  'maxina-topbar': {
    css: 'linear-gradient(180deg, hsl(201, 90%, 78%) 0%, hsl(201, 75%, 70%) 100%)',
    color: 'rgba(255, 255, 255, 0.95)',
  },
} as const;

/** `--radius: 0.5rem` at 16 px. */
export const radius = { lg: 8, md: 6, sm: 4 } as const;
