/**
 * E6 — premium, image-led match preview card for the
 * Find a Match → My Matches list.
 *
 * News-style horizontal layout: a 16:10 cover banner across the top
 * with floating vertical/score badges and an identity overlay at the
 * bottom of the cover; a compact info/action area below with reason
 * chips and the Express interest / Pass CTAs. The whole card is
 * sized so the primary CTA is reachable in the first viewport,
 * above the fixed bottom nav and Orb FAB.
 *
 * The image is treated as a *cover photo*, not a portrait: avatars
 * are never stretched into the full banner. When a real cover photo
 * exists (`partner_match_cover_url` — populated by the user's
 * uploaded match cover, or by a backend AI-generated themed
 * dance/fitness image), it fills the banner with object-cover.
 * Otherwise we render a vertical-themed gradient with a small avatar
 * pill at the bottom-left so the partner's identity is still
 * present, just at a sensible size.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Flag, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  declineMatch,
  transitionMatch,
  type IntentMatch,
} from '@/lib/intentApi';
import {
  deriveIntentLine,
  humanizeMatchReasons,
  type MatchVertical,
} from '@/lib/matchReasons';
import { DisputeModal } from './DisputeModal';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface FindPartnerMatchCardProps {
  match: IntentMatch;
  /** Vertical derived from the source intent — drives theming + intent line. */
  vertical: MatchVertical;
  /** Source intent's category, e.g. "dance.salsa". Used for the intent line. */
  sourceCategory: string | null;
  perspective: 'outgoing' | 'incoming';
  onAction?: () => void;
}

const VERTICAL_THEME: Record<
  Exclude<MatchVertical, null> | 'default',
  { icon: string; label: string; gradient: string; accent: string; deco: string }
> = {
  dance: {
    icon: '💃',
    label: 'Dance',
    gradient: 'from-rose-300 via-pink-300 to-fuchsia-400',
    accent: 'bg-rose-50 text-rose-700 border-rose-100',
    deco: '🎶',
  },
  fitness: {
    icon: '🏋️',
    label: 'Fitness',
    gradient: 'from-emerald-300 via-teal-300 to-cyan-400',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    deco: '💪',
  },
  default: {
    icon: '✨',
    label: 'Match',
    gradient: 'from-indigo-200 via-purple-200 to-pink-200',
    accent: 'bg-muted text-muted-foreground border-border',
    deco: '✨',
  },
};

function initialsFor(name: string | null | undefined): string {
  if (!name) return '?';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0]?.toUpperCase())
      .join('')
      .slice(0, 2) || '?'
  );
}

// Gender-aware DiceBear seed — same logic as IntentMatchCard so a user
// keeps a consistent avatar across the app.
function buildAvatarFallbackUrl(seed: string, gender: 'male' | 'female' | null): string {
  const params = new URLSearchParams({ seed });
  if (gender === 'male') {
    params.set('topType', 'ShortHairShortFlat,ShortHairTheCaesar,ShortHairFrizzle,ShortHairShortCurly');
    params.set('facialHairType', 'Default,BeardLight,BeardMedium');
    params.set('clotheType', 'ShirtCrewNeck,Hoodie,GraphicShirt');
  } else if (gender === 'female') {
    params.set('topType', 'LongHairStraight,LongHairCurly,LongHairBob,LongHairCurvy,LongHairStraight2');
    params.set('accessoriesType', 'Round,Sunglasses,Blank');
    params.set('clotheType', 'BlazerShirt,Hoodie,ShirtVNeck');
  }
  return `https://api.dicebear.com/9.x/avataaars/svg?${params.toString()}`;
}

