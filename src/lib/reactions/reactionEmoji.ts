/**
 * Supported chat reaction emojis (web + mobile share the same list; the gateway
 * keeps an identical copy). Canonical form is fully-qualified (U+FE0F where it
 * applies). Legacy bare forms, e.g. U+2764 without U+FE0F, normalize to the
 * canonical form, so they count as the same reaction and never double-count.
 */
import list from './reaction-emojis.json';

export const REACTION_EMOJIS: readonly string[] = list.emojis;
export const QUICK_REACTIONS: readonly string[] = list.quick;
export const MAX_DISTINCT_REACTIONS_PER_USER = 6;

const stripVs16 = (s: string) => s.replace(/️/g, '');
const byBare = new Map(REACTION_EMOJIS.map((e) => [stripVs16(e), e] as const));

/** Canonical emoji, or null when the emoji is not in the supported set. */
export function normalizeReactionEmoji(input: string): string | null {
  return byBare.get(stripVs16(input)) ?? null;
}

export function isSupportedReactionEmoji(input: string): boolean {
  return normalizeReactionEmoji(input) !== null;
}

export const REACTION_CAP_ERROR = 'reaction_cap_reached';

/**
 * Enables the "+" full-picker on both clients. Keep false until migration
 * 20261117120000_message_reactions_full_emoji is live in the database; flip it
 * in the same release that follows the migration.
 */
export const REACTION_PICKER_ENABLED = false;

