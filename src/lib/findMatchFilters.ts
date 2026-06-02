/**
 * E6 — Find a Match filter model + pure apply logic.
 *
 * Drives the filter sheet on the Find a Match → My Matches view. Kept
 * UI-free so the matching rules can be reasoned about (and unit-tested)
 * in isolation from the React layer.
 *
 * Honesty note — what the match payload actually carries:
 *   - interests / goals  → derivable from source_category + the
 *                          counterparty intent kind/title/scope (real).
 *   - online             → partner_last_active_at recency (real, but the
 *                          gateway enrich path doesn't populate it yet, so
 *                          today it filters to the few rows that carry it).
 *   - hide viewed        → match.state + a locally-tracked "opened" set (real).
 *   - age / distance     → NOT present on the match payload. The controls
 *                          exist and apply defensively (only ever narrowing
 *                          rows that genuinely carry `partner_age` /
 *                          `partner_distance_km`), so they're forward-
 *                          compatible the day the backend ships those
 *                          fields — but inert until then.
 */

import type { FindPartnerMatch } from './intentApi';
import { counterpartyKindFromPairing } from './intentKind';

export const AGE_BOUNDS = { min: 18, max: 80 } as const;
/** maxDistanceKm === DISTANCE_ANY means "no distance cap". */
export const DISTANCE_ANY = 100;
export const DISTANCE_BOUNDS = { min: 5, max: DISTANCE_ANY } as const;

export interface FindMatchFilters {
  ageMin: number;
  ageMax: number;
  /** Upper bound in km. DISTANCE_ANY = no cap. */
  maxDistanceKm: number;
  /** Selected interest option ids. */
  interests: string[];
  /** Selected goal option ids. */
  goals: string[];
  onlineOnly: boolean;
  hideViewed: boolean;
}

export const DEFAULT_FILTERS: FindMatchFilters = {
  ageMin: AGE_BOUNDS.min,
  ageMax: AGE_BOUNDS.max,
  maxDistanceKm: DISTANCE_ANY,
  interests: [],
  goals: [],
  onlineOnly: false,
  hideViewed: false,
};

export type ChipVertical = 'dance' | 'fitness';

export interface ChipOption {
  id: string;
  /** i18n key resolved by the sheet at render time. */
  labelKey: string;
  /** Lowercase keywords matched against category + intent title/scope. */
  tokens: string[];
  /** Optional vertical shortcut — matches when the row's vertical equals this. */
  vertical?: ChipVertical;
  /** Counterparty intent kinds this goal maps to. */
  kinds?: string[];
  /** Special predicate hook (compass-aligned, today only). */
  special?: 'compass';
}

/**
 * Interests the user can toggle. The curated set covers the verticals
 * the community ships today (dance + fitness) plus the wellness sub-
 * activities the product brief calls out (Yoga, Running, Meditation).
 * Matching is keyword-based so a fitness.yoga category OR an intent whose
 * title/scope mentions "yoga" both qualify.
 */
export const INTEREST_OPTIONS: ChipOption[] = [
  { id: 'dance', labelKey: 'screens.community.interestDance', tokens: ['dance', 'salsa', 'bachata', 'tango', 'kizomba', 'zouk'], vertical: 'dance' },
  { id: 'yoga', labelKey: 'screens.community.interestYoga', tokens: ['yoga'], vertical: 'fitness' },
  { id: 'running', labelKey: 'screens.community.interestRunning', tokens: ['run', 'running', 'jog', 'jogging', '5k', '10k', 'marathon'], vertical: 'fitness' },
  { id: 'meditation', labelKey: 'screens.community.interestMeditation', tokens: ['meditation', 'meditate', 'mindful', 'mindfulness', 'breathwork'] },
  { id: 'strength', labelKey: 'screens.community.interestStrength', tokens: ['strength', 'gym', 'weights', 'lifting', 'crossfit'], vertical: 'fitness' },
  { id: 'pilates', labelKey: 'screens.community.interestPilates', tokens: ['pilates'], vertical: 'fitness' },
];

/**
 * Goals the user can toggle. The first three map to real counterparty
 * intent kinds (so they always filter). Weight-loss / mental-wellness are
 * keyword-based against the intent title/scope. "Values aligned" reads the
 * compass flag the engine already sets.
 */
