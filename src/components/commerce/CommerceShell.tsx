/**
 * Commerce Portal chrome (VTID-03882).
 *
 * Deliberately self-contained dark slate + amber rather than the app's theme
 * tokens, matching `pages/portals/CommercePortalLogin.tsx` — a merchant signs
 * in there and lands here, and until this VTID the two looked like different
 * products. The portal is host-routed onto the same build
 * (`lib/commerce-host.ts`), so it is allowed its own skin.
 *
 * Explicit slate/amber classes, NOT `from-<color>-50` gradient stops: the
 * dark-mode safety net at the bottom of `src/index.css` force-overrides those
 * stops to `--background`, which would silently flatten a pastel hero.
 *
 * VTID-03989: on a phone this shell is reached from the app's drawer, which
 * left the user with no way back but the browser gesture — a back affordance
 * now sits in the header below `md`. It is suppressed on the dedicated
 * commerce host, where there is no community app to go back to.
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ShoppingBag } from 'lucide-react';
import { isCommerceHost } from '@/lib/commerce-host';
import { t } from '@/lib/i18n-toast';

export function CommerceShell({ children }: { children: ReactNode }) {
  const showBackToApp = !isCommerceHost();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Ambient glow. Purely decorative, never interactive, never scrolls
          horizontally — hence the clipping wrapper. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 inset-x-0 mx-auto h-[36rem] w-[36rem] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-0 start-0 h-[28rem] w-[28rem] rounded-full bg-amber-400/5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-30 border-b border-amber-500/15 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2.5 px-4 py-3.5">
          {showBackToApp && (
            <Link
              to="/home"
              aria-label={t('screens.commerceportal.orgOnboarding.backToApp')}
              className="-ms-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 hover:bg-slate-800 md:hidden"
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </Link>
          )}
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
