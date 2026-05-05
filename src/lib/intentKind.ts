/**
 * Shared kind taxonomy for intent surfaces.
 *
 * Originally inlined in IntentCard; lifted here so both IntentCard
 * (My Posts) and FindPartnerMatchCard (My Matches) render the same
 * pill text + colour for a given kind. Single source of truth.
 */

import type { IntentKind } from './intentApi';

export const KIND_LABEL: Record<string, string> = {
  commercial_buy: "I'm buying",
  commercial_sell: "I'm selling",
  activity_seek: 'Activity partner',
  partner_seek: 'Life partner',
  social_seek: 'Social / mentorship',
  mutual_aid: 'Mutual aid',
  // VTID-DANCE-D2 — dance kinds
  learning_seek: 'Looking to learn',
  mentor_seek: 'Offering to teach',
};

export const KIND_COLOR: Record<string, string> = {
  commercial_buy: 'bg-blue-100 text-blue-700 border-blue-200',
  commercial_sell: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  activity_seek: 'bg-orange-100 text-orange-700 border-orange-200',
  partner_seek: 'bg-rose-100 text-rose-700 border-rose-200',
  social_seek: 'bg-violet-100 text-violet-700 border-violet-200',
  mutual_aid: 'bg-amber-100 text-amber-700 border-amber-200',
  learning_seek: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  mentor_seek: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
};

export function kindLabel(kind: string | IntentKind | null | undefined): string {
  if (!kind) return 'Match';
  return KIND_LABEL[kind] ?? kind;
}

export function kindColorClass(kind: string | IntentKind | null | undefined): string {
  if (!kind) return 'bg-muted text-foreground border-border';
  return KIND_COLOR[kind] ?? 'bg-muted text-foreground border-border';
}

/**
 * `kind_pairing` looks like "activity_seek::activity_seek" or
 * "partner_seek::partner_seek". The counterparty's kind is the
 * second half; the user's source kind is the first. For the match
 * card pill we want the counterparty kind so the pill describes
 * what the *other person* is offering/seeking.
 */
export function counterpartyKindFromPairing(pairing: string | null | undefined): string | null {
  if (!pairing) return null;
  const parts = pairing.split('::');
  return parts[1] || parts[0] || null;
}
