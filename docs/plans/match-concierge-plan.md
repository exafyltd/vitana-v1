# Match Concierge Plan — Celebration, Trust, and Activity Autopilot

> **Status:** Planning · Draft · Branch `claude/match-celebration-notifications-4z4mt`
> **Scope:** vitana-v1 (frontend) + vitana-platform (backend)
> **Owner:** TBD
> **Last updated:** 2026-05-07

---

## Why this plan exists

Today, when a user presses the "interest" button on an intent and a match is
created, the celebration moment is **missing**. The user reported:

> "I just got a match when I pressed the interest button and then nothing
> happened."

A toast fires, a list refreshes, and that's it. There is no "It's a match"
moment, no clear path to *where* the match now lives, no proactive AI
guidance toward actually doing the activity together, and no trust-building
step that helps the matched users feel confident the fit is right.

Vitana is a **longevity community organised around shared activities**. The
magic isn't the match itself — it's **the rep**: the hike that actually
happened, the salsa class both showed up to, the cold plunge that wouldn't
have happened alone. The platform's job is to eliminate every reason the rep
wouldn't happen and to keep it recurring and progressing.

This plan defines the journey from match-detection → activity-completion,
with the AI as the **proactive concierge** that orchestrates each step.

---

## Current state (research summary)

### Backend — `exafyltd/vitana-platform`

The match-creation pipeline is largely in place.

- **`POST /api/v1/intents`** — `services/gateway/src/routes/intents.ts`
  classifies the intent, inserts into `user_intents`, then immediately calls
  `computeForIntent()` to find counterparties. For matches with `score ≥ 0.7`,
  it calls `notifyMatchSurfaced()` for the top matches.
- **`intent_matches` table** — pairs `intent_a_id` / `intent_b_id`, with
  fields: `vitana_id_a`, `vitana_id_b`, `kind_pairing`, `score`,
  `compass_aligned`, `state`, `created_at`, `updated_at`. Lifecycle states:
  `viewed_by_a/b` → `responded_by_a/b` → `mutual_interest` → `engaged` →
  `fulfilled` / `declined` / `closed`.
- **`GET /api/v1/intent-matches/incoming|outgoing`** — list endpoints
  enriched with counterparty profile data via
  `enrichMatchesWithCounterpartyProfiles()`.
- **`POST /api/v1/intent-matches/:id/state`** — lifecycle transitions. When
  both parties respond, state auto-flips to `mutual_interest`, which:
  - calls `tryUnlockReveal()` (identity reveal for `partner_seek` etc.),
  - calls `notifyMutualInterest()` (high-priority bilateral push),
  - auto-seeds a `chat_messages` thread.
- **Notifications** — `services/gateway/src/services/notification-service.ts`
  + `intent-notifier.ts`. Transports: FCM + Appilix native push. In-app
  records in `user_notifications`. Notification types relevant to matching:
  `intent_match_found_for_dictator`, `intent_lead_for_counterparty`,
  `intent_mutual_interest`, `intent_partner_reciprocal_revealed`,
  `intent_throttled`, `intent_compass_change_resurface`. Throttling is a
  per-kind 24h sliding window in-memory.
- **No realtime** — REST poll only. No websockets / SSE on match events.

### Frontend — `exafyltd/vitana-v1`

Web app (Vite + React + shadcn/ui). All celebration infra is installed but
unused for this flow.

- **Interest action lives across** `src/pages/IntentBoard.tsx`,
  `src/pages/community/FindPartner.tsx`, `src/pages/MyIntents.tsx`,
  `src/pages/IntentMatchDetail.tsx`. Cards: `IntentCard`, `IntentMatchCard`,
  `FindPartnerMatchCard`, `PeopleMatchCard`, etc.
- **What happens today on press** — API call → `notify('toasts.xxx')`
  (sonner) → list refresh. No modal, no animation, no clear navigation to
  the match.
- **Available, unused infra**: `canvas-confetti` ^1.9.4, `framer-motion`
  ^12.23.24, `sonner` ^1.7.4, Radix `Dialog`. Firebase ^12.9.0 installed but
  web-push handlers not visible.
- **`MatchNotificationBadge`** exists; no Notification Center / Inbox screen
  behind it yet.
- **Match surfaces**: `Matchmaking.tsx` (placeholder hub), `FindPartner.tsx`
  (dance/fitness), `IntentMatchDetail.tsx` (per-match drill-down). Not
  consolidated.

