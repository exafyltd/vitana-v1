# Vitana Assistant Orb - Status Update & Context-Awareness Roadmap

**Date:** 2026-04-02
**Branch:** `claude/vitana-assistant-orb-guide-DJpf2`

---

## PART 1: CURRENT STATUS (What's Live Today)

### 1.1 Orb Core UI & Animations
- **OrbCore.tsx** - Crystal gradient sphere with dual-layer halo, breathing animations, volume-reactive effects
- **PersistentGuideOrb.tsx** - Persistent floating orb with Cmd/K shortcut, expand/collapse, sound effects
- **CentralGuideOrb.tsx** - Audio-state-aware wrapper (idle, listening, processing, speaking, error)
- Size variants (sm, md, xl), color cycling, scattered particle dots

### 1.2 Authentication Awareness
- **Pre-login:** Orb operates in anonymous/unauthenticated mode with generic promotional speech
- **Post-login:** Full personalized mode - user identity, memory garden access, wallet context, preferences
- Auth token passed to voice client; reinitializes on login/logout transitions
- First-visit-of-day detection triggers expanded welcome experience (authenticated only)

### 1.3 Time Awareness
- Time-of-day greetings (morning/afternoon/evening/night) in 9 languages
- Calendar forecast (next 7 days of events) injected into context
- Timezone-aware via user profile `timezone` field
- Quiet hours enforcement (22:00-08:00 default) for proactive messages

### 1.4 Location Awareness
- Timezone derived from user profile
- Tenant detection from URL path (`/maxina`, `/alkalma`, `/earthlinks`, `/community`)

### 1.5 Proactive Greeting System
- **useIntelligentGreeting** - 6 guard conditions, frequency control (session/daily/hourly/off), cooldowns
- **useProactiveAssistant** - Rate-limited message generation (greeting, reminder, guidance, encouragement, suggestion, check-in)
- **greetingMessages.ts** - Full i18n templates (EN, DE, FR, PT, SR, AR, RU, ZH, ES)
- Contextual greeting content: upcoming appointments, pending actions, health scores, achievements

### 1.6 Memory & Intelligence Integration
- **Memory-first AI policy** - Hard rule: always consult Memory Stats & Catalog before responding
- **buildOrbContext.ts** - Injects top 15 high-confidence memories + last 10 diary entries into voice sessions
- **Dual-path memory search** - Vector (pgvector) + keyword fallback across ai_memory and diary_entries
- **Contradiction detection** - Cross-checks retrieved memories for semantic conflicts
- **Memory stats** - Deterministic counts (aiCount, diaryCount, aiByType, diaryByTag)
- **Memory catalog** - Compact indexed headers for fast AI reference

### 1.7 Economic Context
- Wallet balances (USD, VTNA, CREDITS) always injected into AI context
- Transaction history on wallet-related queries
- Exchange rates on conversion queries

### 1.8 Community Context (Conditional)
- Only injected when conversation mentions community topics
- Scans last 4 messages + current for community keywords
- Includes: upcoming events, user's registrations, groups, matches with compatibility scores, social graph

### 1.9 Orb Visibility & Navigation
- **VitanalandNavigationContext** - Route-based visibility control
- Hidden on: video-player, live-classes, camera-capture, meditation-player, onboarding, payment-checkout, kyc-verification, auth, login, register
- Auto-minimize after 10-15s of no interaction; idle timeout (2.5min) triggers re-expansion

### 1.10 Voice Infrastructure
- **OrbVoiceClient** - REST + SSE, JWT auth, PCM 24kHz, silence detection (1.5s), sequential audio queue
- Multi-language TTS with per-language voice selection
- Session diagnostics for debugging

### 1.11 Admin Controls
- 4-tab admin panel: Personality, Engagement Rules, Templates, Analytics
- Configurable: system personality, max daily proactive, quiet hours, greeting templates per user level

