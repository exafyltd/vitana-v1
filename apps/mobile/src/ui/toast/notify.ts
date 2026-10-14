/**
 * VTID-05176 — `notify*` with the web signature `(titleKey, descKey?, params?)`
 * (src/lib/i18n-toast.ts:134-174). Keys are translated at display time through
 * `useI18n().t` (falls back to `de`, then the key).
 */
import type { Params } from '../../i18n';
import { addToast, nextToastId, SONNER_DURATION, type ToastKind } from './store';

function make(kind: ToastKind) {
  return (titleKey: string, descKey?: string, params?: Params): void => {
    addToast({ id: nextToastId(), source: 'notify', kind, titleKey, descKey, params, duration: SONNER_DURATION });
  };
}

export const notify = make('default');
export const notifySuccess = make('success');
export const notifyError = make('error');
export const notifyWarning = make('warning');
export const notifyInfo = notify;
