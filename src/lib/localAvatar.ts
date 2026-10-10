/**
 * VTID-05066 — draw DiceBear auto-avatars on the device instead of fetching
 * each one from api.dicebear.com.
 *
 * The phone journey robot (VTID-05062) measured Postfach's first visit at
 * 7 s on a mid-range phone, waiting on one third-party SVG per member without
 * a photo (~0.5 s each, one stalled 11 s). The same @dicebear packages the API
 * runs render byte-identical SVG locally (checked against the live API for
 * 9.4.3 — identity is best-effort across versions; any render error keeps the
 * original URL, i.e. today's behaviour).
 *
 * Only URLs this file fully understands are converted: `https://api.dicebear.com/9.x/<style>/svg`
 * with one of the styles `autoAvatar.ts` uses and only the parameters it sets
 * (seed, backgroundType, backgroundColor, radius, size). Anything else → null.
 *
 * `@dicebear/core` and each style are dynamically imported, so the initial
 * chunk only carries this parser; a style chunk loads once, the first time an
 * avatar in that style is on screen.
 */
import type { Options, Style } from '@dicebear/core';

type StyleLoader = () => Promise<Style<object>>;

// Explicit imports so the bundler emits one chunk per style. Budget (VTID-05066
// plan): each style chunk ≤ 60 KB gzipped. `adventurer` (~108 KB) and
// `notionists` (~118 KB) exceed it and are left out: those two styles keep
// loading from api.dicebear.com as before.
const STYLE_LOADERS: Record<string, StyleLoader> = {
  lorelei: () => import('@dicebear/lorelei') as Promise<Style<object>>,
  'lorelei-neutral': () => import('@dicebear/lorelei-neutral') as Promise<Style<object>>,
  'big-ears': () => import('@dicebear/big-ears') as Promise<Style<object>>,
  'big-smile': () => import('@dicebear/big-smile') as Promise<Style<object>>,
  bottts: () => import('@dicebear/bottts') as Promise<Style<object>>,
  'bottts-neutral': () => import('@dicebear/bottts-neutral') as Promise<Style<object>>,
  croodles: () => import('@dicebear/croodles') as Promise<Style<object>>,
  'fun-emoji': () => import('@dicebear/fun-emoji') as Promise<Style<object>>,
  icons: () => import('@dicebear/icons') as Promise<Style<object>>,
  'notionists-neutral': () => import('@dicebear/notionists-neutral') as Promise<Style<object>>,
  personas: () => import('@dicebear/personas') as Promise<Style<object>>,
  'pixel-art': () => import('@dicebear/pixel-art') as Promise<Style<object>>,
  shapes: () => import('@dicebear/shapes') as Promise<Style<object>>,
  thumbs: () => import('@dicebear/thumbs') as Promise<Style<object>>,
};

const PREFIX = 'https://api.dicebear.com/9.x/';
const KNOWN_PARAMS = new Set(['seed', 'backgroundType', 'backgroundColor', 'radius', 'size']);

export interface ParsedDiceBearUrl {
  style: string;
  options: {
    seed: string;
    backgroundType?: string[];
    backgroundColor?: string[];
    radius?: number;
    size?: number;
  };
}

/** True when `url` is a DiceBear 9.x URL (cheap check for the render path). */
export function isDiceBear9Url(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith(PREFIX);
}

/** Parse a DiceBear 9.x URL this module can render, else null. */
export function parseDiceBearUrl(url: string): ParsedDiceBearUrl | null {
  if (!isDiceBear9Url(url)) return null;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const m = u.pathname.match(/^\/9\.x\/([a-z-]+)\/svg$/);
  if (!m || !STYLE_LOADERS[m[1]]) return null;
  for (const key of u.searchParams.keys()) if (!KNOWN_PARAMS.has(key)) return null;
  const seed = u.searchParams.get('seed');
  if (seed === null) return null;
  const options: ParsedDiceBearUrl['options'] = { seed };
  const bgType = u.searchParams.get('backgroundType');
  if (bgType) options.backgroundType = bgType.split(',');
  const bgColor = u.searchParams.get('backgroundColor');
  if (bgColor) options.backgroundColor = bgColor.split(',');
  for (const key of ['radius', 'size'] as const) {
    const v = u.searchParams.get(key);
    if (v === null) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    options[key] = n;
  }
  return { style: m[1], options };
}

const MEMO_MAX = 500;
const memo = new Map<string, Promise<string | null>>();
// Settled results, so a remount (tab return) renders the avatar on its first paint.
const settled = new Map<string, string | null>();

/** The settled result for `url`, or undefined while it is still unknown. */
export function peekLocalAvatar(url: string): string | null | undefined {
  return settled.get(url);
}

/**
 * A `data:image/svg+xml` URI with the same SVG the API would serve for `url`,
 * or null when the URL is not one this module renders or rendering fails.
 */
export function localAvatarDataUri(url: string): Promise<string | null> {
  const cached = memo.get(url);
  if (cached) return cached;
  const parsed = parseDiceBearUrl(url);
  const result: Promise<string | null> = parsed
    ? Promise.all([import('@dicebear/core'), STYLE_LOADERS[parsed.style]()])
        .then(([core, style]) => core.createAvatar(style, parsed.options as Partial<Options>).toDataUri())
        .catch(() => null)
    : Promise.resolve(null);
  memo.set(url, result);
  void result.then((v) => {
    settled.set(url, v);
    if (settled.size > MEMO_MAX) settled.delete(settled.keys().next().value as string);
  });
  if (memo.size > MEMO_MAX) memo.delete(memo.keys().next().value as string);
  return result;
}

/** Test-only. */
export function __clearLocalAvatarMemo(): void {
  memo.clear();
  settled.clear();
}
