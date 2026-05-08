/**
 * VTID-01975 + VTID-DANCE-D2/D9/D10: Generic intent card.
 *
 * Renders a UserIntent with kind-aware chip strip + dance facet chips when
 * present. Share button (D10) opens IntentShareSheet for direct-invite to
 * friends, copy-link, or external share.
 */

import { useState, MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import type { UserIntent } from "@/lib/intentApi";
import { KIND_COLOR, KIND_LABEL } from "@/lib/intentKind";
import {
  coverFallbackForTheme,
  getIntentCoverUrl,
  pickThemedCover,
  themeFromCategory,
} from "@/lib/intentCovers";
import { NewsCard } from "@/components/crossover/NewsCard";
import { IntentShareSheet } from "./IntentShareSheet";
import { t } from '@/lib/i18n-toast';

function kindChips(intent: UserIntent): string[] {
  const p = intent.kind_payload as any;
  const chips: string[] = [];
  if (intent.category) chips.push(intent.category.replace(/_/g, " "));

  // VTID-DANCE-D9: dance facet chips work uniformly across kinds.
  if (p?.dance && typeof p.dance === "object") {
    const d = p.dance;
    if (d.variety) chips.push(`💃 ${d.variety}`);
    if (d.level_target) chips.push(d.level_target);
    if (d.role_pref && d.role_pref !== "either") chips.push(d.role_pref);
  }

  switch (intent.intent_kind) {
    case "commercial_buy":
    case "commercial_sell": {
      if (p?.budget_min && p?.budget_max) chips.push(`€${p.budget_min}–${p.budget_max}`);
      else if (p?.price_floor && p?.price_ceiling) chips.push(`€${p.price_floor}–${p.price_ceiling}`);
      if (p?.location_label) chips.push(`📍 ${p.location_label}`);
      if (p?.urgency) chips.push(p.urgency);
      break;
    }
    case "activity_seek": {
      if (p?.activity) chips.push(p.activity);
      if (p?.location_label) chips.push(`📍 ${p.location_label}`);
      if (p?.skill_level) chips.push(p.skill_level);
      break;
    }
    case "partner_seek": {
      if (Array.isArray(p?.age_range)) chips.push(`age ${p.age_range[0]}–${p.age_range[1]}`);
      if (p?.location_radius_km) chips.push(`within ${p.location_radius_km}km`);
      break;
    }
    case "social_seek": {
      if (p?.topic) chips.push(p.topic);
      if (p?.format_pref) chips.push(p.format_pref);
      break;
    }
    case "mutual_aid": {
      if (p?.direction) chips.push(p.direction);
      if (p?.object_or_skill) chips.push(p.object_or_skill);
      break;
    }
    case "learning_seek": {
      if (p?.learning?.topic && (!p?.dance || p.dance.variety !== p.learning.topic)) {
        chips.push(p.learning.topic);
      }
      if (p?.learning?.mode_pref) chips.push(p.learning.mode_pref.replace("_", " "));
      if (p?.counterparty_filter?.location_label) {
        chips.push(`📍 ${p.counterparty_filter.location_label}`);
      }
      if (p?.counterparty_filter?.max_radius_km) {
        chips.push(`within ${p.counterparty_filter.max_radius_km}km`);
      }
      break;
    }
    case "mentor_seek": {
      if (p?.teaching?.topic && (!p?.dance || p.dance.variety !== p.teaching.topic)) {
        chips.push(p.teaching.topic);
      }
      if (Array.isArray(p?.teaching?.modes_offered) && p.teaching.modes_offered.length > 0) {
        chips.push(p.teaching.modes_offered.join("/"));
      }
      if (p?.teaching?.price_cents) {
        const cur = p.teaching.currency || "EUR";
        chips.push(`${cur} ${(p.teaching.price_cents / 100).toFixed(0)}`);
      }
      break;
    }
  }
  return chips;
}

interface IntentCardProps {
  intent: UserIntent;
  showStatus?: boolean;
  showShare?: boolean;
  to?: string;
  onClick?: () => void;
  /**
   * `my-posts`: when the cover photo is present, render the location
   * and match-count chips as a frosted-glass strip in the bottom-left
   * of the photo instead of the chip strip below the body. Used on
   * Find a Match → My Posts and the desktop My Intents list so the
   * user's own card reads at a glance — title + scope + photo, with
   * the meta chips sitting on the photo. Falls back to the default
   * layout when there's no cover photo to overlay on.
   */
  variant?: 'default' | 'my-posts';
  /**
   * When true, render a deterministic themed cover from the brand
   * library if the intent doesn't carry an explicit `cover_url`. Used
   * on the Find a Match → Community Board so every open ask/offer
   * shows an image, matching the visual treatment on the My Matches
   * cards. Off by default so surfaces that intentionally show text-only
   * cards (e.g. plain lists) keep their current behaviour.
   */
  themedFallback?: boolean;
  /**
   * Desktop News-style layout — full-bleed cover photo with the kind
   * pill as the pillar badge, share button at top-right, and a match
   * count badge as the bottom action. Used on Find a Match → My Posts
   * (and Community Board) at >= lg viewports so cards read identically
   * to the News surface.
   */
  desktop?: boolean;
  /** Forwarded to the outer card (desktop only) so the parent grid can size it. */
  className?: string;
}

export function IntentCard({
  intent,
  showStatus = true,
  showShare = true,
  to,
  onClick,
  variant = 'default',
  themedFallback = false,
  desktop = false,
  className,
}: IntentCardProps) {
  const navigate = useNavigate();
  const [shareOpen, setShareOpen] = useState(false);
  const chips = kindChips(intent);

  const handleShareClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShareOpen(true);
  };

  const explicitCoverUrl = getIntentCoverUrl(intent);
  const coverTheme = themeFromCategory(intent.category);
  const coverUrl =
    explicitCoverUrl ??
    (themedFallback ? pickThemedCover(coverTheme, intent.intent_id) : null);

  const showOverlay = variant === 'my-posts' && !!coverUrl;
  const isLocationChip = (c: string) => c.startsWith('📍');
  const overlayLocationChips = showOverlay ? chips.filter(isLocationChip) : [];
  const stripChips = showOverlay ? chips.filter((c) => !isLocationChip(c)) : chips;
  const matchesLabel =
    intent.match_count > 0
      ? t('screens.intents.match_countMatchValue1', {
          match_count: intent.match_count,
          value1: intent.match_count === 1 ? '' : 'es',
        })
      : null;
  const overlayHasContent = overlayLocationChips.length > 0 || (showOverlay && matchesLabel !== null);
  const stripMatchesLabel = !showOverlay && matchesLabel !== null ? matchesLabel : null;

  // Desktop News-style layout: reuse the NewsCard component so the
  // grid reads identically to the News surface — full cover image with
  // the kind pill as the pillar badge, scope as the description, and a
  // share button (or match-count badge) overlaid on top.
  if (desktop) {
    const coverTheme = themeFromCategory(intent.category);
    const desktopImage =
      coverUrl ?? pickThemedCover(coverTheme, intent.intent_id);
    const handleClick = () => {
      if (onClick) {
        onClick();
        return;
      }
      if (to) navigate(to);
    };
    return (
      <>
        <NewsCard
          title={intent.title}
          description={intent.scope}
          imageUrl={desktopImage}
          fallbackImageUrl={coverFallbackForTheme(coverTheme)}
          pillar={KIND_LABEL[intent.intent_kind] ?? intent.intent_kind}
          onClick={handleClick}
          utilityTopRight={
            showShare ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60"
                onClick={handleShareClick}
                aria-label={t('screens.intents.sharePost')}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            ) : undefined
          }
          actionButton={
            intent.match_count > 0 ? (
              <span className="rounded-full bg-emerald-500/90 text-white text-xs font-semibold px-3 py-1.5 shadow-lg backdrop-blur-sm">
                {t('screens.intents.match_countMatchValue1', {
                  match_count: intent.match_count,
                  value1: intent.match_count === 1 ? '' : 'es',
                })}
              </span>
            ) : showStatus ? (
              <span className="rounded-full bg-white/15 text-white text-xs font-medium px-3 py-1.5 shadow-lg backdrop-blur-sm border border-white/20">
                {intent.status}
              </span>
            ) : null
          }
          className={className}
        />
        {showShare && (
          <IntentShareSheet
            open={shareOpen}
            onOpenChange={setShareOpen}
            intentId={intent.intent_id}
            intentTitle={intent.title}
            intentScopeExcerpt={intent.scope?.slice(0, 240) ?? null}
          />
        )}
      </>
    );
  }

  const card = (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors cursor-pointer"
      onClick={onClick}
    >
      {coverUrl && (
        <div className="relative w-full aspect-[16/9] bg-muted">
          <img
            src={coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              const fallback = coverFallbackForTheme(coverTheme);
              if (img.src !== fallback) img.src = fallback;
            }}
          />
          {showOverlay && overlayHasContent && (
            <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1.5">
              {overlayLocationChips.map((c, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-foreground text-xs shadow-sm"
                >
                  {c}
                </span>
              ))}
              {matchesLabel && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-foreground text-xs shadow-sm">
                  {matchesLabel}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <div className="p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${KIND_COLOR[intent.intent_kind] ?? "bg-muted"}`}
        >
          {KIND_LABEL[intent.intent_kind] ?? intent.intent_kind}
        </span>
        <div className="flex items-center gap-2">
          {showStatus && (
            <span className="text-xs text-muted-foreground">{intent.status}</span>
          )}
          {showShare && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleShareClick}
              aria-label={t('screens.intents.sharePost')}
            >
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-base leading-snug mb-1">{intent.title}</h3>
      <p className="text-sm text-muted-foreground line-clamp-1">{intent.scope}</p>
      {(stripChips.length > 0 || stripMatchesLabel !== null) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {stripChips.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs"
            >
              {c}
            </span>
          ))}
          {stripMatchesLabel && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
              {stripMatchesLabel}
            </span>
          )}
        </div>
      )}
      </div>
    </div>
  );

  return (
    <>
      {to ? <Link to={to} className="block">{card}</Link> : card}
      {showShare && (
        <IntentShareSheet
          open={shareOpen}
          onOpenChange={setShareOpen}
          intentId={intent.intent_id}
          intentTitle={intent.title}
          intentScopeExcerpt={intent.scope?.slice(0, 240) ?? null}
        />
      )}
    </>
  );
}
