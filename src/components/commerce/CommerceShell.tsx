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
 * - **Desktop and `commerce.vitanaland.com`**: the self-contained dark slate +
 *   amber portal, matching `pages/portals/CommercePortalLogin.tsx` — a merchant
 *   signs in there and lands here. The children are written in theme tokens
 *   and rendered inside a `dark` wrapper (Tailwind `darkMode: ["class"]`,
 *   every token is redefined under `.dark` in index.css), so they keep this
 *   look here without a second copy of the markup.
 *
 * Portaled content (dialogs, sheets, selects) renders outside this wrapper —
 * give it `useCommerceSkin().portalClass` so it follows the same skin.
 *
 * Explicit slate/amber classes on the dark shell itself, NOT `from-<color>-50`
 * gradient stops: the dark-mode safety net at the bottom of `src/index.css`
 * force-overrides those stops to `--background`.
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
  return { inApp, portalClass: inApp ? '' : 'dark' };
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
    <div className="dark min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient glow. Purely decorative, never interactive, never scrolls
          horizontally — hence the clipping wrapper. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 inset-x-0 mx-auto h-[36rem] w-[36rem] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-0 start-0 h-[28rem] w-[28rem] rounded-full bg-amber-400/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-amber-500/15 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-4 py-3.5">
          <ShoppingBag className="h-5 w-5 shrink-0 text-amber-400" />
          <span className="text-sm font-bold tracking-[0.2em] text-amber-400">VITANALAND</span>
          <span aria-hidden className="h-4 w-px bg-amber-500/25" />
          <span className="truncate text-xs text-slate-400">{t('screens.commerceportal.portalEyebrow')}</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-20">{children}</main>
    </div>
  );
}
