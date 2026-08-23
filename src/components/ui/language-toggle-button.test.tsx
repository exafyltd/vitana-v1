/**
 * VTID-03580 — "can I see the language selection on the landing page and choose
 * Spanish or French?"
 *
 * The honest answer at the time was no. The flag button existed and worked, but
 * it was a hardcoded DE <-> EN toggle: it imported two flags and computed
 * `isGerman ? 'en-US' : 'de-DE'`, never reading the language list. Eight
 * complete GA catalogs were reachable only by signing up in German and finding
 * Settings.
 *
 * These tests are written against that question rather than against the
 * implementation: they assert a user can SEE every shipped language and CHOOSE
 * one, so a future refactor back to a two-way toggle fails here regardless of
 * how it is coded.
 *
 * Since then the trigger moved from a bare flag icon to a globe-icon pill, and
 * the panel it opens moved from a small anchored dropdown to a full-screen
 * Drawer (vaul) — the tests below were rewritten around that interaction
 * model, but the core promise (every GA language reachable, one tap away)
 * is unchanged.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// vaul/Radix's Drawer measures its content for drag/snap-point behavior via
// ResizeObserver, which jsdom does not implement. This is the first Drawer
// component under test in this repo — stub it locally rather than hoisting
// into the shared src/test/setup.ts until a second Drawer test needs it.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ResizeObserver = (global as any).ResizeObserver ?? ResizeObserverStub;

const setSelectedLanguage = vi.fn();
let currentLanguage = 'de-DE';

// The real context pulls in Supabase, auth and the whole catalog loader. The
// component's contract with it is three values, so that is what is faked —
// but `getVisibleLanguageOptions` is deliberately NOT faked below; the real
// GA filter is imported, so promoting a locale changes these tests' data.
vi.mock('@/contexts/LanguageContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/LanguageContext')>(
    '@/contexts/LanguageContext',
  );
  return {
    ...actual,
    useLanguage: () => ({
      selectedLanguage: currentLanguage,
      setSelectedLanguage,
      languageOptions: actual.languageOptions,
      isLoading: false,
    }),
  };
});

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: {
      intro: {
        chooseLanguage: 'Sprache wählen',
        chooseLanguageTitle: 'Choose your language',
        chooseLanguageSubtitle: 'Vitana will speak and respond in this language.',
      },
    },
    isGerman: true,
  }),
}));

// Separate from useTranslation's `t` — this is the function-call lookup the
// component uses (aliased `i18nT`) for the footer button. VTID-03705 moved
// that button from `screens.common.done` (a confirm) to
// `screens.common.close` (a dismissal); both are mapped so a regression back
// to the confirm wording fails on the assertion rather than on a missing mock.
vi.mock('@/lib/i18n-toast', () => ({
  t: (key: string) => {
    if (key === 'screens.common.close') return 'Close';
    if (key === 'screens.common.done') return 'Done';
    return key;
  },
}));

import { LanguageToggleButton } from './language-toggle-button';
import { languageOptions } from '@/contexts/LanguageContext';

const GA_ENDONYMS = [
  'Deutsch',
  'English',
  'Español',
  'Srpski',
  'Français',
  'Português (BR)',
  'Русский',
  'Polski',
];

// "Português (BR)" contains regex metacharacters — unescaped, `(BR)` is a
// capture group and the pattern silently looks for "Português BR", which
// matches nothing. Escape before building the matcher.
const exact = (s: string) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

// Opens the drawer and waits for its content to be present. vaul renders
// through a portal and may not mount synchronously with the click, so this
// uses `findBy*` (async, retrying) rather than a bare `getBy*`.
async function openDrawer() {
  render(<LanguageToggleButton />);
  fireEvent.click(screen.getByRole('button', { name: 'Sprache wählen' }));
  await screen.findByText('Choose your language');
}

describe('landing-page language picker', () => {
  beforeEach(() => {
    setSelectedLanguage.mockClear();
    currentLanguage = 'de-DE';
  });

  it('trigger shows the current language name and a globe icon, not a flag', () => {
    currentLanguage = 'en-US';
    render(<LanguageToggleButton />);
    const trigger = screen.getByRole('button', { name: 'Sprache wählen' });
    expect(trigger.textContent).toContain('English');
    // Flags only appear inside the drawer's row list, not on the trigger —
    // the trigger's own icon is a fixed globe glyph (an inline SVG from
    // lucide-react), not a per-language <img>.
    expect(trigger.querySelector('img')).toBeNull();
  });

  it('opens a drawer with a title and subtitle explaining what it does', async () => {
    await openDrawer();
    expect(screen.getByText('Choose your language')).toBeTruthy();
    expect(
      screen.getByText('Vitana will speak and respond in this language.'),
    ).toBeTruthy();
  });

  it('offers every GA language, not just German and English', async () => {
    await openDrawer();
    for (const name of GA_ENDONYMS) {
      expect(screen.getByRole('option', { name: exact(name) })).toBeTruthy();
    }
    // The count is asserted too: listing the eight above would still pass if a
    // ninth appeared, and a locale showing up here that is not GA would mean
    // the ?i18n-preview filter had been bypassed.
    expect(screen.getAllByRole('option')).toHaveLength(GA_ENDONYMS.length);
  });

  it('switches to Spanish when Spanish is chosen', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('option', { name: /Español/ }));
    expect(setSelectedLanguage).toHaveBeenCalledWith('es-ES');
  });

  it('switches to French when French is chosen', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('option', { name: /Français/ }));
    expect(setSelectedLanguage).toHaveBeenCalledWith('fr-FR');
  });

  it('reaches a language that the old DE<->EN toggle could not', async () => {
    // The regression guard proper. Under the old component every click
    // produced 'en-US' or 'de-DE' and nothing else, so this assertion is the
    // one that fails if anyone reintroduces a two-way toggle.
    await openDrawer();
    fireEvent.click(screen.getByRole('option', { name: /Polski/ }));
    const [[picked]] = setSelectedLanguage.mock.calls;
    expect(picked).toBe('pl-PL');
    expect(['de-DE', 'en-US']).not.toContain(picked);
  });

  it('marks the active language as selected, with a checkmark, rather than offering it blindly', async () => {
    currentLanguage = 'fr-FR';
    await openDrawer();
    const frenchOption = screen.getByRole('option', { name: /Français/ });
    const germanOption = screen.getByRole('option', { name: /Deutsch/ });
    expect(frenchOption.getAttribute('aria-selected')).toBe('true');
    expect(germanOption.getAttribute('aria-selected')).toBe('false');
    // The checkmark (lucide Check, rendered as an inline SVG) is the new,
    // explicit selection affordance the full-screen picker adds on top of
    // aria-selected — assert it's present only on the current row.
    expect(frenchOption.querySelector('svg')).not.toBeNull();
    expect(germanOption.querySelector('svg')).toBeNull();
  });

  // VTID-03705 — INVERTED deliberately. This used to assert that picking a
  // language left the drawer open behind a "Done" button. That is the
  // behaviour that was reported as bad UX: the choice had already been
  // applied, but leaving the sheet open made it look pending, so people
  // pressed a second button to confirm something already done. Picking is
  // now committing.
  it('selecting a language closes the drawer — picking IS committing', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('option', { name: /Español/ }));
    // See the note below on why this asserts data-state rather than DOM
    // removal: in jsdom the node never unmounts either way.
    await waitFor(() => {
      expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('closed');
    });
  });

  it('applies the language on the same tap that closes it', async () => {
    // The close must not race the commit — if the drawer shut without the
    // selection landing, the picker would look like it silently did nothing.
    await openDrawer();
    fireEvent.click(screen.getByRole('option', { name: /Español/ }));
    await waitFor(() => {
      expect(setSelectedLanguage).toHaveBeenCalledWith('es-ES');
    });
  });

  // vaul only actually unmounts the drawer's DOM node after its own exit
  // CSS transition finishes — an event jsdom never fires, so the node stays
  // in the document (with data-state flipped to "closed") no matter how
  // long a test waits for it to disappear. Assert on the documented
  // open/closed contract (the `role="dialog"` element's `data-state`
  // attribute, which vaul/Radix update promptly) instead of DOM removal.
  // VTID-03705 — the footer is now a plain dismissal ("Close"), not a
  // confirm ("Done"): someone who opens the picker and decides to keep their
  // current language still needs a way out that does not depend on a
  // swipe-down gesture.
  it('closes when the dismiss button is pressed, without changing the language', async () => {
    await openDrawer();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(setSelectedLanguage).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('closed');
    });
  });

  it('closes on Escape, so the picker cannot trap a visitor on the first screen', async () => {
    await openDrawer();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.getByRole('dialog').getAttribute('data-state')).toBe('closed');
    });
  });

  it('keeps the picker in step with the GA list instead of hardcoding it', async () => {
    // Guards the drift this programme has already paid for twice (picker vs
    // supported_locales, translator rule vs checker rule). If a locale is
    // promoted to `ga` and this component does not show it, that is the bug.
    const gaCount = languageOptions.filter((o) => o.status === 'ga').length;
    await openDrawer();
    expect(screen.getAllByRole('option')).toHaveLength(gaCount);
  });
});
