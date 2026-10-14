/**
 * VTID-05176 — shadcn `toast()` / `useToast()` (src/hooks/use-toast.ts):
 * `{ title, description, action, variant }`, limit 1, 5 s.
 */
import { useSyncExternalStore, type ReactNode } from 'react';
import { addToast, dismissToast, getToasts, nextToastId, SHADCN_TOAST_DURATION, subscribeToasts, updateToast, type ToastAction } from './store';

export type ToastProps = {
  title?: ReactNode;
  description?: ReactNode;
  action?: ToastAction | ReactNode;
  variant?: 'default' | 'destructive';
  duration?: number;
};

export function toast({ variant = 'default', duration = SHADCN_TOAST_DURATION, ...props }: ToastProps) {
  const id = nextToastId();
  addToast({ id, source: 'shadcn', kind: variant, duration, ...props });
  return {
    id,
    dismiss: () => dismissToast(id),
    update: (next: ToastProps) => updateToast(id, { ...next, kind: next.variant ?? variant }),
  };
}

export function useToast() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  return {
    toasts: toasts.filter((t) => t.source === 'shadcn'),
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) dismissToast(toastId);
      else for (const t of getToasts()) if (t.source === 'shadcn') dismissToast(t.id);
    },
  };
}
