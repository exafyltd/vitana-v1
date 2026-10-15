/**
 * VTID-05085 / VTID-05143 — Unified Card System catalog (frontend half).
 *
 * One place that names every Vitana card the app can render, how it looks
 * (accent colour + action-button shape) and which screens show which cards.
 * The server owns the enrichment/boost state (`GET /api/v1/enrichment-cards`);
 * this file owns presentation and the static feature-card lists.
 *
 * Cards are told apart ONLY by accent colour and button shape — every card
 * renders through the unchanged VitanaRecommendationCard shell (owner rule).
 * Colours are design tokens (SPOTLIGHT_RULES SR-17), mapped from the plan's
 * hues: amber 42° → category-5, teal 173° → category-1, blue 217° →
 * category-3, rose 330° → category-4, sky 199° → category-7, violet 262° →
 * sys-feature-new, indigo 250° → sys-feature-tip, red-orange 8° →
 * sys-autopilot, purple 280° → calendar-primary, discover 265° →
 * domain-discover, orb steel-blue 199° → sys-vitana-accent (the Vitana
 * system accent; `primary` is near-black/near-white, not a hue).
 *
 * The accent shows twice on every card, identically: the action button's
 * fill and a 4 px start-edge bar at 70 % (VTID-05143 design review).
 */

export const ENRICHMENT_CARD_TYPES = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11'] as const;
export const FEATURE_CARD_TYPES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11'] as const;
/** Phase 3 (VTID-05087 plan, built under VTID-05143). G4 "Earn VTNA" is out of scope (owner 2026-10-13). */
export const BOOST_CARD_TYPES = ['G1', 'G2', 'G3'] as const;

export type EnrichmentCardType = (typeof ENRICHMENT_CARD_TYPES)[number];
export type FeatureCardType = (typeof FEATURE_CARD_TYPES)[number];
export type BoostCardType = (typeof BOOST_CARD_TYPES)[number];
export type VitanaCardType = EnrichmentCardType | FeatureCardType | BoostCardType;
export type CardCategory = 'enrichment' | 'feature' | 'boost';

const ALL_CARD_TYPES: readonly string[] = [...ENRICHMENT_CARD_TYPES, ...FEATURE_CARD_TYPES, ...BOOST_CARD_TYPES];

export function isVitanaCardType(value: unknown): value is VitanaCardType {
  return typeof value === 'string' && ALL_CARD_TYPES.includes(value);
}

export function cardCategory(type: VitanaCardType): CardCategory {
  if (type.startsWith('E')) return 'enrichment';
  if (type.startsWith('G')) return 'boost';
  return 'feature';
}

/** Server-dismissed (7-day cooldown in `user_enrichment_cards`) vs local (localStorage TTL). */
export function isServerDismissedCard(type: VitanaCardType): boolean {
  return cardCategory(type) !== 'feature';
}

export type CardAccent =
  | 'amber'
  | 'orb'
  | 'rose'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'sky'
  | 'red'
  | 'violet'
  | 'indigo'
  | 'discover';

export type CardButtonShape = 'round' | 'pill' | 'rounded-square';

/** Token classes per accent: the action button fill and the card's 4 px start-edge accent bar. */
export const ACCENT_CLASSES: Record<CardAccent, { button: string; border: string }> = {
  amber: { button: 'bg-category-5 hover:bg-category-5/90', border: 'border-s-4 border-s-category-5/70' },
  orb: { button: 'bg-sys-vitana-accent hover:bg-sys-vitana-accent/90', border: 'border-s-4 border-s-sys-vitana-accent/70' },
  rose: { button: 'bg-category-4 hover:bg-category-4/90', border: 'border-s-4 border-s-category-4/70' },
  teal: { button: 'bg-category-1 hover:bg-category-1/90', border: 'border-s-4 border-s-category-1/70' },
  blue: { button: 'bg-category-3 hover:bg-category-3/90', border: 'border-s-4 border-s-category-3/70' },
  purple: { button: 'bg-calendar-primary hover:bg-calendar-primary/90', border: 'border-s-4 border-s-calendar-primary/70' },
  sky: { button: 'bg-category-7 hover:bg-category-7/90', border: 'border-s-4 border-s-category-7/70' },
  red: { button: 'bg-sys-autopilot-accent hover:bg-sys-autopilot-accent/90', border: 'border-s-4 border-s-sys-autopilot-accent/70' },
  violet: {
    button: 'bg-sys-feature-new-accent hover:bg-sys-feature-new-accent/90',
    border: 'border-s-4 border-s-sys-feature-new-accent/70',
  },
  indigo: {
    button: 'bg-sys-feature-tip-accent hover:bg-sys-feature-tip-accent/90',
    border: 'border-s-4 border-s-sys-feature-tip-accent/70',
  },
  discover: {
    button: 'bg-domain-discover-accent hover:bg-domain-discover-accent/90',
    border: 'border-s-4 border-s-domain-discover-accent/70',
  },
};

