/**
 * VTID-03660 — "only English and German work flawlessly! All others should
 * switch instantly."
 *
 * `de` is the only locale bundled eagerly (`import.meta.glob(..., {eager:true})`).
 * Every other locale is lazy: on switch, `catalogs[locale]` is `{}` until the
 * shards resolve, so `t.intro?.welcomeTo` is `undefined` and the JSX falls back
 * to its hardcoded literal — and those literals are ENGLISH. So a user picking
 * Spanish sees English, and a user picking English sees the same English
 * whether or not the `en` catalog ever loaded. "English works" was a
 * coincidence of the fallback language, not evidence the pipeline worked.
 *
 * When the shards arrive, `onCatalogLoaded` bumps `catalogVersion` to
 * "re-render the tree so consumers re-read the now-populated catalog" — its own
 * words. But the value was discarded (`const [, setCatalogVersion]`) and left
 * out of the `useMemo` deps, so `contextValue` kept the same object identity,
 * React bailed out of re-rendering consumers, and the screen stayed on the
 * English fallback permanently.
 *
 * ============================================================================
 * WHY THE CONSUMER IS WRAPPED IN React.memo, AND WHY THAT IS NOT A CONTRIVANCE
 * ============================================================================
 * An earlier version of this file drove a BARE consumer as a direct child of
 * the provider. It passed on the broken code — and that false negative is why
 * the defect shipped: it was read as evidence the theory was wrong, when a real
 * browser was failing the whole time.
 *
 * The reason is React's bailout rules. When the provider re-renders with an
 * IDENTICAL context value, whether a consumer re-renders anyway depends on
 * whether anything else in the path forces it. In a flat two-node test tree
 * nothing stops the render from propagating, so the consumer re-reads the
 * populated catalog and the test goes green. In the real app every consumer
 * sits behind route boundaries and memoised subtrees, so the render does NOT
 * propagate and the stale value is what the user gets.
 *
 * `React.memo` here is the smallest faithful model of that: it makes the
 * bailout the deterministic thing it is in production instead of an accident of
 * tree depth. Without it this test asserts a scenario no user is ever in.
 *
 * Mutation-verified: reverting the `catalogVersion` memo dep fails both tests.
 */
import { memo } from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Catalog objects are filled IN PLACE by the real i18n module, so the fake
// mirrors that: `ensureCatalog` populates the same object reference the
// component already holds, then notifies. That is precisely the shape that
// makes a stale context value undetectable — the data is there, and the tree
// simply never looks again.
// vi.mock factories are hoisted above the module body, so the shared state has
// to be created inside vi.hoisted or it is still in the temporal dead zone when
// the factory runs.
const h = vi.hoisted(() => ({
  catalogs: {
    'de-DE': { intro: { welcomeTo: 'WILLKOMMEN IN VITANALAND' } },
    'es-ES': {},
  } as Record<string, Record<string, unknown>>,
  notify: null as (() => void) | null,
  deliver: null as (() => void) | null,
  // STABLE across renders, and that is the entire point. The first version of
  // this mock returned `updatePreferences: vi.fn()` from the hook body, minting
  // a NEW function on every render. `setSelectedLanguage` is a useCallback that
  // depends on it, so its identity churned, so `contextValue` changed identity
  // on EVERY provider render — including the catalogVersion bump. The memo was
  // never actually stable, the consumer always re-rendered, and the test went
  // green against code that was broken in the browser.
  //
  // In the real app this function comes from React Query and IS stable, so the
  // memo really does hold and the consumer really does not re-render. An
  // unstable test double did not make the test stricter — it removed the only
  // condition under which the bug can occur.
  updatePreferences: vi.fn(),
}));

