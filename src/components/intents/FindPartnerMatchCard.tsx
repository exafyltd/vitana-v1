/**
 * E6 — premium, image-led match preview card for the
 * Find a Match → My Matches list.
 *
 * News-style layout:
 *
 *   [ 16:10 cover banner ]
 *     - floating vertical badge top-left
 *     - floating "XX% match" badge top-right
 *     - display name + @handle overlay bottom-left (no other text)
 *
 *   [ My-Posts-style body — same kind pill / title / description as IntentCard ]
 *     - kind pill: counterparty's intent_kind (KIND_LABEL + KIND_COLOR)
 *     - title: counterparty intent title (fallback: deriveFallbackTitle)
 *     - description: counterparty intent scope (fallback: deriveIntentLine)
 *
 *   [ Express interest / Pass row, mutual-interest banner, or
 *     declined/closed copy — match-state aware ]
 *
 * The card whole sits ≈ 360 px tall on a 360 px viewport so the
 * primary CTA stays above the fixed bottom nav + Orb FAB.
 *
 * Per the user spec, the image is treated as a *cover photo* and
 * never as a stretched portrait. When `partner_match_cover_url` is
 * present we use it object-cover; otherwise a themed gradient is
 * shown with the small avatar tucked into the bottom-left identity
 * strip.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Flag, Lock, Heart } from 'lucide-react';
// (Heart powers the compact "♡ Interest" pill in the action row.)
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  declineMatch,
  transitionMatch,
  type IntentMatch,
} from '@/lib/intentApi';
import {
  activeStatusLabel,
  coverTagsForMatch,
  deriveIntentLine,
  deriveFallbackTitle,
  humanizeMatchReasons,
  type MatchVertical,
} from '@/lib/matchReasons';
import {
  KIND_COLOR,
  KIND_LABEL,
  counterpartyKindFromPairing,
  kindColorClass,
  kindLabel,
} from '@/lib/intentKind';
import { pickThemedCover, coverFallbackForTheme, type CoverTheme } from '@/lib/intentCovers';
import { DisputeModal } from './DisputeModal';
import { notify, notifyError, t } from '@/lib/i18n-toast';

interface FindPartnerMatchCardProps {
  match: IntentMatch;
  /** Vertical derived from the source intent — drives theming + intent line. */
  vertical: MatchVertical;
  /** Source intent's category, e.g. "dance.salsa". Used for fallback copy. */
  sourceCategory: string | null;
  perspective: 'outgoing' | 'incoming';
  onAction?: () => void;
}

const VERTICAL_THEME: Record<
  Exclude<MatchVertical, null> | 'default',
  { icon: string; label: string; gradient: string; deco: string; pillClass: string }