### 1.12 Infrastructure Already In Place (Not Yet Connected)
- **screen-id.ts** - 214 screen IDs registered across all modules (AUTH, HOME, COMM, DISC, HLTH, INBX, AI, WLLT, SHAR, MEMO, SETT, UTIL, PTNT, PROF, STFF, ADMN, DEV)
- **Glass Mode** - Dual-stream screen capture (overview + ROI), cursor tracking, privacy masks
- **Analytics** - `getScreenId()` pathname mapper, impression/click tracking

---

## PART 2: WHAT'S MISSING (The Gap)

| Capability | Status | Gap |
|---|---|---|
| **Screen awareness** | Screen IDs exist but NOT sent to AI | Orb doesn't know which screen user is viewing |
| **Route-to-context mapping** | Route tracking exists in VitanalandNavigationContext | Not translated into semantic context for AI |
| **Screen-specific assistance** | Generic AI responses regardless of screen | No screen-specific prompt augmentation |
| **Screen transition awareness** | Not tracked | AI doesn't know user just came FROM another screen |
| **Glass Mode → AI pipeline** | Glass Mode captures frames but NOT connected to AI chat | Visual context isolated from conversation |
| **Dynamic location** | Timezone only, no geo | No real-time geolocation context |
| **In-app action context** | Activity log exists but NOT in AI context | AI doesn't know what user just did |
| **Scroll/viewport awareness** | Not tracked | AI doesn't know what content user is looking at |
| **Feature discovery** | Not implemented | Orb can't guide user to features on current screen |

---

## PART 3: CONTEXT-AWARENESS FEATURE ROADMAP

### PRIORITY 1: Screen Awareness (The Big One)

**Goal:** The orb knows exactly which screen the user is on and adapts its behavior, greetings, and responses accordingly.

#### Feature 1.1 - Screen Context Provider
- Create `useScreenContext` hook that tracks:
  - `currentScreenId` (e.g., `COMM-002` = Events & Meetups)
  - `currentScreenName` (human-readable: "Events & Meetups")
  - `currentModule` (e.g., "community", "health", "wallet")
  - `previousScreenId` (where user came from)
  - `screenDuration` (how long on current screen)
  - `navigationPath` (last 5 screens visited in order)
- Map all 214 screen IDs to semantic labels and module categories
- Integrate with existing `VitanalandNavigationContext`

#### Feature 1.2 - Screen Context Injection into AI Chat
- Inject a `[SCREEN CONTEXT]` block into the AI system prompt:
  ```
  [SCREEN CONTEXT]
  Current screen: Events & Meetups (COMM-002)
  Module: Community
  Previous screen: Home Overview (HOME-001)
  Time on screen: 45 seconds
  Navigation: HOME-001 → COMM-001 → COMM-002
  ```
- AI uses this to tailor responses (e.g., if user asks "how does this work?" → contextual to events page)

#### Feature 1.3 - Screen-Specific Prompt Augmentation
- Per-module prompt extensions that give the AI domain knowledge:
  - **Wallet screens:** "User is viewing their wallet. You can help with balance inquiries, transfers, rewards..."
  - **Health screens:** "User is viewing health data. You can help interpret biomarkers, suggest supplements..."
  - **Community screens:** "User is browsing community. You can help find events, suggest groups, explain live rooms..."
  - **Memory screens:** "User is in their memory garden. You can help search, organize, or reflect on memories..."
  - **Settings screens:** "User is in settings. You can help configure preferences, explain options..."
- Each module gets a focused capability description so AI knows what it CAN DO on that screen

#### Feature 1.4 - Screen Transition Awareness
- Detect meaningful transitions (e.g., wallet → events = might want to pay for event)
- Track navigation patterns for proactive suggestions
- Inject transition context: "User just navigated from Wallet to Events - may be checking if they can afford an event"

#### Feature 1.5 - Screen-Aware Greetings
- Greeting system uses screen context:
  - On Events page: "I see some great events coming up this week..."
  - On Wallet page: "Your balances are looking good..."
  - On Health page: "Ready to check in on your health journey?"
  - On Memory page: "Want to revisit some memories or add a new diary entry?"
- Replace generic time-of-day greetings with screen-contextual ones when user navigates