/** Plan §2 colour + button-shape map, exactly. */
export const CARD_STYLE: Record<VitanaCardType, { accent: CardAccent; shape: CardButtonShape }> = {
  E1: { accent: 'amber', shape: 'round' },
  E2: { accent: 'orb', shape: 'pill' },
  E3: { accent: 'rose', shape: 'pill' },
  E4: { accent: 'teal', shape: 'pill' },
  E5: { accent: 'teal', shape: 'pill' },
  E6: { accent: 'blue', shape: 'rounded-square' },
  E7: { accent: 'blue', shape: 'rounded-square' },
  E8: { accent: 'purple', shape: 'pill' },
  E9: { accent: 'sky', shape: 'pill' },
  E10: { accent: 'red', shape: 'pill' },
  E11: { accent: 'amber', shape: 'round' },
  F1: { accent: 'violet', shape: 'pill' },
  F2: { accent: 'teal', shape: 'pill' },
  F3: { accent: 'amber', shape: 'round' },
  F4: { accent: 'orb', shape: 'round' },
  F5: { accent: 'blue', shape: 'pill' },
  F6: { accent: 'red', shape: 'pill' },
  F7: { accent: 'sky', shape: 'rounded-square' },
  F8: { accent: 'indigo', shape: 'pill' },
  F9: { accent: 'purple', shape: 'pill' },
  F10: { accent: 'rose', shape: 'round' },
  F11: { accent: 'discover', shape: 'pill' },
  G1: { accent: 'orb', shape: 'pill' },
  G2: { accent: 'blue', shape: 'pill' },
  G3: { accent: 'amber', shape: 'round' },
};

/**
 * Route deep links of the cards that navigate (plan §1 corrections). Cards
 * whose action is a sheet, an OAuth start, a share or a permission prompt
 * (E3, E4's picker, E6, E7, E10, F2, F7, F8, F10) have no entry here.
 * `card-deeplinks.test.ts` proves each one is a real, non-redirect route.
 */
export const CARD_DEEP_LINKS: Partial<Record<VitanaCardType, string>> = {
  E1: '/me/profile#avatar',
  E2: '/me/profile#about',
  E4: '/me/profile#interests',
  E5: '/me/profile#location',
  E8: '/connectors',
  E9: '/connectors#contacts',
  E11: '/me/profile#cover',
  F1: '/autopilot',
  F3: '/daily-diary',
  F4: '/assistant',
  F5: '/me/matches',
  F6: '/autopilot',
  F9: '/calendar',
  F11: '/discover',
  G1: '/me/profile',
  G2: '/me/matches',
  G3: '/daily-diary',
};

/**
 * Every screen the strip can sit on. `server` is the `screen` sent to the
 * gateway (null = no server cards); `allow` narrows the server's cards for
 * that mount; `features` is the static feature list in display order.
 *
 * - My Journey (`/autopilot`) IS the Longevity Journey surface, so it mounts
 *   one strip (`autopilot`) — the `longevity-journey` entry stays for the
 *   gateway contract and for a future dedicated page.
 * - `make-a-post` lives inside the create sheet itself and has no gateway
 *   screen of its own, so it asks for `community` and keeps only E3.
 * - Feature lists follow plan §4 (Phase 2, VTID-05086).
 * - `boost` (Phase 3) lists the boost cards plan §4 places on the screen; a
 *   boost card the server sends for any other screen is not shown. G3 "Streak
 *   at Risk" goes on My Journey because `/autopilot` is the Longevity
 *   Journey surface.
 * - Profile (VTID-05210, owner 2026-10-15) shows only cards that enrich the
 *   profile itself: `allow` keeps PROFILE_ENRICHMENT_CARDS + G1 and there are
 *   no feature cards. Connectors (E8, E9), notifications (E10), Vitana Index
 *   (F2, already on the ID card), Talk to Vitana (F4) and Invite (F7) stay on
 *   their other screens. `allow` must list G1 — it is checked before `boost`.
 */
