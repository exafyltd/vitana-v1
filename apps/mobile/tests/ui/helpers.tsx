/** VTID-05176 — shared helpers for the Vitana Native UI tests. */
import type { ReactElement } from 'react';
import { I18nManager } from 'react-native';
import { render, type RenderResult } from '@testing-library/react-native';
import { I18nProvider } from '../../src/i18n/I18nProvider';
import { catalogs, type Locale } from '../../src/i18n';
import { VitanaUIProvider } from '../../src/ui';
import { __resetOverlayStack } from '../../src/ui/overlay/stack';
import { __resetToasts } from '../../src/ui/toast/store';

export type Mode = 'ltr' | 'rtl' | 'dark';

export type RenderOptions = {
  locale?: Locale;
  direction?: 'ltr' | 'rtl';
  scheme?: 'light' | 'dark';
  reducedMotion?: boolean;
};

/** Sets I18nManager.isRTL for the duration of `fn` (the RTL half of every RTL test). */
export function withIsRTL<T>(value: boolean, fn: () => T): T {
  const before = I18nManager.isRTL;
  Object.defineProperty(I18nManager, 'isRTL', { value, configurable: true, writable: true });
  try {
    return fn();
  } finally {
    Object.defineProperty(I18nManager, 'isRTL', { value: before, configurable: true, writable: true });
  }
}

export function renderUI(ui: ReactElement, { locale = 'en', direction, scheme = 'light', reducedMotion = true }: RenderOptions = {}): RenderResult {
  return render(
    <I18nProvider initialLocale={locale}>
      <VitanaUIProvider colorScheme={scheme} direction={direction} reducedMotion={reducedMotion}>
        {ui}
      </VitanaUIProvider>
    </I18nProvider>,
  );
}

/** Renders `ui` in one of the three snapshot modes: LTR, RTL (isRTL mocked + provider rtl, Arabic), dark. */
export function renderMode(ui: ReactElement, mode: Mode): RenderResult {
  if (mode === 'rtl') return withIsRTL(true, () => renderUI(ui, { direction: 'rtl', locale: 'ar' }));
  if (mode === 'dark') return renderUI(ui, { scheme: 'dark' });
  return renderUI(ui, { direction: 'ltr' });
}

export const MODES: readonly Mode[] = ['ltr', 'rtl', 'dark'];

export function resetKit(): void {
  __resetOverlayStack();
  __resetToasts();
}

/** Flattens a (possibly nested / falsy) RN style prop into one object. */
export function flat(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...flat(s) }), {});
  if (typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

const PHYSICAL = ['left', 'right', 'marginLeft', 'marginRight', 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'];

/** Every physical horizontal key set on `style`. */
export function physicalKeys(style: unknown): string[] {
  const s = flat(style);
  return PHYSICAL.filter((k) => s[k] !== undefined);
}

/** Collects every string child of the rendered tree. */
export function texts(node: unknown): string[] {
  const out: string[] = [];
  const walk = (n: unknown) => {
    if (typeof n === 'string') out.push(n);
    else if (Array.isArray(n)) n.forEach(walk);
    else if (n && typeof n === 'object' && 'children' in n) walk((n as { children: unknown }).children);
  };
  walk(node);
  return out;
}

type Inst = { type: unknown; props: Record<string, unknown>; children: (Inst | string)[] };

/** The first host (string-typed) elements below `inst`, skipping composite wrappers. */
export function hostChildren(inst: Inst): Inst[] {
  const out: Inst[] = [];
  for (const c of inst.children) {
    if (typeof c === 'string') continue;
    if (typeof c.type === 'string') out.push(c);
    else out.push(...hostChildren(c));
  }
  return out;
}

/** A key's text in `locale` only — no `de` fallback, no key echo. */
export function resolveStrict(locale: string, key: string): string | undefined {
  let v: unknown = (catalogs as Record<string, unknown>)[locale];
  for (const part of key.split('.')) {
    if (v && typeof v === 'object' && part in (v as Record<string, unknown>)) v = (v as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof v === 'string' ? v : undefined;
}
