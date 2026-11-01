/**
 * VTID-05418 — Find a Match: one match → VCard slots. Pure (no hooks, no JSX).
 *
 * Mirrors what `FindPartnerMatchCard` shows on the same record, so a member sees
 * the same person, cover and score in the Spotlight grid as in the list:
 *   - the counterparty is `vitana_id_b` (Find a Match lists outgoing matches);
 *   - a redacted partner-seek match has no name, no cover and no profile link;
 *   - the cover is the partner's own, else the deterministic themed pick.
 * The screen adds its own actions (Say hello / View profile).
 */
import type { IntentMatch } from '@/lib/intentApi';
import { pickThemedCover, type CoverTheme } from '@/lib/intentCovers';
import { humanizeMatchReasons, type MatchVertical } from '@/lib/matchReasons';
import { t } from '@/lib/i18n-toast';
import type { VCardData } from './index';

export type MatchLike = IntentMatch & { vertical?: MatchVertical };

/** The counterparty's handle, or null when the match is anonymous. */
export function matchCounterparty(match: MatchLike): string | null {
  return match.vitana_id_b ?? null;
}

/** True when the counterparty is hidden until mutual interest (partner-seek). */
export function isRedactedMatch(match: MatchLike): boolean {
  const vid = matchCounterparty(match);
  return !vid && (!!match.redacted || match.kind_pairing.startsWith('partner_seek'));
}

/** Closed or already mutual: the card offers no "Say hello". */
export function canGreetMatch(match: MatchLike): boolean {
  return !['mutual_interest', 'engaged', 'fulfilled', 'declined', 'closed'].includes(match.state);
}

export function matchToVCard(match: MatchLike): VCardData {
  const vid = matchCounterparty(match);
  const redacted = isRedactedMatch(match);
  const vertical = match.vertical ?? null;
  const theme: CoverTheme = vertical === 'dance' ? 'dance' : vertical === 'fitness' ? 'fitness' : 'generic';
  const displayName = match.partner_display_name?.trim() || null;
  const name = redacted
    ? t('screens.intents.anonymousMatch')
    : displayName ?? (vid ? `@${vid}` : t('spotlightSocial.common.member'));
  const scorePct = Math.round((match.score ?? 0) * 100);
  const reasons = humanizeMatchReasons(match.match_reasons, vertical, 3).map((r) => r.label);
  return {
    key: match.match_id,
    media: {
      src: redacted ? null : match.partner_match_cover_url ?? pickThemedCover(theme, match.match_id),
      alt: name,
    },
    eyebrow: t('screens.community.scorepctMatch', { scorePct }),
    title: name,
    meta: !redacted && displayName && vid ? `@${vid}` : undefined,
    body: reasons.length > 0 ? reasons.join(' · ') : match.partner_intent_title?.trim() || undefined,
    href: !redacted && vid ? `/u/${vid}` : undefined,
  };
}