export type CardScreen =
  | 'home'
  | 'profile'
  | 'vitana-index'
  | 'autopilot'
  | 'community'
  | 'talk-to-vitana'
  | 'calendar'
  | 'longevity-journey'
  | 'messenger'
  | 'make-a-post';

export interface CardScreenConfig {
  server: string | null;
  allow?: readonly VitanaCardType[];
  /** Boost cards placed on this screen (plan §4); absent = none. */
  boost?: readonly BoostCardType[];
  features: readonly FeatureCardType[];
}

/** Enrichment cards that enrich the profile itself (VTID-05210, owner 2026-10-15). */
export const PROFILE_ENRICHMENT_CARDS = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E11'] as const satisfies readonly EnrichmentCardType[];

export const CARD_SCREENS: Record<CardScreen, CardScreenConfig> = {
  // Home: no new feature cards (plan §4; owner question open) — its existing
  // Vitana cards stay as they are in Home.tsx.
  home: { server: 'home', boost: ['G1', 'G2', 'G3'], features: [] },
  profile: { server: 'profile', allow: [...PROFILE_ENRICHMENT_CARDS, 'G1'], boost: ['G1'], features: [] },
  'vitana-index': { server: 'vitana-index', boost: ['G3'], features: ['F3', 'F4', 'F6'] },
  autopilot: { server: 'autopilot', boost: ['G3'], features: ['F1', 'F2', 'F3', 'F9'] },
  community: { server: 'community', features: ['F5', 'F7', 'F10'] },
  'talk-to-vitana': { server: 'talk-to-vitana', features: ['F1', 'F2', 'F3'] },
  calendar: { server: 'calendar', features: ['F1', 'F6', 'F8'] },
  'longevity-journey': { server: 'longevity-journey', boost: ['G3'], features: ['F1', 'F2', 'F3', 'F5', 'F8'] },
  messenger: { server: 'messenger', features: [] },
  'make-a-post': { server: 'community', allow: ['E3'], features: ['F5', 'F7', 'F10'] },
};

/** Is this server card shown on the screen? Boost cards only where plan §4 places them. */
export function isServerCardPlaced(config: CardScreenConfig, cardType: VitanaCardType): boolean {
  if (config.allow && !config.allow.includes(cardType)) return false;
  if (cardCategory(cardType) === 'boost') return (config.boost ?? []).includes(cardType as BoostCardType);
  return true;
}

/** Most new cards Home shows in front of its existing Vitana cards (owner decision 2026-10-13). */
export const HOME_SERVER_CARD_LIMIT = 3;
/** Of those, at most this many enrichment cards (plan §4: "top 2 incomplete enrichment cards"). */
export const HOME_ENRICHMENT_CARD_LIMIT = 2;

/**
 * Home's new cards from the server list: up to 2 enrichment cards, then the
 * boost cards Home places (server order = trigger urgency), 3 in total.
 * Home.tsx caps again with withHomeNewCards() right before composeFeed.
 */
export function pickHomeServerCards<C extends { card_type: VitanaCardType }>(cards: readonly C[]): C[] {
  const placed = cards.filter((c) => isVitanaCardType(c.card_type) && isServerCardPlaced(CARD_SCREENS.home, c.card_type));
  const enrichment = placed.filter((c) => cardCategory(c.card_type) === 'enrichment').slice(0, HOME_ENRICHMENT_CARD_LIMIT);
  const boost = placed.filter((c) => cardCategory(c.card_type) === 'boost');
  return [...enrichment, ...boost].slice(0, HOME_SERVER_CARD_LIMIT);
}

/** Feature cards hidden by the X come back after 7 days (plan §3.4). */
export const FEATURE_CARD_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const featureCardDismissKey = (type: VitanaCardType) => `vitana.card.${type}.dismissed_at`;
