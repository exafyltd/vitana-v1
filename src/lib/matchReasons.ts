/**
 * E6 — Translate raw match-engine signals into friendly,
 * user-facing reason chips for the Find a Match preview cards.
 *
 * The matchmaker emits opaque keys (geo, cosine, recency,
 * category_prefix_bonus, activity_seek, kind_overlap, …) which are
 * useful internally but read like debug output to a community user.
 * This util maps them to short, warm, human phrases — and skips any
 * key we don't have a friendly translation for, so internal labels
 * never leak into the UI.
 */

export type MatchVertical = 'dance' | 'fitness' | null;

export interface HumanReason {
  /** Stable key (the original signal) — handy for React keys. */
  key: string;
  /** A small visual cue — emoji or symbol. */
  icon: string;
  /** Short, friendly phrase shown on the chip. */
  label: string;
}

type Make = (vertical: MatchVertical) => HumanReason | null;

const REASON_DICT: Record<string, Make> = {
  geo: () => ({ key: 'geo', icon: '📍', label: 'Near you' }),
  cosine: () => ({ key: 'cosine', icon: '✨', label: 'Similar activity goal' }),
  recency: () => ({ key: 'recency', icon: '🟢', label: 'Recently active' }),
  category_prefix_bonus: (v) => ({
    key: 'category_prefix_bonus',
    icon: v === 'dance' ? '💃' : v === 'fitness' ? '💪' : '🎯',
    label:
      v === 'dance'
        ? 'Dance preference match'
        : v === 'fitness'
          ? 'Fitness preference match'
          : 'Great activity fit',
  }),
  activity_seek: () => ({
    key: 'activity_seek',
    icon: '🤝',
    label: 'Looking for a partner too',
  }),
  kind_overlap: () => ({ key: 'kind_overlap', icon: '🔁', label: 'Similar wish type' }),
  compass_alignment_bonus: () => ({ key: 'compass_alignment_bonus', icon: '🧭', label: 'Values aligned' }),
  level_match: () => ({ key: 'level_match', icon: '🎚️', label: 'Same level' }),
  schedule_overlap: () => ({ key: 'schedule_overlap', icon: '🗓️', label: 'Consistent schedule' }),
  energy_match: () => ({ key: 'energy_match', icon: '⚡', label: 'Great energy' }),
};

// Internal-only keys we explicitly never surface to the user.
const HIDDEN_KEYS = new Set(['pool_size', 'debug', 'reason']);

/**
 * Convert a raw `match_reasons` map into up to `max` friendly chips.
 * Sorts by signal strength (numeric value) so the strongest reasons win.
 * Keys that don't have a human translation, or that live in the
 * HIDDEN_KEYS deny-list, are silently dropped — so the UI never
 * exposes internal terminology.
 */
export function humanizeMatchReasons(
  reasons: Record<string, unknown> | null | undefined,
  vertical: MatchVertical,
  max = 3,
): HumanReason[] {
  if (!reasons) return [];

  const ranked = Object.entries(reasons)
    .filter(([k, v]) => typeof v === 'number' && (v as number) > 0 && !HIDDEN_KEYS.has(k))
    .sort((a, b) => (b[1] as number) - (a[1] as number));

  const out: HumanReason[] = [];
  const seenLabels = new Set<string>();
  for (const [k] of ranked) {
    const make = REASON_DICT[k];
    if (!make) continue;
    const r = make(vertical);
    if (!r || seenLabels.has(r.label)) continue;
    seenLabels.add(r.label);
    out.push(r);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Derive a short, human-readable intent line for the card overlay,
 * e.g. "Looking for a salsa practice partner".
 *
 * `kindPairing` looks like "activity_seek::activity_seek" or
 * "partner_seek::partner_seek"; `category` looks like "dance.salsa",
 * "fitness.gym", etc.
 */
export function deriveIntentLine(
  kindPairing: string | null | undefined,
  category: string | null | undefined,
): string {
  const v: MatchVertical = category?.startsWith('dance.')
    ? 'dance'
    : category?.startsWith('fitness.')
      ? 'fitness'
      : null;

  // dance.salsa -> "salsa", fitness.gym -> "gym",
  // dance.social_partner -> "social partner" (underscores cleaned).
  const subRaw = category?.includes('.') ? category.split('.').slice(1).join(' ') : null;
  const sub = subRaw ? subRaw.replace(/_/g, ' ').trim().toLowerCase() : null;
  const subHasPartnerWord = !!sub && /\b(partner|buddy|mate)\b/.test(sub);
  const kindA = (kindPairing ?? '').split('::')[0];

  if (kindA === 'partner_seek') {
    return v === 'dance'
      ? 'Looking for a dance partner'
      : v === 'fitness'
        ? 'Looking for a training partner'
        : 'Looking for a partner';
  }

  if (kindA === 'social_seek') {
    if (v === 'dance') return sub && !subHasPartnerWord ? `Open to ${sub} hangouts` : 'Open to dance hangouts';
    if (v === 'fitness') return 'Open to fitness buddy sessions';
    return 'Open to meet-ups';
  }

  // activity_seek (default) and friends.
  if (v === 'dance') {
    if (!sub) return 'Looking for a dance partner';
    if (subHasPartnerWord) return `Looking for a ${sub}`;
    return `Looking for a ${sub} practice partner`;
  }
  if (v === 'fitness') {
    if (!sub) return 'Looking for a fitness buddy';
    if (subHasPartnerWord) return `Looking for a ${sub}`;
    return `Wants a ${sub} buddy`;
  }
  return 'Open to new connections';
}

/**
 * Short headline for the match card body — used when the
 * counterparty's intent title isn't surfaced by the gateway yet.
 * Mirrors the casing/feel of a real My Posts title without
 * pretending to know specifics.
 *
 * Examples:
 *   ('activity_seek::activity_seek', 'dance.salsa')   → 'Salsa partner'
 *   ('activity_seek::activity_seek', 'fitness.gym')   → 'Gym buddy'
 *   ('partner_seek::partner_seek',   'dance.salsa')   → 'Dance life partner'
 *   (null, 'dance.bachata')                            → 'Bachata partner'
 */
export function deriveFallbackTitle(
  kindPairing: string | null | undefined,
  category: string | null | undefined,
): string {
  const v: MatchVertical = category?.startsWith('dance.')
    ? 'dance'
    : category?.startsWith('fitness.')
      ? 'fitness'
      : null;

  const subRaw = category?.includes('.') ? category.split('.').slice(1).join(' ') : null;
  const sub = subRaw ? subRaw.replace(/_/g, ' ').trim().toLowerCase() : null;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const subHasPartnerWord = !!sub && /\b(partner|buddy|mate)\b/.test(sub);
  const kindA = (kindPairing ?? '').split('::')[0];

  if (kindA === 'partner_seek') {
    if (v === 'dance') return 'Dance life partner';
    if (v === 'fitness') return 'Training life partner';
    return 'Life partner';
  }

  if (v === 'dance') {
    if (!sub) return 'Dance partner';
    if (subHasPartnerWord) return cap(sub);
    return `${cap(sub)} partner`;
  }

  if (v === 'fitness') {
    if (!sub) return 'Fitness buddy';
    if (subHasPartnerWord) return cap(sub);
    return `${cap(sub)} buddy`;
  }

  return 'Match';
}
