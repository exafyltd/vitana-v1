# 8-Language Parity Plan — target 18 Aug 2026

**VTID-03509** · owner: platform · scope: `exafyltd/vitana-v1` + `exafyltd/vitana-platform`

Release set: **DE, EN, ES, SR, FR, PT, RU, PL**.
Deferred: **AR** (needs RTL layout work), **ZH** (needs CJK font stack). Both stay
`status: 'draft'` in `languageOptions` so they are invisible to users.

---

## 1. What "8 languages" actually means

The UI string catalog is the visible layer, but it is one of **six** independent
surfaces. A language is only at parity when all six are. Shipping the first and
ignoring the rest is what produces "the app is in French but every notification,
voice reply and journey screen is German".

| # | Surface | Where it lives | Fallback when missing |
|---|---------|----------------|----------------------|
| 1 | UI strings | `src/i18n/<loc>/*.json` (14,163 keys) | German |
| 2 | Server strings — push, email, ORB greeting | `services/gateway/src/i18n/locales/<loc>.json` (104 keys) | EN → DE |
| 3 | LLM output — ORB, coach, autopilot | system-prompt directive, `llm-locale.ts` (both repos) | **English** |
| 4 | DB content — journey, nav catalog, plans | `*_i18n` / `*_translations` tables | German |
| 5 | Voice — STT in, TTS out | `useTextToSpeech.ts`, `clientSTT.ts`, Nova/Vertex | varies |
| 6 | Formatting — dates, numbers | `src/lib/locale-format.ts` | German |

---

## 2. Status as of this commit

### Done in VTID-03509

| Item | Before | After |
|---|---|---|
| ES/SR reachable in the app | **0%** — catalogs existed but were unregistered, rendered 100% German | registered + verified shipping as lazy chunks |
| EN catalog | 14,154 / 14,163 | **14,163 / 14,163** |
| Gateway catalog locales | 4 (ES/SR were `{...EN}`, i.e. English) | **8, all natively translated** |
| Approved audit fixes applied | 0 of 1,117 pending | **1,117** (628 DE + 121 ES + 368 SR) |
| Entry-chunk audit bloat | 1,545 KB of audit JSON inlined | moved to `i18n-audit/`, verified gone |
| Edge-function locale resolution | read two columns that **do not exist** → every user forced to German | reads `app_users.locale` → `user_preferences.stt_language` |
| Journey checklist API | rejected `?locale=fr` | accepts all 8 |
| Formatting (surface 6) | already complete for all 10 | ✅ no work needed |

### Remaining, by surface

| Surface | DE | EN | ES | SR | FR | PT | RU | PL |
|---|---|---|---|---|---|---|---|---|
| 1 · UI strings | 100% | 100% | 90.8% | 90.8% | 0%* | 0%* | 0%* | 0%* |
| 2 · Server strings | 100% | 100% | 100% | 100% | 100% | 100% | 100% | 100% |
| 3 · LLM directive | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4 · DB content | source | partial | partial | partial | none | none | none | none |
| 5 · Voice | ✅ | ✅ | ✅ | TTS only | ✅ | ✅ | ✅ | ✅ |
| 6 · Formatting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

\* translation runs are in flight — see §3.1.

---

## 3. Work remaining

### 3.1 UI strings — IN FLIGHT

`i18n-translate.yml` dispatched against this branch for `fr`, `pt`, `ru`, `pl`
(full 14,163-key bootstrap) and `es`, `sr` (top-up of 1,301 keys each, added to
DE/EN after the May bulk translation).

- **Then, per locale:** `gh workflow run i18n-audit-llm.yml -f locale=<x> -f provider=gemini`
  followed by `node scripts/apply-audit-suggestions.mjs --locale=<x>`.
  ES/SR scored 98.9% through this pipeline in May — that is the quality bar.