> = {
  dance: {
    icon: '💃',
    label: 'Dance',
    gradient: 'from-rose-300 via-pink-300 to-fuchsia-400',
    deco: '🎶',
    // Solid pink pill on the cover (matches the reference design's
    // vertical-tinted top-left badge).
    pillClass: 'bg-pink-100 text-pink-900 ring-1 ring-pink-200/60',
  },
  fitness: {
    icon: '🏋️',
    label: 'Fitness',
    gradient: 'from-emerald-300 via-teal-300 to-cyan-400',
    deco: '💪',
    pillClass: 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/60',
  },
  default: {
    icon: '✨',
    label: 'Match',
    gradient: 'from-indigo-200 via-purple-200 to-pink-200',
    deco: '✨',
    pillClass: 'bg-white/90 text-foreground ring-1 ring-black/5',
  },
};

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

  // Cover banner is always a real photo: either the partner's
  // uploaded cover, or a deterministic themed pick from the brand
  // library (community-dance-group, wellness-yoga-nature, …) keyed
  // on match_id so the same card keeps the same cover across renders.
  const coverTheme: CoverTheme =
    vertical === 'dance' ? 'dance' : vertical === 'fitness' ? 'fitness' : 'generic';
  const coverUrl = !isRedacted
    ? match.partner_match_cover_url ?? pickThemedCover(coverTheme, match.match_id)
    : null;

  const displayName = match.partner_display_name ?? null;
  const handle = counterpartyVid;

  // Body fields (My-Posts-style): kind pill, title, description.
  // Prefer the counterparty's real intent (`partner_intent_*`) once
  // the gateway emits it; otherwise fall back to humanised copy
  // derived from kind_pairing + the user's source_category.
  const counterpartyKind =
    (match.partner_intent_kind as string | null | undefined) ??
    counterpartyKindFromPairing(match.kind_pairing);
  const bodyTitle =
    match.partner_intent_title ?? deriveFallbackTitle(match.kind_pairing, sourceCategory);
  const bodyDescription =
    match.partner_intent_scope ??
    deriveIntentLine(match.kind_pairing, sourceCategory);

  // Top match reason (rendered as a single subtle chip in the meta
  // row above the CTAs). The card body has no chip strip per the
  // user's earlier ask; the meta row carries one strongest signal
  // alongside the active-status pill.
  const topReason = humanizeMatchReasons(
    match.match_reasons as Record<string, unknown>,
    vertical,
    1,
  )[0];

  const coverTags = coverTagsForMatch({
    kindPairing: match.kind_pairing,
    partnerIntentKind: match.partner_intent_kind ?? null,
    category: sourceCategory,
    max: 3,
  });

  const activeLabel = activeStatusLabel(match.partner_last_active_at ?? null);

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
      {/* COVER BANNER — image-only top region */}
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
            // CDN fall-back: if the themed photo fails to load,
            // swap in the local brand asset for the same theme so
            // the card never shows a broken image.
            onError={(e) => {
              const img = e.currentTarget;
              const fallback = coverFallbackForTheme(coverTheme);
              if (img.src !== fallback) img.src = fallback;
            }}
          />
        ) : (
          // Themed gradient backdrop — never an inflated portrait.
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
                  <span className="text-[11px] uppercase tracking-wider">{t('screens.intents.mutualReveal')}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Bottom gradient for legibility on real photos */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        />

        {/* Top-left vertical badge — tinted by theme to match the
            reference design's pink-Dance / emerald-Fitness pills. */}
        <span
          className={`absolute top-3 left-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full backdrop-blur shadow-sm ${theme.pillClass}`}
        >
          <span aria-hidden>{theme.icon}</span>
          <span>{theme.label}</span>
        </span>

        {/* Top-right card — single dark rounded panel with score on top
            and (optional) active-status pill underneath. Compass-aligned
            ribbon stays separate just below. */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <div
            className={`flex flex-col items-end gap-0.5 rounded-2xl bg-black/65 text-white backdrop-blur px-3 py-1.5 shadow-sm ${
              activeLabel ? '' : 'py-1'
            }`}
          >
            <span className="text-xs font-semibold leading-tight">{scorePct}% match</span>
            {activeLabel && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium leading-tight">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {activeLabel}
              </span>
            )}
          </div>
          {match.compass_aligned && (
            <span className="px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-amber-300/95 text-amber-950 shadow-sm">
              ⭐ Compass-aligned
            </span>
          )}
        </div>

        {/* Bottom identity strip — name, handle, plus 2-3 cover tags. */}
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-left text-white">
          {isRedacted ? (
            <h3 className="text-lg font-semibold leading-tight">Anonymous match</h3>
          ) : (
            <div className="min-w-0 space-y-1.5">
              <div>
                <h3 className="text-lg font-semibold leading-tight truncate">
                  {displayName ?? (handle ? `@${handle}` : 'Member')}
                </h3>
                {displayName && handle && (
                  <p className="text-xs opacity-90 truncate">@{handle}</p>
                )}
              </div>
              {coverTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {coverTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium rounded-full bg-black/65 text-white backdrop-blur"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </button>

      {/* BODY — My-Posts shape: kind pill, title, description; then CTAs. */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
              KIND_COLOR[counterpartyKind ?? ''] ?? kindColorClass(counterpartyKind)
            }`}
          >
            {KIND_LABEL[counterpartyKind ?? ''] ?? kindLabel(counterpartyKind)}
          </span>
        </div>
        <h3 className="font-semibold text-base leading-snug mb-1 line-clamp-2">{bodyTitle}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{bodyDescription}</p>

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
          <>
            {/* Meta row: strongest match reason · active status. Subtle,
                inline, sized to feel like context rather than chips. */}
            {(topReason || activeLabel) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                {topReason && (
                  <span className="inline-flex items-center gap-1.5">
                    {/* Lead reason gets a small purple star — matches the
                        reference's accent on "Similar activity goal". */}
                    <span aria-hidden className="text-violet-500">★</span>
                    <span>{topReason.label}</span>
                  </span>
                )}
                {topReason && activeLabel && <span aria-hidden>·</span>}
                {activeLabel && (
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{activeLabel}</span>
                  </span>
                )}
              </div>
            )}
            {/* Compact "♡ Interest" filled pill + outlined "Pass" pill —
                matches the reference design. Interest is content-sized;
                Pass mirrors its width so the right-side actions feel
                paired. */}
            <div className="flex items-center justify-end gap-2">
              <Button
                onClick={expressInterest}
                disabled={busy !== null}
                className="h-10 px-5 rounded-full bg-foreground text-background hover:bg-foreground/90 font-medium gap-1.5"
              >
                {busy === 'interest' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Heart className="h-4 w-4" />
                    Interest
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={decline}
                disabled={busy !== null}
                className="h-10 px-5 rounded-full border-border text-foreground/80 hover:bg-muted font-medium"
              >
                {busy === 'decline' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pass'}
              </Button>
            </div>
          </>
        )}

        {canDispute && !isMutual && !isClosed && (
          <button
            type="button"
            onClick={() => setDisputeOpen(true)}
            className="mt-2 text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1"
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