---

### PRIORITY 2: Recent Action Awareness

**Goal:** The orb knows what the user just DID, not just where they ARE.

#### Feature 2.1 - Action Context Buffer
- Maintain a rolling buffer of last 10 user actions from `user_activity_log`
- Inject recent actions into AI context:
  ```
  [RECENT ACTIONS]
  2 min ago: Viewed event "Wellness Retreat" (COMM-002)
  5 min ago: Checked wallet balance (WLLT-001)
  8 min ago: Added diary entry tagged "gratitude" (MEMO-003)
  ```
- AI can reference: "I see you just looked at the Wellness Retreat event..."

#### Feature 2.2 - Action-Triggered Proactive Messages
- Specific action patterns trigger contextual offers:
  - User views event 3+ times → "Want me to register you for that event?"
  - User checks wallet after viewing product → "I can help you with the purchase"
  - User writes diary entry → "Beautiful reflection. Want me to extract any insights?"

---

### PRIORITY 3: Feature Discovery & Guided Assistance

**Goal:** The orb helps users discover features on the screen they're currently viewing.

#### Feature 3.1 - Screen Feature Registry
- Map each screen ID to available features/actions:
  ```
  COMM-002 (Events & Meetups): [browse_events, filter_by_date, register, share_event, view_attendees]
  WLLT-001 (Wallet Overview): [view_balances, transfer, redeem_rewards, view_transactions]
  HLTH-001 (Health Overview): [view_pillars, upload_biomarkers, browse_plans, check_score]
  ```
- AI can suggest: "On this screen, you can also filter events by date or share them with friends"

#### Feature 3.2 - Contextual Help Responses
- When user asks "what can I do here?" → AI consults screen feature registry
- When user seems stuck (long dwell time, no actions) → proactive feature suggestion
- First-time screen visits → brief orientation: "Welcome to Live Rooms! Here you can join or create live audio conversations..."

---

### PRIORITY 4: Visual Context Pipeline

**Goal:** Connect Glass Mode's screen capture to the AI conversation.

#### Feature 4.1 - Glass Mode → AI Chat Bridge
- When Glass Mode is active, send captured frames to `analyze-visual-context` edge function
- Inject visual analysis results into AI context
- Enable: "What am I looking at?" queries with real visual understanding

#### Feature 4.2 - Lightweight Screen State Capture
- Without full Glass Mode, capture semantic screen state:
  - Current scroll position (top/middle/bottom)
  - Visible card/list item count
  - Active filters or search terms
  - Selected tabs within a screen
- Inject as structured context (no screenshots needed)

---

### PRIORITY 5: Community Engagement Coaching (Motivational Context)

**Goal:** The orb understands the user's community engagement level and actively motivates them to grow their presence, build a following, and contribute to the community.

**Data already available** (via `fetch-user-context` + hooks):
- Followers count, following count (`user_follow_counts` materialized view)
- Posts count (`profile_posts` table)
- Media uploads count (`media_uploads` table)
- Groups joined & created (`global_community_group_members` with roles)
- Events attended & created (`global_event_participants`, `event_co_creators`)
- Active matches with compatibility scores (`user_matches`)
- User interests (`global_community_profiles.interests`)
- Profile visibility and completeness

#### Feature 5.1 - Community Engagement Snapshot
- Inject a `[COMMUNITY ENGAGEMENT]` block into AI context:
  ```
  [COMMUNITY ENGAGEMENT]
  Followers: 12 | Following: 45
  Posts: 3 | Media uploads: 1
  Groups joined: 2 | Groups created: 0
  Events attended: 5 | Events created: 0
  Active matches: 3 (avg compatibility: 78%)
  Profile completeness: 65%
  Interests: fitness, nutrition, mindfulness
  Member since: 2025-09-15 (6 months)
  Engagement trend: growing (↑ 3 new followers this week)
  ```
- Always available (lightweight), not conditional on community screen