### What is missing (the gap this plan fills)

1. The **celebration moment** at `mutual_interest` — no animation, no modal.
2. A **trust handshake** that helps both users understand *why this is a
   good fit* before they commit to meeting.
3. An **AI-generated Activity Plan** that proposes the concrete next rep
   (when, where, equipment, weather, route) within seconds of the match.
4. A **clear home for confirmed matches** (the matches hub / inbox).
5. A **progression loop** that turns one rep into a recurring habit and
   tracks the longevity arc over weeks/months.

---

## Core principle

**The match parameters already define ~80% of the activity.** Kind, level,
time window, radius, duration, goal, constraints — these are all in the
intent. The AI's job is to **fill the last 20%** (specific time, specific
venue, equipment list, weather, route, post-activity ritual) and **propose a
complete, 1-tap-confirmable plan within seconds of the match.**

The Plan Card *is* the celebration. Confetti is fine for half a second, but
the dopamine hit that actually retains a longevity user is: **"holy crap,
the whole thing is already organised for me."**

---

## The journey, end to end

```
[1] mutual_interest detected
        ↓
[2] Celebration micro-moment   (~2 seconds)
        ↓
[3] 🤝 Trust Handshake panel    (opt-in chips, bidirectional consent)
        ↓
[4] 🤖 ActivityPlanCard         (AI-generated, posted into auto-seeded chat)
        ↓
[5] Both ✓                     (calendar + reminders + logistics auto-set)
        ↓
[6] Activity happens           (lightweight presence + Do-Not-Disturb mode)
        ↓
[7] AI proposes next rep        (recurrence / progression / expansion)
        ↓
[8] Longevity arc tracked       (consistency, progression, group cohesion)
        ↓
   loop back to [4] for the next rep
```

---

## Phase 1 — The Celebration Moment (~2 seconds)

The smallest, highest-impact deliverable. Replaces the current silent toast.

**Trigger:** the response from `POST /api/v1/intent-matches/:id/state`
returns `state: 'mutual_interest'` (either user just became the second to
respond).

**Sequence (~2 seconds total):**

1. Interest button squashes + bounces (framer-motion spring).
2. Full-screen overlay fades in (Radix `Dialog` + blurred backdrop).
3. `canvas-confetti` burst from centre, soft.
4. "It's a Match!" headline drops in with spring + scale, gradient text.
5. Two avatars slide in from left/right, meet in middle with a heart pulse.
6. One subtitle line: *"You and Maya both want to learn salsa."*
7. Three CTAs animate up:
   - **Tell me more about Maya** → opens Trust Handshake panel (Phase 2).
   - **See the plan** → opens ActivityPlanCard (Phase 3) in the chat.
   - **Keep browsing** → closes overlay (the plan is still in chat).

**Reduced motion:** respect `prefers-reduced-motion`. Skip confetti, fade in
a static "🎉 It's a match" card over 600ms.

**Files to add / touch (vitana-v1):**

- new `src/components/match/MatchCelebrationModal.tsx`
- new `src/components/match/useMatchCelebration.ts` (context + trigger hook)
- new `src/components/match/MatchCelebrationProvider.tsx` (mount once at root)
- edit `src/App.tsx` — wrap in `<MatchCelebrationProvider>`
- edit interest-button call sites (`IntentMatchCard`, `FindPartnerMatchCard`,
  any other) — after API resolves with `mutual_interest`, call
  `celebrate(match)` from the hook.

**Backend touches:** none for Phase 1. Existing response shape suffices.

---

## Phase 2 — The Trust Handshake (build the fit-confidence)

The beat between the spark and the commitment. Without it, the
ActivityPlanCard feels like a blind date with logistics. With it, both
people walk into the activity already knowing *why this person, why this
fit*. Directly attacks the #1 longevity-activity killer: flake rate.

### Voice
**Like a mutual friend doing an introduction** — warm, specific,
intent-relevant. Never gossipy, never reveals what either party didn't
consent to share.

### The 5 trust chips

When the panel opens, the user sees 5 tappable chips. Each expands into a
short, AI-curated paragraph (3–5 lines):