- **Then:** flip `fr`/`pt`/`ru`/`pl` from `beta` to `ga` in `LanguageContext.tsx`.
  `src/i18n/locale-registration.test.ts` fails a `ga` locale with no real
  catalog, so this cannot be flipped early by accident.

**Watch item:** the auditor does not know about the German 22-char compound rule
and will suggest un-hyphenating. `apply-audit-suggestions.mjs` now vetoes those
(`VETOED_LONG_WORD`), but only for locales in `LONG_WORD_LOCALES`. If any new
locale develops a layout constraint, add it there.

### 3.2 DB content — the largest remaining gap

Not covered by any catalog and not filled by the translation workflow.

| Table | Rows needed | Populated | Blocker? |
|---|---|---|---|
| `journey_checklist_translations` | 254 topics × 6 fields × 6 locales | EN 254, ES 254, **SR 94**, FR/PT/RU/PL 0 | **Yes** — My Journey is core |
| `nav_catalog_i18n` | 291 active entries × 6 locales | DE 291, EN 291, rest 0 | **Yes** — ORB voice navigation |
| `goal_plan_i18n` / `goal_plan_step_i18n` | on demand | DE/EN only | No — translate-on-view, self-populates |
| `content_i18n` | on demand | 3 DE rows | No — `catalog-localizer` cache |

The last two use view-time translation with a cache (VTID-03152b), so they fill
themselves on first view in a new language. The first two are **pre-seeded** and
will silently serve German until rows exist.

- `nav_catalog_i18n` has a seeding script already: `services/gateway/src/scripts/seed-nav-catalog.ts`.
- `journey_checklist_translations` needs a seeding pass; SR is also only 94/254,
  so it is not purely a new-locale problem.

### 3.3 Voice — one real gap

- **STT:** `clientSTT.ts` maps all 8. ✅
- **TTS:** Chirp3-HD voices exist for all 8. **Serbian is the exception** —
  `sr-RS-Standard-B` only, and `services/gateway` §2c records that **Amazon Polly
  has no Serbian voice in any engine**. If `TTS_PROVIDER=polly` is ever flipped,
  Serbian loses TTS entirely. Track with the GCP-shutdown work, not here.
- **ORB conversational voice:** Nova Sonic supports `en/de/fr/es` only; the other
  four fall back to Vertex Live. Works, but worth knowing before promoting Nova.

### 3.4 Deploy

Both repos are staging-first. Merging to `main` reaches **staging only**;
production needs the Command Hub PUBLISH button or a deliberate dispatch.
Budget a verification pass on `preview.vitanaland.com` before publishing.

---

## 4. Suggested sequence to 18 Aug

| When | What |
|---|---|
| now → +2d | translation runs finish; LLM audit per locale; apply auto-confidence fixes |
| +2d | seed `nav_catalog_i18n` for 6 locales; seed `journey_checklist_translations` (incl. SR's missing 160) |
| +3d | flip FR/PT/RU/PL to `ga`; merge both repos to `main` → staging |
| +4d | verify all 8 on `preview.vitanaland.com`: language picker, a push notification, an ORB reply, My Journey, a date |
| +5d | PUBLISH to production |
| slack | buffer for audit re-runs and any layout breakage from text expansion |

---

## 5. Known risks

1. **Text expansion breaks layout.** RU and DE run ~20-30% longer than EN. The
   22-char rule is German-only today; RU/PL compounds may need the same
   treatment. Check the narrow (390px) viewport on the densest screens.
2. **Audit fixes fight product constraints.** See §3.1 — high confidence and
   linguistically correct is not the same as shippable.
3. **`ga` is a promise.** A locale marked `ga` whose catalog is thin gives users
   a half-German UI with no way to tell what happened. The registration test
   guards the extreme case; it does not measure quality.
4. **Nothing alerts on catalog drift.** A key added to DE and not mirrored is
   caught by `npm run i18n:audit` for EN only. Extending that check to all 8
   locales is the cheapest way to keep parity from decaying after launch.