#### Feature 5.2 - Engagement Level Classification
- Classify user into engagement tiers:
  - **Observer** (0-2 posts, <5 followers, 0 groups created) → "Getting started"
  - **Participant** (3-10 posts, 5-20 followers, joined groups) → "Finding your voice"
  - **Contributor** (10+ posts, 20-100 followers, media uploads) → "Building presence"
  - **Leader** (groups created, events hosted, 100+ followers) → "Community builder"
  - **Influencer** (high engagement, multiple groups, regular content) → "Thought leader"
- Tier drives AI coaching tone and suggestions

#### Feature 5.3 - Proactive Community Growth Coaching
- AI uses engagement data to offer specific, actionable advice:

  **For Observers:**
  - "I notice you haven't posted yet - your interests in fitness and mindfulness are shared by 47 community members. A simple post could spark great conversations!"
  - "You have 3 matches with over 80% compatibility. Want me to help you start a conversation?"

  **For Participants:**
  - "You've been engaging with fitness content. Have you considered joining the 'Morning Runners' group? It has 23 active members."
  - "Your last post got 5 likes! Your perspective on nutrition is resonating. Want to share more?"

  **For Contributors:**
  - "You've built a following of 45 people interested in your wellness journey. Have you thought about creating your own group?"
  - "I see you attend events regularly but haven't hosted one yet. With your expertise in mindfulness, a guided session could attract your followers."

  **For Leaders:**
  - "Your group has grown to 30 members this month. Want me to help you plan a community event to keep momentum?"
  - "3 of your followers just uploaded media about their fitness progress inspired by your posts. Want to feature them?"

#### Feature 5.4 - Business & Professional Growth Nudges
- For users with business profiles or professional credentials:
  - "You have coaching credentials in nutrition - 12 community members are looking for exactly this. Want to set up your service offerings?"
  - "Your fitness group has 50+ members. This is a great base to launch a live room session or offer premium content."
  - "I see 3 new people followed you after your last event. Growing your community is the first step to building your wellness business."
- Connect engagement to monetization (wallet, services, events with tickets)

#### Feature 5.5 - Social Graph Intelligence
- Analyze who follows the user vs. who they follow back
- Identify mutual connections and suggest follow-backs
- Spot engagement clusters: "Most of your followers are interested in mental wellness - your fitness content could attract a new audience too"
- Suggest strategic follows: "These 5 community leaders share your interests and following them could increase your visibility"

#### Feature 5.6 - Engagement Streak & Milestone Tracking
- Track community engagement streaks (daily posts, event attendance, group activity)
- Celebrate milestones via orb greetings:
  - "Congratulations! You just hit 50 followers!"
  - "You've posted 3 days in a row - your consistency is building real community presence."
  - "Your event last week had 15 attendees - that's your best turnout yet!"
- Use `pattern_discoveries` table to detect engagement trends

---

### PRIORITY 6: Enhanced Temporal & Spatial Context

#### Feature 6.1 - Dynamic Geolocation Context
- Request location permission (optional)
- Inject city/region into context for location-relevant suggestions
- "There's a community event near you this Saturday..."

#### Feature 6.2 - Session Journey Context
- Track the full session journey (sequence of screens + actions + duration)
- AI understands user's current "mission" (e.g., browsing events → registering → checking wallet = event registration flow)
- Enable: "Looks like you're trying to sign up for an event. Need help?"

#### Feature 6.3 - Time-on-Screen Intelligence
- Track dwell time per screen
- Long dwell = potentially confused or deeply engaged
- Short dwell + rapid navigation = browsing/exploring
- AI adapts tone: detailed help for confused users, quick tips for browsers

---

### PRIORITY 7: Cross-Session Context

#### Feature 7.1 - Session Continuity
- Remember what user was doing in their last session
- "Welcome back! Last time you were looking at the Wellness Retreat event. Want to pick up where you left off?"

#### Feature 7.2 - Behavioral Pattern Surfacing
- Use `pattern_discoveries` table to surface patterns in AI context
- "I've noticed you tend to check your health dashboard on Monday mornings..."
- Enable pattern-aware proactive suggestions

---