| # | Chip | What it surfaces |
|---|---|---|
| 1 | ✨ **Why I matched you two** | Algorithmic transparency. Plain-language explanation. *"Same level (both beginner), same morning window (Tue/Thu 7–8 am), 1.4 km apart, both wrote 'no pressure, just consistency,' compasses align on calm-energy + outdoor."* |
| 2 | 🪐 **What you have in common** | Cross-profile signals beyond the activity. *"Both listed longevity over performance. Both prefer outdoor over studio. Maya also has a sleep-first compass like yours."* |
| 3 | 📈 **Their activity track record** | (with consent) Reduces flake anxiety. *"Maya has done 12 morning activities in 90 days. Show-up rate: 11/12. First-timer to this class, like you."* |
| 4 | 🎯 **What they're hoping for** | Pulled from their intent text + onboarding goals. *Quotes Maya's own words back, verbatim.* |
| 5 | 💛 **Soft warmth** | (off by default, opt-in both sides) Curated, anonymised, aggregated traits from past partners. *"Past partners describe Maya as punctual, easy-going, quiet in the morning."* |

### The bidirectional consent dance

When user A taps a chip, the AI immediately offers user B the symmetric
exchange:

> "Maya wants to know more about you. She's specifically interested in your
> activity track record and what you're hoping for. Comfortable sharing?
> She's already shared hers."

Tit-for-tat consent. Trust is built mutually, in real time. Nobody feels
surveilled. If user B declines a category, user A sees "Maya kept her track
record private — that's fine, she's new to the platform." Honest. No shame.
No fake data.

### Activity-specific trust signals

For longevity activities, **fit on the activity itself** is what determines
whether the rep actually happens. Per-kind signals (mostly already in the
intent):

| Activity | Trust signal that matters |
|---|---|
| 🥾 Hiking | Average pace, terrain comfort, longest hike done |
| 💃 Dance | Lead/follow, level honestly assessed, music taste overlap |
| 🧊 Cold plunge | Temperature tolerance, longest immersion, breath-protocol experience |
| 🎾 Padel / tennis | Skill rating, playing style, preferred side |
| 🧘 Yoga / meditation | Style (vinyasa vs yin), silence vs talking, props used |
| 🏋️ Strength | Volume, splits, recovery preference |
| 🚶 Walking meeting | Pace target, talk-vs-listen ratio, distance tolerance |

### The "first-timer empathy" moment

When both are first-timers in this specific activity, lead with that:

> "✨ Neither of you has done this before. You're going to be each other's
> first time. First-timers tend to stick together longer on Vitana."

One insight. Reframes nervousness as shared adventure. Costs nothing. Hits
hard.

### Privacy guardrails (non-negotiable)

| Rule | Why |
|---|---|
| Symmetry: nobody can see more about the other than they themselves shared | Prevents one-sided surveillance |
| Off by default for sensitive categories (track record, partner sentiment) | Explicit opt-in once at onboarding |
| No identity reveal beyond what intent kind allows | `partner_seek` privacy logic still rules |
| No data from outside the match scope | Stays within Vitana |
| No biomarker / health data without explicit cross-consent per match | Health data is uniquely sensitive |
| AI summarises only — never quotes another user's chats / notes | Conversation privacy |
| Dismissing the panel still lets the plan card load | Trust building is optional, never gating |
| Aggregated traits require ≥ 3 ratings (k-anonymity floor) | No de-anonymisation by inference |

### Implementation

**Backend (vitana-platform):**

1. `GET /api/v1/matches/:id/insights` — returns the 5 chips for the
   requesting user. Each chip carries `consent_state`:
   `shared` / `pending_other` / `private` / `opted_out`. Underlying data
   structured; LLM generates the prose layer.
2. `POST /api/v1/matches/:id/insights/request` — request a category from
   counterparty, triggers their consent prompt.
3. **Show-up rate** — derived from `intent_match_events` (proposed →
   completed). Computed on the fly. No new table needed.
4. **Partner sentiment** — new lightweight table
   `activity_completion_feedback (match_id, rater_vitana_id, ratee_vitana_id,
   traits[], created_at)`. Closed-list traits (punctual / chatty / quiet /
   easy-going / focused / playful / etc.). Aggregated only when ≥ 3 ratings
   exist.
5. **Consent toggles** — extend `user_notification_preferences` (or new
   `user_disclosure_preferences`) with one row per category × opt-in state.

**Frontend (vitana-v1):**

1. `<TrustHandshakePanel>` — appears between celebration modal and
   ActivityPlanCard. 5 chips, expand-on-tap.
2. `<ConsentRequestToast>` — drops in when counterparty requests a category.
3. `<DisclosureSettings>` — onboarding step + settings page. Per-category
   opt-in.