export const GOAL_OPTIONS: ChipOption[] = [
  { id: 'partner', labelKey: 'screens.community.goalPartner', tokens: [], kinds: ['partner_seek'] },
  { id: 'social', labelKey: 'screens.community.goalSocial', tokens: [], kinds: ['social_seek', 'mentor_seek'] },
  { id: 'activity', labelKey: 'screens.community.goalActivity', tokens: [], kinds: ['activity_seek', 'learning_seek'] },
  { id: 'weight_loss', labelKey: 'screens.community.goalWeightLoss', tokens: ['weight loss', 'lose weight', 'fat loss', 'slim down', 'shred'] },
  { id: 'mental_wellness', labelKey: 'screens.community.goalMentalWellness', tokens: ['mental', 'wellness', 'stress', 'calm', 'anxiety', 'mindful'] },
  { id: 'values', labelKey: 'screens.community.goalValues', tokens: [], special: 'compass' },
];

/** Lowercased searchable text for a match: category + intent title + scope. */
function haystackFor(m: FindPartnerMatch): string {
  return [m.source_category, m.partner_intent_title, m.partner_intent_scope]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function optionMatches(opt: ChipOption, m: FindPartnerMatch, haystack: string): boolean {
  if (opt.vertical && m.vertical === opt.vertical) return true;
  if (opt.special === 'compass' && m.compass_aligned) return true;
  if (opt.kinds && opt.kinds.length > 0) {
    const kind =
      (m.partner_intent_kind as string | null | undefined) ??
      counterpartyKindFromPairing(m.kind_pairing);
    if (kind && opt.kinds.includes(kind)) return true;
  }
  return opt.tokens.some((tok) => haystack.includes(tok));
}

/** True when partner_last_active_at is within the last 24h. */
function isOnline(m: FindPartnerMatch): boolean {
  const iso = m.partner_last_active_at;
  if (!iso) return false;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < 24 * 60 * 60 * 1000;
}

/** Match states that mean the user has already acted on / seen the card. */
const VIEWED_STATES = new Set([
  'responded_by_a',
  'responded_by_b',
  'mutual_interest',
  'engaged',
  'fulfilled',
  'declined',
  'closed',
]);

function isViewed(m: FindPartnerMatch, viewedIds: Set<string>): boolean {
  if (VIEWED_STATES.has(m.state)) return true;
  if (viewedIds.has(m.match_id)) return true;
  const cp = m.vitana_id_b ?? m.vitana_id_a;
  return cp ? viewedIds.has(cp) : false;
}

/** Defensive numeric read for fields the gateway may add later. */
function numField(m: FindPartnerMatch, key: string): number | null {
  const v = (m as unknown as Record<string, unknown>)[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Apply the active filters to a list of matches. Pure — returns a new
 * array, original order preserved.
 */
export function applyFindMatchFilters(
  matches: FindPartnerMatch[],
  filters: FindMatchFilters,
  viewedIds: Set<string>,
): FindPartnerMatch[] {
  const ageActive = filters.ageMin > AGE_BOUNDS.min || filters.ageMax < AGE_BOUNDS.max;
  const distanceActive = filters.maxDistanceKm < DISTANCE_ANY;

  return matches.filter((m) => {
    const haystack = haystackFor(m);

    // Interests — OR within the group.
    if (filters.interests.length > 0) {
      const opts = INTEREST_OPTIONS.filter((o) => filters.interests.includes(o.id));
      if (!opts.some((o) => optionMatches(o, m, haystack))) return false;
    }

    // Goals — OR within the group.
    if (filters.goals.length > 0) {
      const opts = GOAL_OPTIONS.filter((o) => filters.goals.includes(o.id));
      if (!opts.some((o) => optionMatches(o, m, haystack))) return false;
    }

    if (filters.onlineOnly && !isOnline(m)) return false;
    if (filters.hideViewed && isViewed(m, viewedIds)) return false;

    // Age / distance — only ever narrow rows that actually carry the data.
    if (ageActive) {
      const age = typeof m.partner_age === 'number' ? m.partner_age : null;
      if (age !== null && (age < filters.ageMin || age > filters.ageMax)) return false;
    }
    if (distanceActive) {
      const dist = numField(m, 'partner_distance_km');
      if (dist !== null && dist > filters.maxDistanceKm) return false;
    }

    return true;
  });
}

/** Number of active (non-default) filter dimensions — drives the icon badge. */
export function countActiveFilters(filters: FindMatchFilters): number {
  let n = 0;
  if (filters.ageMin > AGE_BOUNDS.min || filters.ageMax < AGE_BOUNDS.max) n += 1;
  if (filters.maxDistanceKm < DISTANCE_ANY) n += 1;
  n += filters.interests.length;
  n += filters.goals.length;
  if (filters.onlineOnly) n += 1;
  if (filters.hideViewed) n += 1;
  return n;
}

/** Lightweight text search over a match's visible fields. */
export function matchTextHit(m: FindPartnerMatch, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    m.partner_display_name,
    m.vitana_id_b,
    m.vitana_id_a,
    m.partner_intent_title,
    m.partner_intent_scope,
    m.source_category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}
