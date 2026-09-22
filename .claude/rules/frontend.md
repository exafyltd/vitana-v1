---
paths:
  - .env
  - .env.example
  - src/lib/gateway-tts.ts
  - src/hooks/useTextToSpeech.ts
  - src/components/assistant/VoiceSettingsPanel.tsx
---

# Frontend reference — vitana-v1

Moved verbatim out of `CLAUDE.md` on 2026-09-22 (pure relocation, content
unchanged) so a session that never touches these specific files doesn't
force-load build-time env var reference and the TTS/Polly migration note.

---

## Environment

`.env` contains `VITE_*` vars baked at build time (public keys only):
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase connection
- `VITE_GATEWAY_URL` — Backend API (`gateway.vitanaland.com`, AWS ECS since
  VTID-03419; the old `gateway-*.run.app` Cloud Run form is dead — GCP is
  decommissioned, see the Deployment section above)
- `VITE_OPERATOR_BASE_URL` — Operator API
- `VITE_DEV_HUB_ENABLED` — Dev Hub feature flag

### ✅ RESOLVED 2026-08-20 — frontend TTS now goes through the gateway (Polly)

This section previously flagged a live outage: `useTextToSpeech.ts` and
`VoiceSettingsPanel.tsx` called two Google TTS Supabase edge functions
directly, never went through the gateway's Polly migration, and had nothing
to reach once GCP billing went off.

**Fixed.** Both now call `src/lib/gateway-tts.ts` →
`POST {VITE_GATEWAY_URL}/orb/tts`, the gateway's Polly-first route
(`optionalAuth`, so anonymous callers work too).

Three things to know before touching this:

1. **The client no longer names a voice.** The gateway resolves it from the
   LANGUAGE. `tts_voice` is now only the BROWSER-fallback voice — it is not
   read for cloud speech at all. A provider-specific id on the client is what
   turns the next provider switch into a per-user data migration (platform
   CLAUDE.md §2c); VTID-03671 stopped writing them and this stops reading them.
2. **The frontend does NOT know which languages Polly can speak, on purpose.**
   It asks the gateway and treats a failure as "not servable → browser
   speech." A second copy of that table here would drift from
   `POLLY_UNSUPPORTED_LANGS` exactly the way five copies of a language-name
   map drifted in VTID-03644. Cost: one wasted round trip per unservable
   language per page load, capped by an in-module cache.
3. **Serbian still has no cloud voice** and now falls back to browser speech
   rather than erroring. Polly has no Serbian voice in any engine — confirmed
   against the live API 2026-08-20 (106 voices, 42 language codes, no
   `sr`/`hr`/`bs`/`sh`). That is a product gap needing a third provider, not
   a bug in this path.

A tree-wide guard in `src/lib/gateway-tts.test.ts` fails the build if any
non-test source file references those Google edge functions again.