4. ActivityPlanCard subtitle weaves chips inline: *"Both first-timers ·
   matching pace · same morning window."*

---

## Phase 3 — The Activity Concierge & ActivityPlanCard

The AI as a proactive autopilot for shared longevity reps.

### What the AI infers vs. asks

The AI runs a gap analysis at match time:

| Already known from intent params | AI fills in | Asks group only if ambiguous |
|---|---|---|
| Activity kind, level, time window, radius, goal, recurrence preference, dietary / mobility / no-alcohol / morning constraints, companion preference (1:1 or group) | Specific date/time within both windows, venue, route, weather, equipment list, cost, transit time, pre/post ritual | "Tuesday 7:30 or Thursday 7:30?" — single trade-off question, never an open-ended one |

**Rule:** the AI **never** opens with *"what would you like to do?"* It
opens with *"here's the plan, ✓ or edit?"*

### Voice & tone of the Plan Card

Decisive, concrete, skip-able. Not chatty. Always: *here's the plan,
override if you want.*

### Examples per activity kind

**🥾 Hiking match**
> "Saturday sunrise looks great for both of you. **Plan:** *Müggelberge
> loop, 5.2 km, moderate, 90 min*. Trailhead 5:48 am, sun rises 6:14.
> Forecast 14 °C, dry. Checklist: 1 L water, layer, snack, headlamp (first
> 20 min). Pin sent. **✓ Confirm** / Pick another day"

**💃 Salsa match**
> "Both of you said beginner, Tue/Thu nights. **Plan:** *Beginner social at
> Havana Berlin, Tue 8 pm, free before 9.* I'll send a 10-min mobility
> warm-up 30 min before. **✓ Lock it in** / See alternatives"

**🧊 Cold plunge match**
> "You both targeted 5–6 min at 8 °C. **Plan:** *Lake Plötzensee, Sun 7 am,
> water temp 7.4 °C this week.* Bring towel + wool socks + warm drink. I'll
> start the breath protocol in-app 5 min before entry. **✓** / Next weekend"

**🎾 Padel (4-person group)**
> "You're 4 with overlapping Sat morning availability. **Plan:** *Padel
> Spot, court 3, Sat 10 am, 60 min, €12 each.* I split the bill via
> everyone's preferred method. Skill matrix balances the doubles teams.
> **✓ Book** / Reshuffle teams"

**🧘 Breath work / meditation**
> "Group of 3, all listed Sun morning. **Plan:** *Wim Hof guided round,
> Park am Gleisdreieck, Sun 9 am, 25 min.* I'll lead the timer + cue rounds
> in-app so you can keep eyes closed. Bring a blanket. **✓**"

**🏋️ Outdoor strength (recurring)**
> "You both want 3×/week consistency. **Plan I propose:** *Tempelhof
> calisthenics bars, Mon/Wed/Fri 6:30 am, 35 min, pull/push split.* I'll
> auto-roll the booking weekly until one of you opts out. **✓ Auto-pilot 4
> weeks** / Just this week"

### Autopilot levels (user controls trust)

| Level | Behaviour | Default for |
|---|---|---|
| **Suggest** | AI proposes, both must tap ✓ | All new matches |
| **Auto-confirm** | AI auto-confirms within agreed parameters (time window, budget, radius); just notifies | After 3 successful reps with same group |
| **Full autopilot** | AI books, pays, schedules, even invites compatible third parties | Power users, opt-in only |

Per-group dial. Trust earned, not assumed.

### Implementation

**Backend (vitana-platform):**

1. New table `activity_plan` —
   `(plan_id, match_id, kind, when, where_geo, equipment[], cost, route_data, status, confirmations[], created_at, updated_at)`.
2. `POST /api/v1/activity-plans/generate` — given a `match_id`, the AI
   (Gemini or Claude) generates the plan card. Tool layer required:
   - weather lookup
   - geocoding + venue search (per kind)
   - group calendar intersection
   - per-kind equipment templates
   - payment-split adapter
3. New table `activity_plan_events` —
   `(event_id, plan_id, event_type, actor_vitana_id, payload, created_at)`.
   Lifecycle: `proposed` → `confirmed` → `completed` → `recurred` →
   `progressed`. Powers the longevity ladder.
4. `POST /api/v1/activity-plans/:id/next` — given a completed plan, propose
   the next rep with progression logic.
5. **Recurrence + auto-confirm engine** — scheduled job, respects per-group
   autopilot level.

