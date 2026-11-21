/**
 * VTID-05682 (native-wave1-readiness-tests/deeplinks-i18n, L4) — the composed `de`
 * catalog is du-form (CLAUDE.md "Catalog quality": never Sie/Ihr/Ihnen).
 *
 * Capitalised "Sie"/"Ihr…" also occur in du-form German as the third-person plural / "she"
 * ("Sie werden entfernt") and the plural "ihr" ("Ihr seid beide stark"). Those uses are
 * pinned below by key. FINDING F2: `screens.commerceportal.terms.agreeExplanation` is
 * genuine formal address ("bestätigen Sie, dass Sie berechtigt sind") on main; it is
 * recorded in acceptance.md and excluded here, not fixed (no catalog edit in this lane).
 */
import { flatCatalog } from './catalog-utils';

const FORMAL_WORD = /\b(Sie|Ihr|Ihre|Ihren|Ihrem|Ihrer|Ihres|Ihnen)\b/;

/** Not formal address: third person plural / "she", or plural-informal "ihr". */
const NOT_FORMAL = new Set([
  'screens.assistant.languageSettingControlsWhatLanguageText', // "Sie werden … synchronisiert" (the settings)
  'screens.crossover.matchReasonSharedPillar', // "Ihr seid beide stark" (plural informal)
  'screens.memory.archivedItemsHiddenFromRegularViews', // "Sie werden nicht gelöscht" (the items)
  'screens.reminders.theyWillRemovedFromYourList', // "Sie werden von deiner Liste entfernt"
  'screens.wallet.theyLlReceive', // "Sie erhalten:" (they)
  'screens.wallet.theyReceive', // "Sie erhalten:" (they)
  'screens.legal.thankYouForChoosingUseMaxina', // "Sie informiert dich" (the policy)
  'supportTickets.support.voiceBody', // "Sie legt das Ticket … an" (Vitana)
  'toasts.discovery.theyLlNotifiedYourInterest', // "Sie werden … benachrichtigt" (they)
]);
const FINDING_F2 = new Set(['screens.commerceportal.terms.agreeExplanation']);

describe('de is du-form', () => {
  const hits = Object.entries(flatCatalog('de')).filter(([, v]) => typeof v === 'string' && FORMAL_WORD.test(v));

  it('no string uses formal address, apart from the pinned third-person uses and finding F2', () => {
    const unexpected = hits.map(([k]) => k).filter((k) => !NOT_FORMAL.has(k) && !FINDING_F2.has(k));
    expect(unexpected).toEqual([]);
  });

  it('the pinned lists cannot go stale: every entry still matches the word check', () => {
    const keys = new Set(hits.map(([k]) => k));
    for (const k of [...NOT_FORMAL, ...FINDING_F2]) expect(keys.has(k)).toBe(true);
  });

  it('du-form is present: the catalog addresses the member with du/dein', () => {
    const text = Object.values(flatCatalog('de')).filter((v): v is string => typeof v === 'string');
    expect(text.filter((v) => /\b(du|dein|deine|deinen|dir|dich)\b/i.test(v)).length).toBeGreaterThan(100);
  });
});
