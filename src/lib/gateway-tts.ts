/**
 * BOOTSTRAP-FRONTEND-TTS-POLLY — route frontend speech through the gateway.
 *
 * WHY THIS EXISTS
 *
 * `useTextToSpeech.ts` and `VoiceSettingsPanel.tsx` called two Supabase edge
 * functions directly — one for Google's Chirp 3 HD voices, one for its
 * Standard/Wavenet voices. Both reach Google Cloud, which was decommissioned
 * on 2026-08-16 when GCP billing was disabled. Since then every cloud-TTS
 * request from the app has failed: silence, or an error toast.
 *
 * (Their names are deliberately not written out anywhere in this file. The
 * tree-wide guard in the sibling test forbids those literals in any non-test
 * source file, and a rule that bans the string outright is stronger than one
 * that tries to tell a comment from a call.)
 *
 * The gateway already solved this. `POST /api/v1/orb/tts` runs Polly-first
 * (VTID-03495) and returns MP3. It is `optionalAuth`, so it serves signed-in
 * and anonymous callers alike. This module points the frontend at it instead
 * of standing up a second, parallel TTS implementation:
 *
 *   - A new Supabase edge function would need AWS credentials inside Supabase
 *     — a whole new secret surface — to reach a Polly the gateway task role
 *     can already call.
 *   - Two implementations drift. CLAUDE.md ALWAYS 9 says prefer the existing
 *     system, and §2c already names this frontend bypass as the live gap.
 *
 * THE TABLE THAT IS DELIBERATELY NOT HERE
 *
 * This module does NOT know which languages Polly can speak, and that is on
 * purpose. Serbian has no Polly voice in any engine, but encoding that here
 * would create a SECOND copy of provider capability that has to be kept in
 * sync with `POLLY_UNSUPPORTED_LANGS` in the gateway. That exact pattern —
 * the same table copied into several modules, then quietly diverging — is
 * VTID-03644, where five copies of a language-name map drifted and three of
 * them told the model to speak English.
 *
 * Instead the gateway is the single authority: ask it, and treat a failure as
 * "this language is not servable, fall back to the browser." If Serbian ever
 * gains a voice behind that same seam, this file needs no change at all.
 *
 * The cost of that choice is one wasted round trip per unservable language,
 * which `unservableLangs` below caps at one per page load rather than one per
 * utterance.
 */

import { supabase } from '@/integrations/supabase/client';

const GATEWAY_URL =
  (import.meta.env.VITE_GATEWAY_URL as string | undefined) ||
  'https://gateway.vitanaland.com/api/v1';

export interface GatewayTtsResult {
  /** Base64 audio, ready for a `data:` URL. */
  audioB64: string;
  /** MIME type as reported by the gateway — never assumed. */
  mime: string;
  /** Resolved voice id, for logging. */
  voice: string;
  /** 'Polly' when Polly served it. */
  voiceType: string;
}

/**
 * Languages this session has already proven the gateway cannot serve.
 *
 * Module-scoped rather than per-hook so every caller shares one answer, and
 * reset on reload so a server-side fix (a new provider, an IAM grant) takes
 * effect without anyone clearing anything.
 */
const unservableLangs = new Set<string>();

/** Exported for tests — there is no other way to clear module state. */
export function resetUnservableLangsForTests(): void {
  unservableLangs.clear();
}

/**
 * Normalise the app's `stt_language` ('de-DE', 'sr-RS') to the base tag the
 * gateway expects. The gateway normalises again on its side, so this is
 * belt-and-braces rather than load-bearing — but it keeps the cache key and
 * the log line readable.
 */
function baseLang(input: string): string {
  return (input || 'en').toLowerCase().split(/[-_]/)[0].slice(0, 2) || 'en';
}

/**
 * Synthesize `text` in `lang` via the gateway.
 *
 * Returns null — never throws — when the gateway cannot serve this request,
 * so the caller can fall back to browser speech synthesis. A null here is an
 * ordinary, expected outcome (Serbian today), not an error condition.
 */
export async function synthesizeViaGateway(
  text: string,
  lang: string,
): Promise<GatewayTtsResult | null> {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const base = baseLang(lang);
  if (unservableLangs.has(base)) return null;

  try {
    // optionalAuth on the route: a token is sent when we have one, and its
    // absence is not an error. Failing to READ the session must not fail the
    // request either — hence the catch rather than a bare await.
    let token = '';
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? '';
    } catch {
      /* anonymous is a supported caller */
    }

    const res = await fetch(`${GATEWAY_URL}/orb/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text: trimmed, lang: base }),
    });

    if (!res.ok) {
      // 4xx/5xx here means the gateway could not synthesize it. Cache the
      // refusal so an unservable language costs one round trip per page load
      // instead of one per utterance.
      unservableLangs.add(base);
      console.warn(
        `[TTS] gateway could not synthesize lang=${base} (HTTP ${res.status}) — ` +
          `falling back to browser speech for the rest of this session.`,
      );
      return null;
    }

    const data = await res.json();
    if (!data?.ok || !data?.audio_b64) {
      unservableLangs.add(base);
      console.warn(
        `[TTS] gateway returned no audio for lang=${base} ` +
          `(${data?.error ?? 'no reason given'}) — falling back to browser speech.`,
      );
      return null;
    }

    return {
      audioB64: data.audio_b64,
      // Read the mime off the response rather than hardcoding 'audio/mp3'.
      // The gateway picks the format, and assuming it is the class of bug
      // that made Polly PCM play 1.5x fast when 24kHz was hardcoded against
      // a 16kHz stream (CLAUDE.md §2c).
      mime: data.mime || 'audio/mp3',
      voice: data.voice || 'unknown',
      voiceType: data.voice_type || 'unknown',
    };
  } catch (err) {
    // A transport failure is NOT cached: the network may recover, and marking
    // the language unservable would keep a user on browser TTS for the rest of
    // the session over one dropped request.
    console.warn(
      `[TTS] gateway request failed for lang=${base}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}