**Frontend (vitana-v1):**

1. `<ActivityPlanCard>` — hero component, posted into chat. Per-activity-kind
   theming (icon, accent colour, equipment chip strip). Single ✓ /
   edit / regenerate.
2. `<ConciergePanel>` — sidebar / section in match detail showing the plan,
   weather, route map, equipment, countdown.
3. `<ConciergeNudge>` — proactive between-rep messages in chat ("Same time
   next week?", "Try Müggelberge instead?", "Anders fits this group —
   invite?").
4. `<AutopilotSettings>` — per-group dial.

---

## Phase 4 — The Longevity Progression Ladder (the long arc)

A single rep is good. **The AI's job is the curve, not the dot.** After
every confirmed activity, the concierge proposes progression on the next
loop:

| Week | Concierge proactive move |
|---|---|
| 1 | Just do the rep. Don't ask about more. |
| 2–3 | "Same time next week?" — 1-tap recurrence. |
| 4 | Suggest a small variation (new trail, new venue, slightly longer). |
| 6 | "Want to invite a 3rd? Anders matches this group's level." |
| 8 | Progression: harder route / longer plunge / next dance level. |
| 12 | Quarter recap: consistency %, biomarker delta if wearable connected, group cohesion score. Suggest a complementary activity kind (mobility to balance heavy lifting, etc.). |

This is the longevity loop. It's also the retention loop, by accident.

### Frontend deliverables

- `<ProgressionLadder>` — timeline component on a recurring group's page.
  Reps stacked vertically. Each rep is one tile. Progression deltas
  highlighted.
- Profile **Garden** — every fulfilled rep = a flower / leaf in a personal
  visual. Activity kinds = species. Annual recap card.

---

## Phase 5 — The Matches Hub & Notification Centre

Today, matches are spread across `Matchmaking.tsx`, `FindPartner.tsx`, and
`IntentMatchDetail.tsx`. Consolidate.

### `/matches` (or upgrade `/comm/matchmaking`)

Three tabs reflecting backend state:

1. **🔥 New** — `viewed_by_*` or `responded_by_*` (one-sided, awaiting
   response). Sub-grouped: *They're interested in you* / *You showed
   interest*.
2. **✨ Mutual** — `mutual_interest | engaged` — the real matches with chat
   threads. The hero list.
3. **📜 History** — `fulfilled`, `closed`, `declined`. With reason if
   available.

Each row → `IntentMatchDetail` (existing).

**Empty states with personality:**

- New tab: *"Nothing brewing yet — drop an intent on the board 👇"*
- Mutual tab: *"Your first 🍾 moment is coming. Keep showing interest."*

### `/notifications` — the inbox

Repurpose `MatchNotificationBadge` as the bell. Tap → `/notifications`.

- Tabs: All / Matches / Messages / System.
- Each row: avatar, title, snippet, time-ago, unread dot, tap → deeplink.
- Backed by `GET /api/v1/notifications` (confirm exists; add if not).
- `useNotifications()` hook with 30s poll while tab visible (until SSE).
- Mark-as-read on tap → `POST /api/v1/notifications/:id/read`.

### Backend gaps for Phase 5

1. `GET /api/v1/notifications` — list + paginate `user_notifications` for
   the current user (verify exists).
2. `POST /api/v1/notifications/:id/read` — flip `read_at`.
3. **Push deeplinks** — confirm `intent_match_found_for_dictator` push
   payload includes `deeplink` to `/intents/match/:id`. If not, add in
   `notification-service.ts`.
4. **Realtime (later, optional):** SSE on `/api/v1/notifications/stream`.
   Polling at 30s is fine for v1.

---

## Phase 6 — The Joint Moment (making the rep itself unforgettable)

Not polaroids, not romantic time capsules. **The fact that the rep
happened, easily, and got better each time.** A few small touches that
define Vitana's identity:

1. **"You're both here ✨"** — geofence + time-window detection. Both
   phones soft-vibrate and play one shared chime when both are at the
   planned location. Two seconds. Costs nothing. Feels like fate.
2. **The Compass moment** — within ~50 m but not yet visually found, both
   phones briefly show a heart-compass pointing at each other, distance
   shrinking. Prevents 5 minutes of *"where are you?"* texting.
3. **Do-Not-Disturb / "you're with them" mode** — app detects the rep is
   happening and goes quiet. Notifications muted. A discreet floating
   "📷 capture a moment" button. Says: *we trust this, we won't interrupt
   it.*
4. **Live shared playlist** (for activity intents) — collaborative
   playlist they both add to during the activity. Saved as the rep's
   soundtrack. Replayable.
5. **The Whisper** (opt-in, end of rep) — each phone offers a 30-second
   voice memo prompt: *"how did it feel?"* Recorded privately. Only
   revealed if both record one. Mutual vulnerability.

---

## Phase 7 — Web push (off-tab reach)

Backend already sends FCM. The web app needs:

1. Service worker registration for FCM web push.
2. **Contextual** push prompt on first match interaction (not on app load):
   *"Want a 🔔 when someone matches you back? You won't miss your next
   🍾."*
3. Service-worker click handler → focus app → open `/intents/match/:id`.

---

## Suggested rollout

| # | Repo(s) | Effort | Impact |
|---|---|---|---|
| **1** | `MatchCelebrationModal` + provider + wire to interest button | vitana-v1 | S | 🔥🔥🔥 instant joy, the gap the user just felt |
| **2** | `<ActivityPlanCard>` + `/api/v1/activity-plans/generate` (LLM + minimal tools) | both | M | 🔥🔥🔥 the autopilot promise |
| **3** | `<TrustHandshakePanel>` + `GET /api/v1/matches/:id/insights` (chips 1, 2, 4 first; 3 + 5 require consent infra) | both | M | 🔥🔥 fit-confidence, anti-flake |
| **4** | `/matches` hub (3 tabs) + `/notifications` centre + bell badge polling | vitana-v1 + small backend GET | M | 🔥🔥 *"where are they?"* answered |
| **5** | `<ConciergeNudge>` (recurrence, "same time next week?") + `activity_plan_events` + progression ladder | both | M | 🔥 the long arc |
| **6** | Web push (FCM service worker) | vitana-v1 | M | 🔥 off-tab reach |
| **7** | Joint-moment touches (geofence, Compass, DND mode, Whisper) | both | L | identity-defining, ship after core works |
| **8** | Realtime SSE | vitana-platform | L | nice-to-have once polling proves limiting |

### First slice (the single proof of concept)

> Match happens → 2-second celebration → Trust Handshake panel offers 3
> chips (Why I matched you / What you have in common / What they're hoping
> for) → user taps one, AI generates a warm 3-line summary → ActivityPlanCard
> arrives in chat with a real venue, real time, real equipment list, and a
> single ✓ button. Both tap. Calendar invites land. Reminder fires day-of.

Everything else is built on this primitive once it's solid.

---

## Open questions

1. **LLM choice** for plan card + trust chips — Gemini (already used by
   matchmaker) or Claude? Latency target: card visible in chat within 5 s
   of `mutual_interest`.
2. **Venue data** — which provider for the per-kind venue lookup? Google
   Places? Local curated list per city? Open Street Map?
3. **Calendar adapter** — ICS download initially, or Google/Apple
   integration day 1?
4. **Consent UX for sensitive chips** — single onboarding question per
   category, or per-match prompt? Recommend onboarding-once with a quiet
   "you can change this in settings".
5. **First-timer empathy detection** — does
   `activity_completion_feedback` exist for the activity kind yet, or do we
   bootstrap from `intent_matches` history?
6. **Throttling for ActivityPlanCard regeneration** — how many times can a
   user ask the AI to regenerate a plan before falling back to manual?

---

## Non-goals (for this plan)

- Replacing the existing matchmaker (Gemini D12 layer). The concierge
  consumes its output.
- Building a generic chat product. The auto-seeded thread is the surface;
  the concierge is the value.
- Group-of-N orchestration beyond 4 in v1. Doubles padel / triples breath
  work yes; large events later.
- In-app payments infrastructure. Concierge can split costs via existing
  payment links / external rails first.

---

## Glossary

- **Intent** — a user's posted desire to do something with someone. Has a
  *kind* (`activity_seek`, `partner_seek`, `learning_seek`, etc.).
- **Match** — pairing of two intents in `intent_matches`. Becomes a
  *mutual interest* once both parties respond positively.
- **Rep** — a single completed instance of the shared activity.
- **Concierge** — the AI agent that proposes plans, runs logistics, nudges
  recurrence, and tracks the longevity arc.
- **Compass** — Vitana's user-values profile, used in matching and surfaced
  in the trust handshake's chip 2.
- **Garden** — the per-user visualisation of completed reps over time.
