/**
 * VTID-05176 — the one toast store behind the three web entry points (plan
 * change 30): `notify*` (lib/i18n-toast.ts), shadcn `toast()`/`useToast()`
 * (hooks/use-toast.ts) and the `sonner` `toast` (64 direct call sites).
 *
 * shadcn toasts keep the web's TOAST_LIMIT = 1 and a 5 s life
 * (use-toast.ts:8-9); sonner-style toasts (incl. notify*) keep sonner's
 * defaults: 4 s, at most 3 visible.
 */
import type { ReactNode } from 'react';
import type { Params } from '../../i18n';

export type ToastKind = 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive';
export type ToastSource = 'notify' | 'shadcn' | 'sonner';

export type ToastAction = { label: string; onClick: () => void };

export type ToastEntry = {
  id: string;
  source: ToastSource;
  kind: ToastKind;
  /** Already-final text (shadcn / sonner callers translate themselves, as on the web). */
  title?: ReactNode;
  description?: ReactNode;
  /** notify*: catalog keys, translated at display time with the member's locale. */
  titleKey?: string;
  descKey?: string;
  params?: Params;
  action?: ToastAction | ReactNode;
  duration: number;
};

export const SHADCN_TOAST_LIMIT = 1;
export const SHADCN_TOAST_DURATION = 5000;
export const SONNER_VISIBLE = 3;
export const SONNER_DURATION = 4000;

let toasts: readonly ToastEntry[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let counter = 0;

function emit() {
  for (const l of [...listeners]) l();
}

export function nextToastId(): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  return `t${counter}`;
}

export function getToasts(): readonly ToastEntry[] {
  return toasts;
}

export function subscribeToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function clearTimer(id: string) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
}

export function dismissToast(id?: string): void {
  const before = toasts.length;
  if (id === undefined) {
    for (const t of toasts) clearTimer(t.id);
    toasts = [];
  } else {
    clearTimer(id);
    toasts = toasts.filter((t) => t.id !== id);
  }
  if (toasts.length !== before) emit();
}

export function addToast(entry: ToastEntry): string {
  let next = [...toasts.filter((t) => t.id !== entry.id), entry];
  const shadcn = next.filter((t) => t.source === 'shadcn');
  const others = next.filter((t) => t.source !== 'shadcn');
  const keep = new Set([...shadcn.slice(-SHADCN_TOAST_LIMIT), ...others.slice(-SONNER_VISIBLE)].map((t) => t.id));
  for (const t of next) if (!keep.has(t.id)) clearTimer(t.id);
  next = next.filter((t) => keep.has(t.id));
  toasts = next;
  clearTimer(entry.id);
  if (Number.isFinite(entry.duration) && entry.duration > 0) {
    timers.set(entry.id, setTimeout(() => dismissToast(entry.id), entry.duration));
  }
  emit();
  return entry.id;
}

export function updateToast(id: string, patch: Partial<ToastEntry>): void {
  let changed = false;
  toasts = toasts.map((t) => {
    if (t.id !== id) return t;
    changed = true;
    return { ...t, ...patch, id };
  });
  if (changed) emit();
}

/** Test helper. */
export function __resetToasts(): void {
  for (const id of [...timers.keys()]) clearTimer(id);
  toasts = [];
  counter = 0;
  emit();
}
