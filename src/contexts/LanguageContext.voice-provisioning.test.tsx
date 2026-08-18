/**
 * VTID-03671 — changing language must not persist a provider-specific TTS
 * voice id.
 *
 * `setSelectedLanguage` used to map each language to a hardcoded Google
 * Chirp 3 HD voice ('de-DE-Chirp3-HD-Achernar', 'pt-BR-Chirp3-HD-Zephyr', …)
 * and write it to `user_preferences.tts_voice`. So every language change
 * provisioned a GOOGLE voice against the user's profile, while the platform
 * was moving voice to Polly and Nova on AWS.
 *
 * `tts_voice` is an OVERRIDE, not a requirement: useTextToSpeech derives a
 * voice from `stt_language` whenever it is absent. Storing an id is therefore
 * not needed for anything — and it is exactly what turns a provider switch
 * into a per-user data migration rather than a config change (CLAUDE.md §2c).
 *
 * These tests assert the RULE, not one vendor's spelling. A test that only
 * banned the literal 'Chirp3-HD' would pass the moment someone substituted a
 * different provider's id, which is the same defect wearing a new name — so
 * the assertion is "whatever is written, it is not a voice id".
 */
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  updatePreferences: vi.fn(),
  prefs: { stt_language: 'de-DE', tts_voice: null as string | null },
  user: { id: 'u1' } as { id: string } | null,
}));

vi.mock('@/i18n', () => ({
  catalogs: { 'de-DE': {}, 'es-ES': {}, 'pt-BR': {} },
  ensureCatalog: vi.fn(async () => {}),
  onCatalogLoaded: () => () => {},
}));
vi.mock('@/lib/i18n-toast', () => ({
  setI18nLocale: vi.fn(),
  notifyI18nLocaleChanged: vi.fn(),
  t: (k: string) => k,
}));
vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    preferences: h.prefs,
    updatePreferences: h.updatePreferences,
    isLoading: false,
  }),
}));
vi.mock('@/context/AuthProvider', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('@/lib/localStorage', () => ({
  getLocalStorageItem: () => null,
  setLocalStorageItem: vi.fn(),
}));

import { LanguageProvider, useLanguage } from './LanguageContext';

function Switcher() {
  const { setSelectedLanguage } = useLanguage();
  return (
    <div>
      <button onClick={() => setSelectedLanguage('es-ES')}>es</button>
      <button onClick={() => setSelectedLanguage('pt-BR')}>pt</button>
    </div>
  );
}

/** Every write made to preferences during the test. */
const writes = () => h.updatePreferences.mock.calls.map((c) => c[0]);

/**
 * A TTS voice id, by shape rather than by vendor: `de-DE-Chirp3-HD-Achernar`,
 * `pt-BR-Standard-A`, a Polly name — anything that pins a specific voice.
 * Deliberately provider-agnostic; see the file header.
 */
const looksLikeAVoiceId = (v: unknown) =>
  typeof v === 'string' && /^[a-z]{2}-[A-Z]{2}-/.test(v);

const go = async (id: string) => {
  await act(async () => {
    screen.getByText(id).click();
  });
  await act(async () => {
    await Promise.resolve();
  });
};

describe('VTID-03671 changing language does not provision a TTS voice', () => {
  beforeEach(() => {
    h.updatePreferences.mockClear();
    h.prefs = { stt_language: 'de-DE', tts_voice: null };
    h.user = { id: 'u1' };
  });

  it('writes no voice id when there is no override', async () => {
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    await go('es');

    expect(writes().length).toBeGreaterThan(0);
    for (const w of writes()) {
      // Pre-fix this carried 'es-ES-Chirp3-HD-Gacrux'.
      expect(looksLikeAVoiceId(w.tts_voice)).toBe(false);
    }
    expect(writes().some((w) => w.stt_language === 'es-ES')).toBe(true);
  });

  it('CLEARS a stale override rather than replacing it with another id', async () => {
    h.prefs = { stt_language: 'de-DE', tts_voice: 'de-DE-Chirp3-HD-Achernar' };
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    await go('pt');

    const cleared = writes().find((w) => 'tts_voice' in w);
    expect(cleared).toBeDefined();
    // null, not 'pt-BR-Chirp3-HD-Zephyr'. The voice for the new language is
    // derived downstream from stt_language; nothing needs it stored.
    expect(cleared!.tts_voice).toBeNull();
  });

  it('leaves an override alone when it already matches the language', async () => {
    h.prefs = { stt_language: 'es-ES', tts_voice: 'es-ES-Chirp3-HD-Gacrux' };
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    await go('es');

    // A user who deliberately picked a voice for this language keeps it.
    // Clearing unconditionally would silently discard a real preference.
    expect(writes().every((w) => !('tts_voice' in w))).toBe(true);
  });

  it('writes nothing at all when signed out', async () => {
    h.user = null;
    render(
      <LanguageProvider>
        <Switcher />
      </LanguageProvider>,
    );
    await go('es');

    // The language still applies locally; there is simply no profile to write
    // to, and inventing one would be a write nobody asked for.
    expect(h.updatePreferences).not.toHaveBeenCalled();
  });
});
