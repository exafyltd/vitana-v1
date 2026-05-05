/**
 * VTID-02781-PR3: Shared type for the Screen Manifest.
 *
 * The manifest is the SINGLE SOURCE OF TRUTH for every navigable screen in
 * vitanaland. When a new screen is added to App.tsx, an entry is appended
 * here. A codegen step in vitana-platform reads this file and writes the
 * matching block into the gateway's navigation-catalog.ts so the ORB
 * Navigator can voice-redirect users to it without a manual cross-repo PR.
 *
 * Adding a screen — three steps, no catalog edits:
 *   1. Append a `ScreenManifestEntry` here.
 *   2. Open a PR. The vitana-platform codegen workflow drafts a follow-up
 *      PR on the gateway with the regenerated catalog block.
 *   3. Merge both PRs.
 *
 * For LLM-assisted i18n drafting:
 *   $ npm run nav:draft -- --path /comm/new-screen --component NewScreen
 *
 * THIS FILE'S TYPE IS MIRRORED in services/gateway/src/lib/screen-manifest-types.ts
 * — keep them in sync. CI (in vitana-platform) verifies they're identical.
 */

export type LangCode = 'en' | 'de' | string;

export interface ScreenManifestI18n {
  title: string;
  description: string;
  /** Free-text guidance the Navigator uses to score "when to visit" matches. */
  when_to_visit: string;
}

export type ScreenCategory =
  | 'public'
  | 'auth'
  | 'home'
  | 'community'
  | 'business'
  | 'wallet'
  | 'health'
  | 'discover'
  | 'memory'
  | 'ai'
  | 'autopilot'
  | 'inbox'
  | 'settings'
  | 'sharing';

/** Overlay metadata. Only used when entry_kind='overlay'. */
export interface ScreenOverlayMeta {
  /** CustomEvent dispatched when the overlay should open. */
  event_name: string;
  /** ?open=<marker> URL signal. */
  query_marker: string;
  /** Optional named param the overlay needs (e.g. 'user_id', 'meetup_id'). */
  needs_param?: string;
}

export interface ScreenManifestEntry {
  /** Canonical id, dotted-uppercase (e.g. 'COMM.OPEN_ASKS'). Must be unique. */
  screen_id: string;
  /** React Router path. May contain `:param` placeholders. */
  path: string;
  category: ScreenCategory;
  access: 'public' | 'authenticated';
  /** Whether unauthenticated users can navigate here. */
  anonymous_safe: boolean;
  /**
   * Alternative slug-style identifiers Gemini, LiveKit, or legacy email/
   * marketing links may emit (e.g. 'find-partner', 'community/events').
   */
  aliases?: string[];
  /** Sort priority for the Navigator (higher = preferred when ambiguous). */
  priority?: number;
  /** Roles that can see this entry. Defaults inferred by surface. */
  allowed_roles?: string[];
  /** 'route' (default) navigates; 'overlay' opens a popup via CustomEvent. */
  entry_kind?: 'route' | 'overlay';
  overlay?: ScreenOverlayMeta;
  /** Localized content. EN required; DE strongly recommended. */
  i18n: Record<LangCode, ScreenManifestI18n>;
}
