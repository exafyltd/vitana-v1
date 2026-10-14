/**
 * VTID-05176 — `@vitana/ui/sonner`: a sonner-compatible `toast` so the 64 direct
 * `sonner` call sites port without changing their call shape:
 * `toast(msg, { description })`, `.success/.error/.warning/.info/.message`,
 * `.dismiss(id?)`. Messages are final text (callers translate, as on the web).
 */
import type { ReactNode } from 'react';
import { addToast, dismissToast, nextToastId, SONNER_DURATION, type ToastAction, type ToastKind } from './toast/store';

export type ExternalToast = {
  id?: string | number;
  description?: ReactNode;
  duration?: number;
  action?: ToastAction;
};

function show(kind: ToastKind, message: ReactNode, data?: ExternalToast): string {
  const id = data?.id !== undefined ? String(data.id) : nextToastId();
  return addToast({
    id,
    source: 'sonner',
    kind,
    title: message,
    description: data?.description,
    action: data?.action,
    duration: data?.duration ?? SONNER_DURATION,
  });
}

type SonnerToast = ((message: ReactNode, data?: ExternalToast) => string) & {
  success: (message: ReactNode, data?: ExternalToast) => string;
  error: (message: ReactNode, data?: ExternalToast) => string;
  warning: (message: ReactNode, data?: ExternalToast) => string;
  info: (message: ReactNode, data?: ExternalToast) => string;
  message: (message: ReactNode, data?: ExternalToast) => string;
  dismiss: (id?: string | number) => void;
};

export const toast: SonnerToast = Object.assign((message: ReactNode, data?: ExternalToast) => show('default', message, data), {
  success: (m: ReactNode, d?: ExternalToast) => show('success', m, d),
  error: (m: ReactNode, d?: ExternalToast) => show('error', m, d),
  warning: (m: ReactNode, d?: ExternalToast) => show('warning', m, d),
  info: (m: ReactNode, d?: ExternalToast) => show('info', m, d),
  message: (m: ReactNode, d?: ExternalToast) => show('default', m, d),
  dismiss: (id?: string | number) => dismissToast(id === undefined ? undefined : String(id)),
});
