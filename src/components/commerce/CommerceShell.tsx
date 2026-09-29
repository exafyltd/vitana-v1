/**
 * Commerce Portal chrome (VTID-03882).
 *
 * Two skins, one set of children:
 *
 * - **In the MAXINA app on a phone** (VTID-03999): the business area is a
 *   mode of the app, so it gets the app's own chrome — `AppLayout` (top bar,
 *   side drawer, the business bottom bar, route enforcement) and the app's
 *   theme tokens. Business people are members; their business screens should
 *   look like the rest of MAXINA, not like a second product.
 * - **Desktop and `commerce.vitanaland.com`**: a self-contained light,
 *   premium portal shell (VTID-04055). This used to be a dark slate + amber
 *   theme wrapped in a literal `dark` class — reverting is re-adding that
 *   class to the wrapper below and swapping the amber-7xx/slate-* literals
 *   in this file back to the amber-400/slate-950 family; nothing else about
 *   this file's structure depends on which skin is active.
 *
 * The children are written in theme TOKENS (`bg-card`, `border-border`,
 * `text-foreground`, …), not hardcoded colors, so the app's global (light)
 * theme applies to them automatically now that this wrapper no longer opts
 * into `.dark` — including portaled dialogs/sheets/selects, which render
 * outside this wrapper via React portals. `useCommerceSkin().portalClass`
 * is kept as a named export for exactly that case (now always `''`), so a
 * future dark-mode revert only has to change it in this one place.
 */
import type { ReactNode } from 'react';
import { ShoppingBag } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { isCommerceHost } from '@/lib/commerce-host';
import { t } from '@/lib/i18n-toast';

/** Which skin the commerce screens are rendered in right now. */
export function useCommerceSkin(): { inApp: boolean; portalClass: string } {
  const isMobile = useIsMobile();
  const inApp = isMobile && !isCommerceHost();
  return { inApp, portalClass: '' };
}

export function CommerceShell({ children }: { children: ReactNode }) {
  const { inApp } = useCommerceSkin();

  if (inApp) {
    return (
      <AppLayout>
        <div className="mx-auto w-full max-w-5xl px-4 pb-24">{children}</div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient glow. Purely decorative, never interactive, never scrolls
          horizontally — hence the clipping wrapper. A light echo of the
          brand color, not a background element the eye should notice. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 inset-x-0 mx-auto h-[36rem] w-[36rem] rounded-full bg-amber-200/40 blur-[120px]" />
        <div className="absolute bottom-0 start-0 h-[28rem] w-[28rem] rounded-full bg-amber-100/50 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2.5 px-4 py-3.5">
          <ShoppingBag className="h-5 w-5 shrink-0 text-amber-700" />
          <span className="text-sm font-bold tracking-[0.2em] text-amber-700">VITANALAND</span>
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className="truncate text-xs text-muted-foreground">{t('screens.commerceportal.portalEyebrow')}</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20">{children}</main>
    </div>
  );
}