export function FindPartnerMatchCard({
  match,
  vertical,
  sourceCategory,
  perspective,
  onAction,
}: FindPartnerMatchCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<'interest' | 'decline' | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const counterpartyVid =
    perspective === 'outgoing' ? match.vitana_id_b : match.vitana_id_a;
  const isPartnerSeek = match.kind_pairing.startsWith('partner_seek');
  const isRedacted = !counterpartyVid && (match.redacted || isPartnerSeek);

  // Cover photo — landscape, used as the banner. Distinct from the
  // avatar; only set when the user has uploaded a match cover or a
  // themed AI image has been generated server-side.
  const coverUrl = !isRedacted ? match.partner_match_cover_url ?? null : null;
  const avatarUrl =
    !isRedacted && counterpartyVid
      ? match.partner_avatar_url ??
        buildAvatarFallbackUrl(counterpartyVid, match.partner_gender ?? null)
      : null;

  const displayName = match.partner_display_name ?? null;
  const handle = counterpartyVid;
  const intentLine = deriveIntentLine(match.kind_pairing, sourceCategory);
  const reasons = humanizeMatchReasons(
    match.match_reasons as Record<string, unknown>,
    vertical,
    3,
  );
  const scorePct = Math.round((match.score ?? 0) * 100);

  const theme = VERTICAL_THEME[vertical ?? 'default'] ?? VERTICAL_THEME.default;

  const isMutual =
    match.state === 'mutual_interest' ||
    match.state === 'engaged' ||
    match.state === 'fulfilled';
  const isClosed = match.state === 'declined' || match.state === 'closed';
  const canDispute =
    isMutual ||
    match.state === 'responded_by_a' ||
    match.state === 'responded_by_b';
  const canOpenProfile = !isRedacted && !!counterpartyVid;

  const openProfile = () => {
    if (canOpenProfile) navigate(`/u/${counterpartyVid}`);
  };

  const expressInterest = async () => {
    setBusy('interest');
    try {
      const newState = perspective === 'outgoing' ? 'responded_by_a' : 'responded_by_b';
      await transitionMatch(match.match_id, newState);
      notify('toasts.intents.interestRecorded', 'toasts.intents.ifTheyReInterestedTooWe');
      onAction?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      notifyError('toasts.intents.couldNotRecordInterest');
    } finally {
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy('decline');
    try {
      await declineMatch(match.match_id);
      notify('toasts.intents.passedForNow');
      onAction?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '';
      notifyError('toasts.intents.couldNotPass');
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="rounded-3xl bg-card overflow-hidden border border-black/5 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)]">
      {/* COVER BANNER — 16:10 horizontal, news-style */}
      <button
        type="button"
        onClick={openProfile}
        disabled={!canOpenProfile}
        aria-label={
          canOpenProfile
            ? `Open ${displayName ?? counterpartyVid}'s profile`
            : 'Anonymous match'
        }
        className={`relative block w-full aspect-[16/10] overflow-hidden bg-gradient-to-br ${theme.gradient} ${
          canOpenProfile ? 'cursor-pointer' : 'cursor-default'
        } focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={displayName ?? handle ?? 'Match cover'}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          // Themed gradient backdrop with subtle radial highlights and a
          // discreet decorative emoji — never an inflated avatar/portrait.
          <>
            <div
              aria-hidden
              className="absolute inset-0 opacity-70 mix-blend-soft-light"
              style={{
                background:
                  'radial-gradient(120% 80% at 20% 10%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%), radial-gradient(80% 60% at 80% 90%, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 60%)',
              }}
            />
            {!isRedacted && (
              <span
                aria-hidden
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[88px] leading-none opacity-25 select-none"
              >
                {theme.deco}
              </span>
            )}
            {isRedacted && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-white/90">
                  <div className="h-14 w-14 rounded-full bg-white/25 backdrop-blur flex items-center justify-center">
                    <Lock className="h-6 w-6" />
                  </div>
                  <span className="text-[11px] uppercase tracking-wider">{t('screens.intents.mutualReveal')}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom gradient for text readability on real photos */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        />

        {/* Top-left vertical badge */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-white/85 text-foreground backdrop-blur shadow-sm">
          <span aria-hidden>{theme.icon}</span>
          <span>{theme.label}</span>
        </span>

        {/* Top-right match score */}
        <span className="absolute top-3 right-3 px-3 py-1 text-xs font-semibold rounded-full bg-black/55 text-white backdrop-blur shadow-sm">{t('screens.intents.scorepctMatch', { scorePct })}
        </span>

        {match.compass_aligned && (
          <span className="absolute top-12 right-3 px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-amber-300/95 text-amber-950 shadow-sm">{t('screens.intents.compassaligned')}
          </span>
        )}

        {/* Bottom identity strip — small avatar + name + intent line */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-white">
          {isRedacted ? (
            <>
              <h3 className="text-lg font-semibold leading-tight">{t('screens.intents.anonymousMatch')}</h3>
              <p className="text-xs opacity-90 mt-0.5">{t('screens.intents.identityRevealedMutualInterest')}</p>
            </>
          ) : (
            <div className="flex items-end gap-3">
              {avatarUrl && !coverUrl && (
                <div className="h-11 w-11 shrink-0 rounded-full bg-white/90 ring-2 ring-white/60 overflow-hidden flex items-center justify-center">
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              {!avatarUrl && !coverUrl && (
                <div className="h-11 w-11 shrink-0 rounded-full bg-white/30 ring-2 ring-white/40 flex items-center justify-center text-sm font-semibold">
                  {initialsFor(displayName ?? handle)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold leading-tight truncate">
                  {displayName ?? (handle ? `@${handle}` : 'Member')}
                </h3>
                {displayName && handle && (
                  <p className="text-xs opacity-90 truncate">@{handle}</p>
                )}
                <p className="text-xs opacity-95 mt-0.5 line-clamp-1">{intentLine}</p>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* INFO + ACTION AREA */}
      <div className="px-4 pt-3 pb-4 space-y-3">
        {reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <span
                key={r.key}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border ${theme.accent}`}
              >
                <span aria-hidden>{r.icon}</span>
                <span>{r.label}</span>
              </span>
            ))}
          </div>
        )}

        {isMutual ? (
          <div className="space-y-2">
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">{t('screens.intents.mutualInterestOpenMessageThreadStart')}
            </div>
            <button
              type="button"
              onClick={() => setDisputeOpen(true)}
              className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
            >
              <Flag className="h-3 w-3" />{t('screens.intents.reportIssue')}
            </button>
          </div>
        ) : isClosed ? (
          <p className="text-sm text-muted-foreground italic">{match.state}</p>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              onClick={expressInterest}
              disabled={busy !== null}
              className="flex-1 h-10 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium"
            >
              {busy === 'interest' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Express interest'}
            </Button>
            <Button
              variant="outline"
              onClick={decline}
              disabled={busy !== null}
              className="flex-1 h-10 rounded-full border-border bg-background text-foreground/80 hover:bg-muted"
            >
              {busy === 'decline' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pass'}
            </Button>
          </div>
        )}

        {canDispute && !isMutual && !isClosed && (
          <button
            type="button"
            onClick={() => setDisputeOpen(true)}
            className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
          >
            <Flag className="h-3 w-3" />{t('screens.intents.report')}
          </button>
        )}
      </div>

      <DisputeModal
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
        matchId={match.match_id}
        onRaised={() => onAction?.()}
      />
    </article>
  );
}