// The arrival is DEFERRED under the test's control rather than resolved inside
// ensureCatalog. Resolving immediately lets React batch the language-change
// render together with the catalog arrival into a single flush, which renders
// Spanish and hides the defect — a real dynamic import lands many ms after that
// render has already committed. The first version of this test passed on the
// broken code for exactly that reason.
vi.mock('@/i18n', () => ({
  catalogs: h.catalogs,
  ensureCatalog: vi.fn(async (locale: string) => {
    if (locale === 'es-ES' && !('intro' in h.catalogs['es-ES'])) {
      h.deliver = () => {
        h.catalogs['es-ES'].intro = { welcomeTo: 'BIENVENIDO A VITANALAND' };
        h.notify?.();
      };
    }
  }),
  onCatalogLoaded: (cb: () => void) => {
    h.notify = cb;
    return () => {
      h.notify = null;
    };
  },
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: null,
    updatePreferences: h.updatePreferences, // stable — see the note on h above
    isLoading: false,
  }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/lib/i18n-toast', () => ({
  setI18nLocale: vi.fn(),
  // VTID-03663 — LanguageProvider calls this from an effect to wake memo'd
  // subscribers. No memo'd subscriber exists in this file, so a no-op is
  // faithful; it is here because the provider imports it.
  notifyI18nLocaleChanged: vi.fn(),
  t: (k: string) => k,
}));
vi.mock('@/lib/localStorage', () => ({
  getLocalStorageItem: () => null,
  setLocalStorageItem: vi.fn(),
}));

import { LanguageProvider, useLanguage } from './LanguageContext';
import { useTranslation } from '@/hooks/useTranslation';

// memo, for the reason set out at the top of this file: it reproduces the
// bailout that the real (deep, route-split) tree has and a flat test tree does
// not. Take it off and this file goes green against the broken code.
//
// NESTED under Wrapper, and that nesting is load-bearing (VTID-03663). The
// provider now cascades a re-render by cloning its immediate child with a
// changing prop. A memo'd component that IS that immediate child therefore gets
// new props and re-renders for free — which quietly made both tests in this
// file pass against the reverted VTID-03660 fix, i.e. they stopped testing
// anything at all. One level of nesting puts Screen back where the real app
// keeps it: the cascade re-renders Wrapper, Wrapper re-creates <Screen /> with
// shallow-equal props, memo bails, and only the context value can reach it.
// Verified by re-running the VTID-03660 mutation after this change.
const Screen = memo(function Screen() {
  const { setSelectedLanguage } = useLanguage();
  const { t } = useTranslation();
  return (
    <div>
      {/* The same shape IntroExperience uses: catalog value, else an English literal. */}
      <span data-testid="headline">{(t.intro as any)?.welcomeTo || 'WELCOME TO VITANALAND'}</span>
      <button onClick={() => setSelectedLanguage('es-ES')}>go-es</button>
    </div>
  );
});

// One level of indirection so the provider's cascade lands on Wrapper, not on
// Screen. See the note on Screen above.
function Wrapper() {
  return <Screen />;
}

describe('VTID-03660 lazy catalogs must reach the screen', () => {
  beforeEach(() => {
    h.catalogs['es-ES'] = {};
    h.notify = null;
    h.deliver = null;
  });

  it('renders Spanish once the lazily-loaded catalog arrives', async () => {
    render(
      <LanguageProvider>
        <Wrapper />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('headline').textContent).toBe('WILLKOMMEN IN VITANALAND');

    await act(async () => {
      screen.getByText('go-es').click();
    });
    await act(async () => { await Promise.resolve(); });

    // Intermediate state, asserted rather than skipped past: the language has
    // changed, the catalog has not arrived, so the screen shows the ENGLISH
    // literal. This is what a Spanish user sees for the load's duration, and
    // pre-fix it is also what they see forever.
    expect(screen.getByTestId('headline').textContent).toBe('WELCOME TO VITANALAND');

    // Now the shards land, strictly after the language-change render committed.
    await act(async () => { h.deliver?.(); });

    // Pre-fix this is still the English fallback: the context value never
    // changed identity, so no consumer re-rendered to read the populated
    // catalog.
    expect(screen.getByTestId('headline').textContent).toBe('BIENVENIDO A VITANALAND');
  });

  it('does not leave a non-German locale showing the English fallback', async () => {
    render(
      <LanguageProvider>
        <Wrapper />
      </LanguageProvider>,
    );
    await act(async () => {
      screen.getByText('go-es').click();
    });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { h.deliver?.(); });

    // Stated as its own assertion because this is the user-visible symptom:
    // "only English and German work". Spanish landing on the English literal
    // is the whole bug, and it is silent — nothing errors, nothing is missing.
    expect(screen.getByTestId('headline').textContent).not.toBe('WELCOME TO VITANALAND');
  });
});
