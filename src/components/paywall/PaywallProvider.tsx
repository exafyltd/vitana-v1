/**
 * VTID-03107 · Billing v1 — Paywall provider
 *
 * Listens for `vitana:paywall-shown` window events (dispatched by
 * src/lib/billingApi.ts on HTTP 402) and renders a single global
 * <PaywallModal> with the payload. Single source of truth — no prop drilling.
 *
 * Mount once at the top of <App />, inside <AuthGuard /> but outside the
 * routes tree so it survives navigation.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { PAYWALL_EVENT_NAME, type PaywallPayload } from '@/lib/billingApi';
import { PaywallModal } from './PaywallModal';

interface PaywallContextValue {
  /** Programmatically open the modal — used by code paths that can't go through the 402 interceptor (e.g. when the user clicks a CTA and we want to preview the paywall) */
  show(payload: PaywallPayload): void;
  /** Close the modal */
  close(): void;
  /** Currently-shown payload, or null when closed */
  current: PaywallPayload | null;
}

const PaywallContext = createContext<PaywallContextValue | null>(null);

export function usePaywall(): PaywallContextValue {
  const ctx = useContext(PaywallContext);
  if (!ctx) {
    throw new Error('usePaywall must be used within <PaywallProvider>');
  }
  return ctx;
}

interface PaywallProviderProps {
  children: ReactNode;
}

export function PaywallProvider({ children }: PaywallProviderProps) {
  const [current, setCurrent] = useState<PaywallPayload | null>(null);

  const show = useCallback((payload: PaywallPayload) => {
    setCurrent(payload);
  }, []);

  const close = useCallback(() => {
    setCurrent(null);
  }, []);

  useEffect(() => {
    function onPaywallEvent(e: Event) {
      const ce = e as CustomEvent<PaywallPayload>;
      if (ce.detail) {
        show(ce.detail);
      }
    }
    window.addEventListener(PAYWALL_EVENT_NAME, onPaywallEvent as EventListener);
    return () => {
      window.removeEventListener(PAYWALL_EVENT_NAME, onPaywallEvent as EventListener);
    };
  }, [show]);

  return (
    <PaywallContext.Provider value={{ show, close, current }}>
      {children}
      <PaywallModal payload={current} onOpenChange={(open) => !open && close()} />
    </PaywallContext.Provider>
  );
}