## PART 4: IMPLEMENTATION ORDER

| Phase | Features | Impact |
|---|---|---|
| **Phase 1** | 1.1 Screen Context Provider + 1.2 AI Injection + 1.3 Prompt Augmentation | Orb becomes screen-aware overnight |
| **Phase 2** | 1.5 Screen-Aware Greetings + 1.4 Transition Awareness | Greetings feel contextual, not generic |
| **Phase 3** | 5.1 Community Engagement Snapshot + 5.2 Engagement Level Classification | Orb understands user's community standing |
| **Phase 4** | 5.3 Proactive Growth Coaching + 5.4 Business Nudges | Orb becomes a community growth coach |
| **Phase 5** | 2.1 Action Context Buffer + 2.2 Action-Triggered Messages | Orb becomes action-aware |
| **Phase 6** | 3.1 Screen Feature Registry + 3.2 Contextual Help | Orb becomes a guide, not just a responder |
| **Phase 7** | 5.5 Social Graph Intelligence + 5.6 Engagement Streaks | Deep community intelligence |
| **Phase 8** | 4.2 Lightweight Screen State + 6.2 Session Journey | Deep situational awareness |
| **Phase 9** | 4.1 Glass Mode Bridge + 6.1 Geolocation + 6.3 Dwell Intelligence | Full sensory context |
| **Phase 10** | 7.1 Session Continuity + 7.2 Pattern Surfacing | Cross-session intelligence |

---

## PART 5: EXISTING BUILDING BLOCKS

These are already in the codebase and can be leveraged immediately:

| Building Block | File | What It Provides |
|---|---|---|
| 214 Screen IDs | `src/lib/screen-id.ts` | Complete screen identification system |
| Route tracking | `src/context/VitanalandNavigationContext.tsx` | Current route, orb visibility logic |
| Pathname → Screen mapper | `src/lib/analytics-events.ts:getScreenId()` | Basic path-to-name mapping |
| Activity logging | `useActivityHistory` hook | 50+ activity types already tracked |
| Glass Mode | `src/utils/glassMode.ts` + `src/hooks/useGlassMode.ts` | Screen capture infrastructure |
| AI context injection | `supabase/functions/ai-chat/index.ts` | Existing system prompt injection points |
| Proactive context | `supabase/functions/get-proactive-context/index.ts` | Context builder with caching |
| Pattern discovery | `supabase/functions/analyze-patterns/index.ts` | Behavioral pattern detection |
| buildOrbContext | `src/lib/buildOrbContext.ts` | Voice session context builder |
| Mobile bottom nav | `src/components/mobile/MobileBottomNav.tsx` | Route-aware navigation component |
| Role navigation | `src/config/role-navigation.ts` | Module → route mappings per role |
| Drawer config | `src/config/drawer-nav.config.ts` | All navigable destinations |
| Follow system | `src/hooks/useFollow.ts` | Followers/following counts, follow/unfollow actions |
| Community logger | `src/hooks/useCommunityLogger.ts` | 30+ community activity types tracked |
| Profile stats | `src/components/profile/shared/ProfileStats.tsx` | Posts, followers, following, media, groups display |
| Community context | `supabase/functions/fetch-user-context/index.ts` | Full community data (events, groups, matches, follows) |
| Follow counts view | `user_follow_counts` materialized view | Pre-computed follower/following counts |
| Profile posts | `profile_posts` table | User post content and engagement metrics |
| Media uploads | `media_uploads` table | Media content with views, likes, plays tracking |
| Community groups | `global_community_groups` table | Groups with member counts, categories, settings |
| Event participants | `global_event_participants` table | Event attendance tracking |
| User matches | `user_matches` table | Compatibility scores and shared interests |
| User interests | `global_community_profiles.interests` | User's declared interest topics |
| Engagement score | `user_journey.engagement_score` | Existing engagement metric |

---

*This document serves as the baseline for the next phase of orb development. Phase 1 (Screen Awareness) and Phase 3-4 (Community Engagement Coaching) are the immediate priorities.*
